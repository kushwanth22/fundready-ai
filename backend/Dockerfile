FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source into /app/backend/ so 'from backend.x' imports resolve
COPY . ./backend/

# Root of /app is the Python path — backend is a package inside it
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
