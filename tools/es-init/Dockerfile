# Stage 1: Build tippecanoe
FROM debian:bullseye-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and build tippecanoe (Felt fork is the current active one)
RUN curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.48.0.tar.gz | tar xz \
    && cd tippecanoe-2.48.0 \
    && make -j$(nproc) \
    && make install

# Stage 2: Final Image
FROM python:3.10-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libgdal-dev \
    libsqlite3-0 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Copy tippecanoe from builder
COPY --from=builder /usr/local/bin/tippecanoe /usr/local/bin/tippecanoe
COPY --from=builder /usr/local/bin/tile-join /usr/local/bin/tile-join

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all resources
COPY common.py /app/common.py
COPY atlas/ /app/atlas/
COPY gadm/ /app/gadm/
COPY datacube/ /app/datacube/
COPY vector-tiles/ /app/vector-tiles/
COPY run-init.sh /app/run-init.sh

RUN chmod +x /app/run-init.sh
RUN chmod +x /app/vector-tiles/generate_tiles.sh

# The script uses its directory's position to find files, so we'll run it from /app
ENTRYPOINT ["/app/run-init.sh"]
