FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# run as an unprivileged user
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
# One worker: the built-in scheduler runs inside the process. Scale out by disabling it (ENABLE_SCHEDULER=0) on extra replicas.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
