FROM node:18-alpine as frontend-builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy frontend source code
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build dashboard
COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm install --legacy-peer-deps

COPY dashboard/ ./dashboard/
RUN cd dashboard && npm run build

# Python backend stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    git \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global --add safe.directory /workspace \
    && git config --global credential.helper store

# Create required directories
RUN mkdir -p /var/log/supervisor

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./backend/
COPY dashboard-api/requirements.txt ./dashboard-api/
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && pip install --no-cache-dir -r dashboard-api/requirements.txt

# Copy backend source code
COPY backend/ ./backend/
COPY dashboard-api/ ./dashboard-api/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder /app/dashboard/dist ./dashboard/dist

# Copy configurations
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions for Git operations
RUN mkdir -p /workspace && chown -R root:root /workspace

EXPOSE 80 8000 3001

# Configure Git at runtime using environment variables
CMD git config --global user.name "${GIT_USER_NAME}" && \
    git config --global user.email "${GIT_USER_EMAIL}" && \
    if [ ! -z "${GITHUB_TOKEN}" ]; then \
        echo "https://${GITHUB_TOKEN}:x-oauth-basic@github.com" > /root/.git-credentials && \
        chmod 600 /root/.git-credentials; \
    fi && \
    /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf 