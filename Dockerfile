FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy everything needed for install
COPY pyproject.toml README.md ./
COPY lpor/ ./lpor/
COPY web/ ./web/

# Install dependencies
RUN uv pip install --system .

EXPOSE 8000

CMD ["uvicorn", "web.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
