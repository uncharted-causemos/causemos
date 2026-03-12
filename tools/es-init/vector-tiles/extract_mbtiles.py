import sqlite3
import os
import sys

def extract_mbtiles(mbtiles_path, output_dir):
    print(f"Extracting {mbtiles_path} to {output_dir}")
    conn = sqlite3.connect(mbtiles_path)
    cursor = conn.cursor()

    # MBTiles stores tiles in a tiles table with zoom_level, tile_column, and tile_row.
    # The tile_row is inverted (TMS style) relative to slippy map (Google/XYZ style).
    cursor.execute("SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles")

    count = 0
    for z, x, y, data in cursor:
        # Flip y: y = (1 << z) - 1 - y
        y_slippy = (1 << z) - 1 - y

        # Path format: output_dir/z/x/y.pbf
        path = os.path.join(output_dir, str(z), str(x), f"{y_slippy}.pbf")
        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "wb") as f:
            f.write(data)
        count += 1

    conn.close()
    print(f"Extracted {count} tiles.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_mbtiles.py <mbtiles_file> <output_dir>")
        sys.exit(1)
    extract_mbtiles(sys.argv[1], sys.argv[2])
