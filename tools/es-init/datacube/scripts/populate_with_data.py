"""
Dataset ingest pipeline (mirrors dojo + slow-tortoise):
  1. For each CSV in datacube/data/, load its companion JSON config.
  2. Fuzzy-match the geo column against GADM admin2 shapes to resolve
     country / admin1 / admin2 / lat / lon.
  3. Melt feature columns into long format with the canonical schema:
       timestamp, country, admin1, admin2, admin3, lat, lon, feature, value
  4. Write raw parquet and upload to Minio.
  5. Scale features: 0-to-1 normalization and robust normalization, upload normalized parquets.
  6. Run temporal aggregations (monthly + annual): sum, mean per (feature, region, timestamp).
  7. Run spatial aggregations per region level (country, admin1, admin2): sum, mean, count.
  8. Save aggregated CSVs and timeseries to Minio under the standard path structure:
       {dataset_id}/indicator/{time_res}/{feature}/regional/{region_level}/...
  9. Ingest datacube metadata (with qualifier_outputs, normalized paths) into ES `data-datacube`.
"""

import os
import sys
import glob
import json
import math
import uuid
import shutil
import tempfile
from datetime import datetime, timezone
import pandas as pd
import geopandas as gpd
from elasticsearch import helpers
from common import ES_URL, ES_USER, ES_PWD, MINIO_BUCKET, get_es_client, get_s3_client, ensure_bucket, logger

# tiles_pb2 lives in the same directory as this script
sys.path.insert(0, os.path.dirname(__file__))

# ── Environment & Config ───────────────────────────────────────────────────────
_GADM_DIR   = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "gadm", "data"))
_GADM2_PATH = os.path.join(_GADM_DIR, "gadm41_COLORADO_2.json")

REGION_LEVELS = ["country", "admin1", "admin2", "admin3"]
TIME_RESOLUTIONS = ["month", "year"]
# Alias map: some wm-go endpoints send the legacy resolution name in the URL
# (e.g. "annual" instead of "year"), so we write files under both paths.
RESOLUTION_ALIASES = {"year": "annual", "month": "monthly"}


# ── GADM helpers ──────────────────────────────────────────────────────────────

def _load_gadm2() -> gpd.GeoDataFrame:
    gdf = gpd.read_file(_GADM2_PATH)
    gdf.columns = [c.lower() for c in gdf.columns]
    return gdf


def _fuzzy_match(name: str, candidates: pd.Series) -> str | None:
    """Return the best-matching candidate string for *name* (case-insensitive)."""
    name_lower = name.lower().strip()
    exact = candidates[candidates.str.lower().str.strip() == name_lower]
    if not exact.empty:
        return exact.iloc[0]
    sub = candidates[candidates.str.lower().str.contains(name_lower, regex=False)]
    if not sub.empty:
        return sub.iloc[0]
    sub2 = candidates[candidates.apply(lambda c: c.lower().strip() in name_lower)]
    if not sub2.empty:
        return sub2.iloc[0]
    return None


def _resolve_admin2(df: pd.DataFrame, geo_col: str, gadm: gpd.GeoDataFrame) -> pd.DataFrame:
    """Add columns: country, admin1, admin2, lat, lon by matching geo_col against GADM admin2."""
    name_col  = next((c for c in gadm.columns if "name_2" in c), None)
    name1_col = next((c for c in gadm.columns if "name_1" in c), None)
    # GADM 4.1 USA file uses 'country' (from COUNTRY property), not 'name_0'
    name0_col = next((c for c in gadm.columns if "name_0" in c or c == "country"), None)

    if name_col is None:
        raise ValueError("Could not find NAME_2 column in GADM data")

    gadm_names = gadm[name_col]

    def _lookup(county_name):
        match = _fuzzy_match(str(county_name), gadm_names)
        if match is None:
            return pd.Series({"country": None, "admin1": None, "admin2": None, "lat": None, "lon": None})
        row = gadm[gadm[name_col] == match].iloc[0]
        centroid = row.geometry.centroid
        return pd.Series({
            "country": row[name0_col] if name0_col else None,
            "admin1":  row[name1_col] if name1_col else None,
            "admin2":  row[name_col],
            "lat":     centroid.y,
            "lon":     centroid.x,
        })

    resolved = df[geo_col].apply(_lookup)
    return pd.concat([df, resolved], axis=1)


def _fill_latlon_from_gadm(df: pd.DataFrame, gadm: gpd.GeoDataFrame) -> pd.DataFrame:
    """
    For rows missing lat/lon, compute the centroid of the lowest available
    admin level (admin2 → admin1 → country) using the GADM geometries.
    """
    name_col  = next((c for c in gadm.columns if "name_2" in c), None)
    name1_col = next((c for c in gadm.columns if "name_1" in c), None)
    name0_col = next((c for c in gadm.columns if "name_0" in c or c == "country"), None)

    missing = df["lat"].isna() | df["lon"].isna()
    if not missing.any():
        return df

    result = df.copy()

    for idx in df[missing].index:
        row = df.loc[idx]
        centroid = None

        # Try admin2 first
        if name_col and pd.notna(row.get("admin2")):
            matches = gadm[gadm[name_col].str.lower() == str(row["admin2"]).lower()]
            if not matches.empty:
                centroid = matches.geometry.unary_union.centroid

        # Fall back to admin1
        if centroid is None and name1_col and pd.notna(row.get("admin1")):
            matches = gadm[gadm[name1_col].str.lower() == str(row["admin1"]).lower()]
            if not matches.empty:
                centroid = matches.geometry.unary_union.centroid

        # Fall back to country (all rows in GADM file)
        if centroid is None and name0_col and pd.notna(row.get("country")):
            matches = gadm[gadm[name0_col].str.lower() == str(row["country"]).lower()]
            if not matches.empty:
                centroid = matches.geometry.unary_union.centroid

        # Last resort: centroid of entire GADM dataset
        if centroid is None:
            centroid = gadm.geometry.unary_union.centroid

        if centroid is not None:
            result.at[idx, "lat"] = centroid.y
            result.at[idx, "lon"] = centroid.x

    filled = missing.sum() - (result["lat"].isna() | result["lon"].isna()).sum()
    if filled:
        logger.info(f"Filled lat/lon for {filled} rows using GADM centroid fallback")

    return result


# ── Config helpers ────────────────────────────────────────────────────────────

def _load_config(csv_file: str) -> dict:
    config_path = os.path.splitext(csv_file)[0] + ".json"
    if not os.path.exists(config_path):
        raise FileNotFoundError(
            f"Config file not found for {csv_file}. Expected: {config_path}"
        )
    with open(config_path) as f:
        return json.load(f)


def _feature_columns(df: pd.DataFrame, config: dict) -> list:
    # If config explicitly lists feature columns, use those
    if config.get("feature_columns"):
        return [c for c in config["feature_columns"] if c in df.columns]
    # Otherwise auto-detect numeric columns, excluding geo/date/id columns
    skip = {config["geo_column"], config.get("geoid_column", ""), config.get("date_column", "")}
    return [
        col for col in df.columns
        if col not in skip and pd.api.types.is_numeric_dtype(df[col])
    ]


# ── Temporal helpers ──────────────────────────────────────────────────────────

def _to_normalized_time(ts_ms: int, time_res: str) -> int:
    """Normalize a millisecond timestamp to the start of its month or year."""
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    if time_res == "month":
        normalized = datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)
    elif time_res == "year":
        normalized = datetime(dt.year, 1, 1, tzinfo=timezone.utc)
    else:
        raise ValueError(f"Unknown time_res: {time_res}")
    return int(normalized.timestamp() * 1000)


def _run_temporal_aggregation(long_df: pd.DataFrame, time_res: str) -> pd.DataFrame:
    """
    Group by (feature, country, admin1, admin2, admin3, normalized_timestamp)
    and compute sum + mean of value.
    Returns a dataframe with columns: feature, country, admin1, admin2, admin3,
    timestamp, t_sum, t_mean.
    """
    df = long_df.copy()
    df["timestamp"] = df["timestamp"].apply(lambda t: _to_normalized_time(t, time_res))

    group_cols = ["feature", "country", "admin1", "admin2", "admin3", "timestamp"]
    agg_df = (
        df.groupby(group_cols, dropna=False)["value"]
        .agg(t_sum="sum", t_mean="mean")
        .reset_index()
    )
    return agg_df


def _run_spatial_aggregation(temporal_df: pd.DataFrame, region_level: str) -> pd.DataFrame:
    """
    Group temporally-aggregated data by (feature, region_id, timestamp) at the
    given region level and compute sum, mean, count of t_sum and t_mean.
    Returns a dataframe with region_id and aggregated columns.
    """
    admin_level = REGION_LEVELS.index(region_level)
    region_cols = REGION_LEVELS[: admin_level + 1]

    df = temporal_df.copy()
    # Build region_id as pipe-separated admin hierarchy
    # Use '__' separator to match the client's REGION_ID_DELIMETER and the
    # gadm-name ES index full_path format (e.g. 'UnitedStates__Colorado__Adams')
    df["region_id"] = df[region_cols].fillna("").agg("__".join, axis=1)

    group_cols = ["feature", "region_id", "timestamp"]
    agg_df = (
        df.groupby(group_cols)[["t_sum", "t_mean"]]
        .agg(["sum", "mean"])
        .reset_index()
    )
    # Flatten multi-level columns
    agg_df.columns = [
        "_".join(c).strip("_") if isinstance(c, tuple) else c
        for c in agg_df.columns
    ]
    # Rename to match wm-go convention: s_{spatial_agg}_t_{temporal_agg}
    agg_df = agg_df.rename(columns={
        "t_sum_sum":  "s_sum_t_sum",
        "t_sum_mean": "s_mean_t_sum",
        "t_mean_sum": "s_sum_t_mean",
        "t_mean_mean": "s_mean_t_mean",
    })

    return agg_df


# ── Minio helpers ─────────────────────────────────────────────────────────────



def _upload_bytes(s3_client, body: str | bytes, s3_key: str):
    if isinstance(body, str):
        body = body.encode("utf-8")
    s3_client.put_object(Bucket=MINIO_BUCKET, Key=s3_key, Body=body)
    logger.info(f"Uploaded -> s3://{MINIO_BUCKET}/{s3_key}")


def _upload_file(s3_client, local_path: str, s3_key: str):
    with open(local_path, "rb") as f:
        s3_client.put_object(Bucket=MINIO_BUCKET, Key=s3_key, Body=f)
    logger.info(f"Uploaded {local_path} -> s3://{MINIO_BUCKET}/{s3_key}")


# ── Feature scaling ──────────────────────────────────────────────────────────

def _zero_to_one_normalization(df: pd.DataFrame) -> pd.DataFrame:
    """Scale the 'value' column to [0, 1] using min-max normalization per feature."""
    result = df.copy()
    for feature, group in df.groupby("feature"):
        min_val = group["value"].min()
        max_val = group["value"].max()
        denom = max_val - min_val
        if denom == 0:
            result.loc[group.index, "value"] = 0.0
        else:
            result.loc[group.index, "value"] = (group["value"] - min_val) / denom
    return result


def _robust_normalization(df: pd.DataFrame) -> pd.DataFrame:
    """Scale the 'value' column using robust (IQR-based) normalization per feature."""
    result = df.copy()
    for feature, group in df.groupby("feature"):
        q25 = group["value"].quantile(0.25)
        q75 = group["value"].quantile(0.75)
        iqr = q75 - q25
        if iqr == 0:
            result.loc[group.index, "value"] = 0.0
        else:
            result.loc[group.index, "value"] = (group["value"] - q25) / iqr
    return result


def _scale_and_upload(s3_client, long_df: pd.DataFrame, dataset_id: str,
                      workdir: str) -> tuple:
    """
    Produce normalized and robust-normalized parquet files, upload to Minio.
    Returns (data_paths_normalized, data_paths_normalized_robust).
    """
    normalized_path = os.path.join(workdir, f"{dataset_id}_normalized.parquet.gzip")
    robust_path = os.path.join(workdir, f"{dataset_id}_normalized_robust.parquet.gzip")

    _zero_to_one_normalization(long_df).to_parquet(normalized_path, compression="gzip", index=False)
    _robust_normalization(long_df).to_parquet(robust_path, compression="gzip", index=False)

    norm_key   = f"{dataset_id}/indicator/{dataset_id}_normalized.parquet.gzip"
    robust_key = f"{dataset_id}/indicator/{dataset_id}_normalized_robust.parquet.gzip"

    _upload_file(s3_client, normalized_path, norm_key)
    _upload_file(s3_client, robust_path, robust_key)

    return (
        [f"s3://{MINIO_BUCKET}/{norm_key}"],
        [f"s3://{MINIO_BUCKET}/{robust_key}"],
    )


# ── Aggregation output writers ────────────────────────────────────────────────

def _save_regional_aggregations(s3_client, spatial_df: pd.DataFrame,
                                 dataset_id: str, time_res: str, region_level: str):
    """
    For each (feature, timestamp) group, save a CSV of regional aggregations to:
      {dataset_id}/indicator/{time_res}/{feature}/regional/{region_level}/aggs/{timestamp}/default/default.csv
    """
    agg_columns = [c for c in spatial_df.columns if c.startswith("s_")]
    for (feature, timestamp), group in spatial_df.groupby(["feature", "timestamp"]):
        out = group[["region_id"] + agg_columns].rename(columns={"region_id": "id"})
        path = (
            f"{dataset_id}/indicator/{time_res}/{feature}/regional/"
            f"{region_level}/aggs/{timestamp}/default/default.csv"
        )
        _upload_bytes(s3_client, out.to_csv(index=False), path)


def _save_regional_timeseries(s3_client, spatial_df: pd.DataFrame,
                               dataset_id: str, time_res: str, region_level: str):
    """
    For each (feature, region_id) group, save a timeseries CSV to:
      {dataset_id}/indicator/{time_res}/{feature}/regional/{region_level}/timeseries/default/{region_id}.csv
    """
    agg_columns = [c for c in spatial_df.columns if c.startswith("s_")]
    for (feature, region_id), group in spatial_df.groupby(["feature", "region_id"]):
        out = group[["timestamp"] + agg_columns].sort_values("timestamp")
        path = (
            f"{dataset_id}/indicator/{time_res}/{feature}/regional/"
            f"{region_level}/timeseries/default/{region_id}.csv"
        )
        _upload_bytes(s3_client, out.to_csv(index=False), path)


def _save_global_timeseries(s3_client, temporal_df: pd.DataFrame,
                             dataset_id: str, time_res: str):
    """
    Save a global (all-region) timeseries CSV per feature to:
      {dataset_id}/indicator/{time_res}/{feature}/timeseries/global/global.csv
    """
    for feature, group in temporal_df.groupby("feature"):
        ts = (
            group.groupby("timestamp")[["t_sum", "t_mean"]]
            .agg({"t_sum": "sum", "t_mean": "mean"})
            .reset_index()
            .sort_values("timestamp")
        )
        # wm-go reads column s_{spatial_agg}_t_{temporal_agg} from this CSV.
        # For the global (all-region) timeseries there is no spatial breakdown,
        # so spatial sum == spatial mean == the single global value.
        ts["s_sum_t_sum"]  = ts["t_sum"]
        ts["s_mean_t_sum"] = ts["t_sum"]
        ts["s_sum_t_mean"] = ts["t_mean"]
        ts["s_mean_t_mean"] = ts["t_mean"]
        ts = ts.drop(columns=["t_sum", "t_mean"])
        path = f"{dataset_id}/indicator/{time_res}/{feature}/timeseries/global/global.csv"
        _upload_bytes(s3_client, ts.to_csv(index=False), path)


def _save_region_lists(s3_client, long_df: pd.DataFrame, dataset_id: str):
    """
    For each feature, save a region_lists.json to:
      {dataset_id}/indicator/raw/{feature}/info/region_lists.json

    The file is a JSON object with keys country, admin1, admin2, admin3,
    each containing the list of unique region IDs at that level (using __ separator).
    This is required by the wm-go /output/region-lists endpoint.
    """
    for feature, group in long_df.groupby("feature"):
        region_lists = {
            "country": sorted(group["country"].dropna().unique().tolist()),
            "admin1":  sorted(
                (group["country"].fillna("") + "__" + group["admin1"].fillna(""))
                .loc[group["admin1"].notna()]
                .unique().tolist()
            ),
            "admin2":  sorted(
                (group["country"].fillna("") + "__" + group["admin1"].fillna("") + "__" + group["admin2"].fillna(""))
                .loc[group["admin2"].notna()]
                .unique().tolist()
            ),
            "admin3":  sorted(
                (group["country"].fillna("") + "__" + group["admin1"].fillna("") + "__" +
                 group["admin2"].fillna("") + "__" + group["admin3"].fillna(""))
                .loc[group["admin3"].notna()]
                .unique().tolist()
            ) if "admin3" in group.columns and group["admin3"].notna().any() else [],
        }
        path = f"{dataset_id}/indicator/raw/{feature}/info/region_lists.json"
        _upload_bytes(s3_client, json.dumps(region_lists), path)


def _save_qualifier_counts(s3_client, long_df: pd.DataFrame, dataset_id: str):
    """
    For each feature, save a qualifier_counts.json to:
      {dataset_id}/indicator/raw/{feature}/info/qualifier_counts.json

    The file contains the number of unique values per qualifier column and the
    thresholds used when computing.  This dataset has no qualifier columns so
    both maps are empty, but the file must exist or wm-go returns 404.
    """
    for feature in long_df["feature"].unique():
        qualifier_counts = {"thresholds": {}, "counts": {}}
        path = f"{dataset_id}/indicator/raw/{feature}/info/qualifier_counts.json"
        _upload_bytes(s3_client, json.dumps(qualifier_counts), path)


def _save_regional_stats(s3_client, spatial_df: pd.DataFrame,
                          dataset_id: str, time_res: str, region_level: str):
    """
    Save extrema (min/max) stats per feature to:
      {dataset_id}/indicator/{time_res}/{feature}/regional/{region_level}/stats/default/extrema.json
    """
    agg_columns = [c for c in spatial_df.columns if c.startswith("s_")]
    max_items = 20
    for feature, group in spatial_df.groupby("feature"):
        result = {"min": {}, "max": {}}
        for col in agg_columns:
            min_val = group[col].min()
            max_val = group[col].max()
            select = ["region_id", "timestamp", col]
            result["min"][col] = (
                group[group[col] == min_val][select]
                .rename(columns={col: "value"})
                .nlargest(max_items, "timestamp")
                .to_dict(orient="records")
            )
            result["max"][col] = (
                group[group[col] == max_val][select]
                .rename(columns={col: "value"})
                .nlargest(max_items, "timestamp")
                .to_dict(orient="records")
            )
        path = (
            f"{dataset_id}/indicator/{time_res}/{feature}/regional/"
            f"{region_level}/stats/default/extrema.json"
        )
        _upload_bytes(s3_client, json.dumps(result), path)


def _save_grid_stats(s3_client, spatial_df: pd.DataFrame,
                    dataset_id: str, time_res: str):
    """
    Save per-timestamp global min/max stats CSV to:
      {dataset_id}/indicator/{time_res}/{feature}/stats/grid/{timestamp}.csv

    wm-go reads this file to determine the colour-scale range for the map.
    The CSV has a 'zoom' column (rows 0-7) plus min_s_<spa>_t_<tmp> /
    max_s_<spa>_t_<tmp> columns derived from the spatially-aggregated data.
    """
    agg_columns = [c for c in spatial_df.columns if c.startswith("s_")]
    zoom_levels = list(range(8))  # zoom 0-7

    for feature, feat_df in spatial_df.groupby("feature"):
        for timestamp, ts_df in feat_df.groupby("timestamp"):
            stat_row = {}
            for col in agg_columns:
                stat_row[f"min_{col}"] = ts_df[col].min()
                stat_row[f"max_{col}"] = ts_df[col].max()

            # populate stats for all map zoom levels (0 to 22)
            # Z_DIFF in map-util-new.ts is 6, so stat.zoom = map_zoom + 6
            rows = [{"zoom": z + _TILE_LEVEL_DIFF, **stat_row} for z in range(23)]
            df_out = pd.DataFrame(rows)
            path = (
                f"{dataset_id}/indicator/{time_res}/{feature}/stats/grid/{timestamp}.csv"
            )
            _upload_bytes(s3_client, df_out.to_csv(index=False), path)


# ── Tile generation ───────────────────────────────────────────────────────────

_TILE_LEVEL_DIFF = 6
_TILE_MAX_SUBTILE_PRECISION = 14
_TILE_MAX_ZOOM = _TILE_MAX_SUBTILE_PRECISION - _TILE_LEVEL_DIFF  # = 8


def _deg2num(lat: float, lon: float, zoom: int):
    """Convert lat/lon to tile (z, x, y) at the given zoom level."""
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return (zoom, x, y)


def _project_to_bin(sz: int, sx: int, sy: int, tz: int, tx: int, ty: int) -> int:
    """Project a subtile coordinate into a bin index within its parent tile."""
    zdiff = sz - tz
    scale = 2 ** zdiff
    binx = sx - tx * scale
    biny = sy - ty * scale
    return int(binx + biny * scale)


def _save_tiles(s3_client, long_df: pd.DataFrame, dataset_id: str, time_res: str, path_res: str):
    """
    Generate and upload protobuf .tile files for choropleth display.
    Path: {dataset_id}/indicator/{path_res}/{feature}/tiles/{timestamp}-{z}-{x}-{y}.tile
    """
    import tiles_pb2

    # Normalize timestamps for this time_res
    df = long_df[["feature", "timestamp", "lat", "lon", "value"]].copy()
    df["ts_norm"] = df["timestamp"].apply(lambda t: _to_normalized_time(t, time_res))

    # Aggregate to (feature, ts_norm, lat, lon) — handles multiple rows per point
    point_agg = (
        df.groupby(["feature", "ts_norm", "lat", "lon"], dropna=False)["value"]
        .agg(t_sum="sum", t_mean="mean")
        .reset_index()
    )

    # Pre-compute subtile at max precision
    subtiles = point_agg.apply(
        lambda r: _deg2num(r["lat"], r["lon"], _TILE_MAX_SUBTILE_PRECISION), axis=1
    )
    point_agg["sub_x"] = subtiles.apply(lambda s: s[1]).astype("int64")
    point_agg["sub_y"] = subtiles.apply(lambda s: s[2]).astype("int64")

    tile_count = 0
    for level_idx in range(_TILE_MAX_ZOOM + 1):
        tz = _TILE_MAX_ZOOM - level_idx  # actual tile zoom level
        psz = _TILE_MAX_SUBTILE_PRECISION - level_idx  # parent subtile zoom

        shift = 2 ** level_idx
        tile_shift = 2 ** _TILE_LEVEL_DIFF
        df_level = point_agg.copy()
        df_level["ps_x"] = (point_agg["sub_x"] // shift).astype("int64")
        df_level["ps_y"] = (point_agg["sub_y"] // shift).astype("int64")
        df_level["t_x"] = (df_level["ps_x"] // tile_shift).astype("int64")
        df_level["t_y"] = (df_level["ps_y"] // tile_shift).astype("int64")

        total_bins = 4 ** _TILE_LEVEL_DIFF  # always 4096

        for (feature, ts_norm, t_x, t_y), group in df_level.groupby(
            ["feature", "ts_norm", "t_x", "t_y"]
        ):
            tile_proto = tiles_pb2.Tile()
            tile_proto.coord.z = tz
            tile_proto.coord.x = int(t_x)
            tile_proto.coord.y = int(t_y)
            tile_proto.bins.totalBins = total_bins

            for _, row in group.iterrows():
                bin_idx = _project_to_bin(
                    psz, int(row["ps_x"]), int(row["ps_y"]),
                    tz, int(t_x), int(t_y)
                )
                tile_proto.bins.stats[bin_idx].s_sum_t_sum += float(row["t_sum"])
                tile_proto.bins.stats[bin_idx].s_sum_t_mean += float(row["t_mean"])
                tile_proto.bins.stats[bin_idx].weight += 1.0

            body = tile_proto.SerializeToString()
            s3_key = (
                f"{dataset_id}/indicator/{path_res}/{feature}/tiles/"
                f"{int(ts_norm)}-{tz}-{int(t_x)}-{int(t_y)}.tile"
            )
            _upload_bytes(s3_client, body, s3_key)
            tile_count += 1

    logger.info(f"Uploaded {tile_count} tile files for {path_res}")


# ── ES doc builder ────────────────────────────────────────────────────────────

def _build_qualifier_outputs(feature_names: list, date_col: str | None) -> list:
    """Build qualifier_outputs for geo columns and the date column, mirroring dojo."""
    qualifier_outputs = []
    for geo_str in ["country", "admin1", "admin2", "admin3", "lat", "lng"]:
        qualifier_outputs.append({
            "name":             geo_str,
            "display_name":     geo_str,
            "description":      "location",
            "type":             geo_str,
            "unit":             None,
            "unit_description": None,
            "ontologies":       {},
            "related_features": feature_names,
            "qualifier_role":   "breakdown",
        })
    if date_col:
        qualifier_outputs.append({
            "name":             date_col,
            "display_name":     date_col,
            "description":      "date",
            "type":             "datetime",
            "unit":             None,
            "unit_description": None,
            "ontologies":       {},
            "related_features": feature_names,
            "qualifier_role":   "breakdown",
        })
    return qualifier_outputs


def _temporal_resolution_to_option(temporal_resolution: str) -> str:
    """Map raw temporal resolution strings to TemporalResolutionOption values used by the client.

    The client's TemporalResolutionOption enum uses 'year' and 'month', while
    datacube configs use 'annual' and 'monthly'.  The default_state and
    default_view fields must use the TemporalResolutionOption values so that
    getDefaultDataConfig (index node attachment) and DataExplorer both send
    the correct resolution string in API requests.
    """
    mapping = {
        "annual":  "year",
        "monthly": "month",
        "dekad":   "month",
        "weekly":  "month",
        "daily":   "month",
    }
    return mapping.get(temporal_resolution, "year")


def _build_es_docs(data_id: str, csv_file: str, config: dict, data_paths: list,
                   data_paths_normalized: list, data_paths_normalized_robust: list,
                   feature_cols: list, admin_values: dict, period_gte: int,
                   period_lte: int, num_rows: int,
                   num_rows_per_feature: dict | None = None,
                   year_timeseries_size: dict | None = None,
                   month_timeseries_size: dict | None = None,
                   num_missing_val: int = 0,
                   region_levels: list | None = None) -> list:
    """
    Mirror startIndicatorPostProcessing: produce one ES document per feature column.
    Each document shares the same data_id but gets its own unique id and
    has default_feature set to that output's name.
    """
    base_name = os.path.splitext(os.path.basename(csv_file))[0]
    now_ms = int(datetime.utcnow().timestamp() * 1000)
    temporal_resolution = config.get("temporal_resolution", "annual")
    # TemporalResolutionOption ('year' / 'month') used by the client in API calls
    temporal_resolution_option = _temporal_resolution_to_option(temporal_resolution)
    docs = []
    for feature in feature_cols:
        doc_id = str(uuid.uuid4())
        output = {
            "name":             feature,
            "display_name":     feature.replace("_", " ").title(),
            "description":      "",
            "type":             "float",
            "unit":             "",
            "unit_description": "",
            "is_primary":       True,
            "ontologies":       {},
            "alias":            {},
            "data_resolution": {
                "temporal_resolution": temporal_resolution,
                "spatial_resolution":  [0, 0],
            },
        }
        doc = {
            "_id":           doc_id,
            "id":            doc_id,
            "data_id":       data_id,
            "name":          config.get("name", base_name),
            "description":   config.get("description", f"Auto-ingested from {os.path.basename(csv_file)}"),
            "family_name":   config.get("family_name", base_name),
            "created_at":    now_ms,
            "type":          "indicator",
            "category":      config.get("category", []),
            "domains":       config.get("domains", []),
            "maintainer": {
                "name":         config.get("maintainer_name", ""),
                "organization": config.get("maintainer_org", ""),
                "email":        config.get("maintainer_email", ""),
                "website":      config.get("maintainer_website", ""),
            },
            "is_hidden":     False,
            "is_stochastic": False,
            "tags":          config.get("tags", []),
            "default_feature": feature,
            "data_paths":    data_paths,
            "data_paths_normalized": data_paths_normalized,
            "data_paths_normalized_robust": data_paths_normalized_robust,
            "outputs":       [output],
            "qualifier_outputs": _build_qualifier_outputs(feature_cols, config.get("date_column")),
            "ontology_matches": [],
            "geography": {
                "country": admin_values.get("country", []),
                "admin1":  admin_values.get("admin1", []),
                "admin2":  admin_values.get("admin2", []),
                "admin3":  admin_values.get("admin3", []),
            },
            "period": {
                "gte": period_gte,
                "lte": period_lte,
            },
            "default_state": {
                "dataId": data_id,
                "breakdownState": {
                    "outputName": feature,
                    "modelRunIds": ["indicator"],
                    "comparisonSettings": {
                        "shouldDisplayAbsoluteValues": True,
                        "baselineTimeseriesId": "",
                        "shouldUseRelativePercentage": True,
                    },
                },
                "mapDisplayOptions": {
                    "selectedMapBaseLayer": "default",
                    "selectedMapDataLayer": "admin",
                    "dataLayerTransparency": "1",
                    "colorSchemeReversed": False,
                    "colorSchemeName": "DEFAULT",
                    "colorScaleType": "linear discrete",
                    "numberOfColorBins": 5,
                },
                "selectedTimestamp": period_lte,
                "selectedTransform": "",
                "spatialAggregationMethod": "mean",
                "temporalAggregationMethod": "mean",
                "spatialAggregation": region_levels[-1] if region_levels else "country",
                # Use TemporalResolutionOption ('year'/'month') so the client
                # sends the correct resolution string in API requests.
                "temporalResolution": temporal_resolution_option,
            },
            # default_view is read by getDefaultDataConfig when attaching a
            # dataset to an index node.  It must also use TemporalResolutionOption.
            "default_view": {
                "temporalResolution": temporal_resolution_option,
                "spatialAggregation": "mean",
                "temporalAggregation": "mean",
            },
            "deprecated":        False,
            "data_sensitivity":  config.get("data_sensitivity", ""),
            "data_quality":      config.get("data_quality", ""),
            "published":         True,
            "flow_id":           str(uuid.uuid4()),
            "runtimes": {
                "queued": {
                    "start_time": now_ms,
                    "end_time":   now_ms,
                },
                "post_processing": {
                    "start_time": now_ms,
                    "end_time":   now_ms,
                },
            },
            "status": "READY",
            "data_info": {
                "num_rows":             num_rows,
                "num_rows_per_feature": num_rows_per_feature or {f: num_rows for f in feature_cols},
                "features":             feature_cols,
                "has_monthly":          temporal_resolution in ("monthly", "dekad", "weekly", "daily"),
                "has_annual":           temporal_resolution == "annual",
                "month_timeseries_size": month_timeseries_size or {},
                "year_timeseries_size":  year_timeseries_size or {},
                "num_invalid_ts":        0,
                "num_missing_ts":        0,
                "num_missing_val":       num_missing_val,
                "has_weights":           False,
                "raw_count_threshold":   10000,
                "region_levels":         region_levels or [],
                "has_tiles":             True,
            },
        }
        docs.append(doc)
    return docs


# ── Main ──────────────────────────────────────────────────────────────────────

def populate_es_with_datacube():
    elastic = get_es_client()
    s3_client = get_s3_client()
    ensure_bucket(s3_client)

    logger.info("Loading GADM admin2 data...")
    gadm = _load_gadm2()

    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    csv_files = glob.glob(os.path.join(data_dir, "*.csv"))
    logger.info(f"Found {len(csv_files)} CSV files in {data_dir}")

    es_docs = []

    for csv_file in csv_files:
        logger.info(f"Processing: {csv_file}")

        try:
            config = _load_config(csv_file)
        except FileNotFoundError as e:
            logger.warning(str(e) + " Skipping.")
            continue

        dataset_id = config.get("id", str(uuid.uuid4()))
        workdir = tempfile.mkdtemp(prefix=f"datacube_{dataset_id}_")

        try:
            # 1. Load CSV
            df = pd.read_csv(csv_file)
            feature_cols = _feature_columns(df, config)
            if not feature_cols:
                logger.warning(f"No numeric feature columns found in {csv_file}, skipping.")
                continue

            # 2. Resolve geo column -> country / admin1 / admin2 / lat / lon
            geo_col = config["geo_column"]
            logger.info(f"Resolving admin2 for column '{geo_col}'...")
            df = _resolve_admin2(df, geo_col, gadm)

            # 3. Add timestamp column
            date_col = config.get("date_column")
            if date_col and date_col in df.columns:
                date_fmt = config.get("date_format", "%Y-%m-%d")
                df["timestamp"] = pd.to_datetime(df[date_col], format=date_fmt, utc=True) \
                    .astype("int64") // 1_000_000
                timestamp_ms = int(df["timestamp"].min())
            else:
                fixed_date = config.get("fixed_date", "2020-01-01")
                timestamp_ms = int(datetime.strptime(fixed_date, "%Y-%m-%d").timestamp() * 1000)
                df["timestamp"] = timestamp_ms

            # 4. Melt into long format: one row per (region, feature)
            id_cols = ["timestamp", "country", "admin1", "admin2", "lat", "lon"]
            long_df = df.melt(
                id_vars=id_cols,
                value_vars=feature_cols,
                var_name="feature",
                value_name="value",
            )
            long_df.insert(long_df.columns.get_loc("lat"), "admin3", None)

            # Coerce value column to numeric, dropping rows that cannot be converted
            long_df["value"] = pd.to_numeric(long_df["value"], errors="coerce")
            non_numeric = long_df["value"].isna().sum()
            if non_numeric:
                logger.warning(f"Dropped {non_numeric} non-numeric value rows from {csv_file}")
            long_df = long_df.dropna(subset=["value"])

            # For rows still missing lat/lon, derive centroid from lowest available admin level
            long_df = _fill_latlon_from_gadm(long_df, gadm)

            # Drop rows where geo resolution failed
            before = len(long_df)
            long_df = long_df.dropna(subset=["lat", "lon"])
            dropped = before - len(long_df)
            if dropped:
                logger.warning(f"Dropped {dropped} rows with unresolved geo for {csv_file}")

            # Drop rows where country could not be resolved — these produce empty
            # region IDs in aggregation outputs, which the regional-data endpoint
            # cannot serve to the client.
            before = len(long_df)
            long_df = long_df.dropna(subset=["country"])
            dropped = before - len(long_df)
            if dropped:
                logger.warning(f"Dropped {dropped} rows with unresolved country for {csv_file}")

            if long_df.empty:
                logger.warning(f"No rows after geo resolution for {csv_file}, skipping.")
                continue

            # 5. Write raw parquet and upload to Minio
            parquet_path = os.path.join(workdir, f"{dataset_id}.parquet.gzip")
            long_df.to_parquet(parquet_path, compression="gzip", index=False)
            raw_s3_key = f"{dataset_id}/indicator/{dataset_id}.parquet.gzip"
            _upload_file(s3_client, parquet_path, raw_s3_key)
            data_paths = [f"s3://{MINIO_BUCKET}/{raw_s3_key}"]

            # 5b. Feature scaling: 0-to-1 and robust normalization
            logger.info("Scaling features...")
            data_paths_normalized, data_paths_normalized_robust = _scale_and_upload(
                s3_client, long_df, dataset_id, workdir
            )

            # 6. Save region lists for the wm-go /output/region-lists endpoint
            _save_region_lists(s3_client, long_df, dataset_id)
            _save_qualifier_counts(s3_client, long_df, dataset_id)

            # 7. Run temporal + spatial aggregations for each time resolution
            # (uses raw long_df, not scaled)
            for time_res in TIME_RESOLUTIONS:
                logger.info(f"Running {time_res} aggregations...")
                temporal_df = _run_temporal_aggregation(long_df, time_res)

                # Write files under both the canonical path (e.g. "year") and the
                # legacy alias (e.g. "annual") so all wm-go endpoints find their files
                # regardless of which resolution string they include in the URL.
                path_prefixes = [time_res]
                alias = RESOLUTION_ALIASES.get(time_res)
                if alias:
                    path_prefixes.append(alias)

                for path_res in path_prefixes:
                    # Global timeseries
                    _save_global_timeseries(s3_client, temporal_df, dataset_id, path_res)

                    # Choropleth tile files for the map visualization
                    _save_tiles(s3_client, long_df, dataset_id, time_res, path_res)

                    # Per region level: spatial agg + regional aggs + timeseries + stats
                    for region_level in REGION_LEVELS:
                        # Skip admin3 if not present in data
                        if region_level == "admin3" and long_df["admin3"].isna().all():
                            continue
                        spatial_df = _run_spatial_aggregation(temporal_df, region_level)
                        _save_regional_aggregations(s3_client, spatial_df, dataset_id, path_res, region_level)
                        _save_regional_timeseries(s3_client, spatial_df, dataset_id, path_res, region_level)
                        _save_regional_stats(s3_client, spatial_df, dataset_id, path_res, region_level)
                        if region_level == "admin2":
                            _save_grid_stats(s3_client, spatial_df, dataset_id, path_res)

            # 7. Build ES metadata doc
            admin_values = {
                "country": long_df["country"].dropna().unique().tolist(),
                "admin1":  long_df["admin1"].dropna().unique().tolist(),
                "admin2":  long_df["admin2"].dropna().unique().tolist(),
                "admin3":  long_df["admin3"].dropna().unique().tolist() if "admin3" in long_df.columns else [],
            }
            period_gte = int(long_df["timestamp"].min())
            period_lte = int(long_df["timestamp"].max())

            # Compute data_info stats
            num_rows_per_feature = {
                f: int((long_df["feature"] == f).sum()) for f in feature_cols
            }
            def _ts_size(res):
                if res == "year":
                    return {
                        f: int(long_df[long_df["feature"] == f]["timestamp"]
                               .apply(lambda ts: pd.Timestamp(ts, unit="ms").year)
                               .nunique())
                        for f in feature_cols
                    }
                else:
                    return {
                        f: int(long_df[long_df["feature"] == f]["timestamp"]
                               .apply(lambda ts: (pd.Timestamp(ts, unit="ms").year,
                                                  pd.Timestamp(ts, unit="ms").month))
                               .nunique())
                        for f in feature_cols
                    }
            year_timeseries_size = _ts_size("year")
            month_timeseries_size = _ts_size("month")
            num_missing_val = int(long_df["value"].isna().sum())
            region_levels = [
                lvl for lvl in ["country", "admin1", "admin2", "admin3"]
                if long_df.get(lvl, pd.Series(dtype=object)).notna().any()
            ]

            docs = _build_es_docs(
                dataset_id, csv_file, config, data_paths,
                data_paths_normalized, data_paths_normalized_robust,
                feature_cols, admin_values,
                period_gte=period_gte,
                period_lte=period_lte,
                num_rows=len(long_df),
                num_rows_per_feature=num_rows_per_feature,
                year_timeseries_size=year_timeseries_size,
                month_timeseries_size=month_timeseries_size,
                num_missing_val=num_missing_val,
                region_levels=region_levels,
            )
            es_docs.extend(docs)
            logger.info(f"Prepared {len(docs)} ES docs for dataset {dataset_id} ({os.path.basename(csv_file)})")

        except Exception as e:
            logger.error(f"Failed to process {csv_file}: {e}", exc_info=True)
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    # 8. Bulk ingest all metadata docs into ES
    if es_docs:
        try:
            response = helpers.bulk(elastic, es_docs, index="data-datacube")
            logger.info(f"Successfully ingested {response[0]} datacube documents into ES")
        except Exception as e:
            logger.error(f"Error ingesting datacube metadata into ES: {e}")
    else:
        logger.warning("No datacube documents to ingest into ES")

if __name__ == "__main__":
    populate_es_with_datacube()
