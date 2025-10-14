# Dockerfile for cscscsc
# Language: Python
# Type: execution
# Optimized with dependency caching

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
		PYTHONUNBUFFERED=1 \
		HOST=0.0.0.0 \
		PORT=3000 \
		SERVICE_NAME="cscscsc" \
    SERVICE_TYPE="execution"
# No Roble table configured
# No Roble project configured
# No Roble token configured

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY --chown=appuser:appuser . /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
	CMD python -c "import sys,urllib.request as u; u.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','3000')+'/health'); sys.exit(0)" \
	|| exit 1

EXPOSE ${PORT}

# Start application
CMD ["python", "main.py"]