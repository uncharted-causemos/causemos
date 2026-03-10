FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all resources
COPY atlas/ /app/atlas/
COPY gadm/ /app/gadm/
COPY run-init.sh /app/run-init.sh

RUN chmod +x /app/run-init.sh

# The script uses its directory's position to find files, so we'll run it from /app
ENTRYPOINT ["/app/run-init.sh"]
