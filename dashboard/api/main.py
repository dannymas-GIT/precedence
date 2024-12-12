from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from git import Repo, GitCommandError
import docker
import os
import subprocess
import psutil
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI(
    title="Development Dashboard API",
    description="API for monitoring Git, Docker, and linting status of your development environment",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Get project root from environment variable or use current directory
PROJECT_ROOT = os.getenv('PROJECT_ROOT', os.getcwd())

# Models
class GitBranch(BaseModel):
    branch: str

class GitCommit(BaseModel):
    message: str
    timestamp: str

class PRCount(BaseModel):
    count: int

class ContainerStatus(BaseModel):
    name: str
    state: str

class ContainerList(BaseModel):
    containers: List[ContainerStatus]

class LinterTool(BaseModel):
    name: str
    errors: int
    warnings: int

class LinterStatus(BaseModel):
    tools: List[LinterTool]

# Metrics Models
class Metric(BaseModel):
    name: str
    value: float
    unit: str
    trend: str
    change: Optional[float] = None

class MetricsResponse(BaseModel):
    metrics: List[Metric]

# Log Models
class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    service: str

class LogSearchResponse(BaseModel):
    logs: List[LogEntry]

# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Development Dashboard API",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_endpoint():
    return get_openapi(
        title="Development Dashboard API",
        version="1.0.0",
        description="API for monitoring Git, Docker, and linting status",
        routes=app.routes,
    )

# Git routes
@app.get("/api/git/branch", response_model=GitBranch, tags=["Git"])
async def get_current_branch():
    """
    Get the current Git branch name.
    """
    try:
        repo = Repo(PROJECT_ROOT)
        return {"branch": repo.active_branch.name}
    except (GitCommandError, Exception) as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/commit", response_model=GitCommit, tags=["Git"])
async def get_last_commit():
    """
    Get information about the last Git commit.
    """
    try:
        repo = Repo(PROJECT_ROOT)
        commit = repo.head.commit
        return {
            "message": commit.message.strip(),
            "timestamp": datetime.fromtimestamp(commit.committed_date).isoformat()
        }
    except (GitCommandError, Exception) as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/prs", response_model=PRCount, tags=["Git"])
async def get_pr_count():
    """
    Get the count of open pull requests.
    """
    return {"count": 0}

# Docker routes
@app.get("/api/docker/containers", response_model=ContainerList, tags=["Docker"])
async def get_containers():
    """
    Get the status of all Docker containers.
    """
    try:
        client = docker.from_env()
        containers = client.containers.list(all=True)
        return {
            "containers": [
                {
                    "name": container.name,
                    "state": container.status
                }
                for container in containers
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Linter routes
@app.get("/api/linter/status", response_model=LinterStatus, tags=["Linting"])
async def get_linter_status():
    """
    Get the status of all configured linters (ESLint, TypeScript, Pylint).
    """
    try:
        results = {
            "tools": []
        }
        
        # ESLint check
        if os.path.exists(os.path.join(PROJECT_ROOT, "package.json")):
            try:
                eslint_output = subprocess.run(
                    ["npx", "eslint", ".", "--format", "json"],
                    capture_output=True,
                    text=True,
                    cwd=PROJECT_ROOT
                )
                eslint_data = json.loads(eslint_output.stdout or "[]")
                error_count = sum(1 for file in eslint_data for msg in file["messages"] if msg["severity"] == 2)
                warning_count = sum(1 for file in eslint_data for msg in file["messages"] if msg["severity"] == 1)
                results["tools"].append({
                    "name": "ESLint",
                    "errors": error_count,
                    "warnings": warning_count
                })
            except Exception:
                results["tools"].append({
                    "name": "ESLint",
                    "errors": 0,
                    "warnings": 0
                })

        # TypeScript check
        if os.path.exists(os.path.join(PROJECT_ROOT, "tsconfig.json")):
            try:
                tsc_output = subprocess.run(
                    ["npx", "tsc", "--noEmit"],
                    capture_output=True,
                    text=True,
                    cwd=PROJECT_ROOT
                )
                error_count = len([line for line in tsc_output.stderr.split("\n") if "error" in line.lower()])
                results["tools"].append({
                    "name": "TypeScript",
                    "errors": error_count,
                    "warnings": 0
                })
            except Exception:
                results["tools"].append({
                    "name": "TypeScript",
                    "errors": 0,
                    "warnings": 0
                })

        # Python linting
        if os.path.exists(os.path.join(PROJECT_ROOT, "requirements.txt")):
            try:
                pylint_output = subprocess.run(
                    ["pylint", ".", "--output-format=json"],
                    capture_output=True,
                    text=True,
                    cwd=PROJECT_ROOT
                )
                pylint_data = json.loads(pylint_output.stdout or "[]")
                error_count = sum(1 for item in pylint_data if item["type"] in ["error", "fatal"])
                warning_count = sum(1 for item in pylint_data if item["type"] == "warning")
                results["tools"].append({
                    "name": "Pylint",
                    "errors": error_count,
                    "warnings": warning_count
                })
            except Exception:
                results["tools"].append({
                    "name": "Pylint",
                    "errors": 0,
                    "warnings": 0
                })

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Metrics routes
@app.get("/api/metrics", response_model=MetricsResponse, tags=["Metrics"])
async def get_metrics():
    """
    Get various application metrics including CPU, memory, disk usage, and response times.
    """
    try:
        metrics = []
        
        # CPU Usage
        cpu_percent = psutil.cpu_percent(interval=1)
        metrics.append({
            "name": "CPU Usage",
            "value": cpu_percent,
            "unit": "%",
            "trend": "up" if cpu_percent > 75 else "down",
            "change": round(cpu_percent - psutil.cpu_percent(interval=0), 1)
        })

        # Memory Usage
        memory = psutil.virtual_memory()
        metrics.append({
            "name": "Memory Usage",
            "value": round(memory.percent, 1),
            "unit": "%",
            "trend": "up" if memory.percent > 80 else "down",
            "change": None
        })

        # Disk Usage
        disk = psutil.disk_usage('/')
        metrics.append({
            "name": "Disk Usage",
            "value": round(disk.percent, 1),
            "unit": "%",
            "trend": "up" if disk.percent > 85 else "down",
            "change": None
        })

        # Docker Container Count
        client = docker.from_env()
        container_count = len(client.containers.list(all=True))
        metrics.append({
            "name": "Active Containers",
            "value": container_count,
            "unit": "",
            "trend": "neutral",
            "change": None
        })

        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Log routes
@app.get("/api/logs/search", response_model=LogSearchResponse, tags=["Logs"])
async def search_logs(
    query: str = Query(None, description="Search query"),
    level: str = Query(None, description="Log level filter"),
    service: str = Query(None, description="Service filter"),
    start_time: str = Query(None, description="Start time (ISO format)"),
    end_time: str = Query(None, description="End time (ISO format)")
):
    """
    Search logs with various filters.
    """
    try:
        logs = []
        log_files = {
            'frontend': os.path.join(PROJECT_ROOT, 'frontend/logs/app.log'),
            'backend': os.path.join(PROJECT_ROOT, 'backend/logs/app.log'),
            'api': os.path.join(PROJECT_ROOT, 'api/logs/app.log')
        }

        for service_name, log_file in log_files.items():
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r') as f:
                        for line in f:
                            try:
                                log_entry = json.loads(line)
                                # Apply filters
                                if (
                                    (not query or query.lower() in log_entry['message'].lower()) and
                                    (not level or log_entry['level'] == level) and
                                    (not service or service_name == service)
                                ):
                                    logs.append({
                                        'timestamp': log_entry['timestamp'],
                                        'level': log_entry['level'],
                                        'message': log_entry['message'],
                                        'service': service_name
                                    })
                            except json.JSONDecodeError:
                                continue
                except Exception:
                    continue

        # Sort logs by timestamp
        logs.sort(key=lambda x: x['timestamp'], reverse=True)

        # Limit to last 1000 logs
        logs = logs[:1000]

        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 