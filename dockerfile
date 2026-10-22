# 1. Python 3.10 Slim (Lightweight Linux)
FROM python:3.10-slim

# 2. Set Env Variables (No .pyc files, Instant logs)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Work Directory
WORKDIR /app

# 4. Install System Dependencies (gcc needed for some python packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy Project Code
COPY . .

# 7. Run the App (Port 8000)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]