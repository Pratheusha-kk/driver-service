# Minimal, production-friendly base image
FROM python:3.11-slim

# Create non-root user (recommended for security)
RUN useradd -m appuser

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Drop privileges
USER appuser

EXPOSE 5000

# Run the Flask app (app.py uses host=0.0.0.0 and port=5000)
CMD ["python", "app.py"]
