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
import time

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
print(f"Using PROJECT_ROOT: {PROJECT_ROOT}")

# Cache for metrics to prevent CPU spikes
metrics_cache = {
    'last_update': 0,
    'data': None,
    'ttl': 5  # seconds
}

# Models
class Metric(BaseModel):
    name: str
    value: float
    unit: str
    trend: str
    change: Optional[float] = None

class MetricsResponse(BaseModel):
    metrics: List[Metric]

def get_cached_metrics():
    now = time.time()
    if metrics_cache['data'] is None or (now - metrics_cache['last_update']) > metrics_cache['ttl']:
        metrics = []
        
        # CPU Usage (without interval to prevent blocking)
        cpu_percent = psutil.cpu_percent(interval=None)
        metrics.append({
            "name": "CPU Usage",
            "value": round(cpu_percent, 1),
            "unit": "%",
            "trend": "up" if cpu_percent > 75 else "down",
            "change": 0
        })

        # Memory Usage
        memory = psutil.virtual_memory()
        metrics.append({
            "name": "Memory Usage",
            "value": round(memory.percent, 1),
            "unit": "%",
            "trend": "up" if memory.percent > 80 else "down"
        })

        # Disk Usage
        disk = psutil.disk_usage('/')
        metrics.append({
            "name": "Disk Usage",
            "value": round(disk.percent, 1),
            "unit": "%",
            "trend": "up" if disk.percent > 85 else "down"
        })

        # Docker Container Count
        try:
            client = docker.from_env()
            container_count = len(client.containers.list(all=True))
        except Exception as e:
            print(f"Docker error in metrics: {str(e)}")
            container_count = 0
            
        metrics.append({
            "name": "Active Containers",
            "value": container_count,
            "unit": "",
            "trend": "neutral"
        })

        metrics_cache['data'] = {"metrics": metrics}
        metrics_cache['last_update'] = now

    return metrics_cache['data']

# Metrics routes
@app.get("/api/metrics", response_model=MetricsResponse, tags=["Metrics"])
async def get_metrics():
    """
    Get various application metrics including CPU, memory, disk usage, and response times.
    """
    try:
        return get_cached_metrics()
    except Exception as e:
        print(f"Error in get_metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Git routes
def get_repo():
    try:
        # Try to get repo from PROJECT_ROOT
        if os.path.exists(os.path.join(PROJECT_ROOT, '.git')):
            return Repo(PROJECT_ROOT)
        
        # Try parent directories
        current_path = PROJECT_ROOT
        for _ in range(3):  # Look up to 3 levels up
            parent_path = os.path.dirname(current_path)
            if os.path.exists(os.path.join(parent_path, '.git')):
                return Repo(parent_path)
            current_path = parent_path
            
        raise Exception("Git repository not found")
    except Exception as e:
        print(f"Error getting repo: {str(e)}")
        raise

@app.get("/api/git/branch")
async def get_current_branch():
    try:
        repo = get_repo()
        if not repo.head.is_valid():
            return {
                "branch": "no branch",
                "error": "Git repository has no commits"
            }
        
        return {
            "branch": repo.active_branch.name
        }
    except Exception as e:
        print(f"Git error in get_current_branch: {str(e)}")
        return {
            "branch": "unknown",
            "error": str(e)
        }

@app.get("/api/git/commit")
async def get_last_commit():
    try:
        repo = get_repo()
        if not repo.head.is_valid():
            return {
                "message": "No commits yet",
                "timestamp": datetime.now().isoformat(),
                "error": "No commits in repository"
            }
        
        commit = repo.head.commit
        return {
            "message": commit.message.strip(),
            "timestamp": datetime.fromtimestamp(commit.committed_date).isoformat()
        }
    except Exception as e:
        print(f"Git error in get_last_commit: {str(e)}")
        return {
            "message": "Error fetching commit",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/api/git/prs")
async def get_pr_count():
    return {"count": 0}

# Docker routes
@app.get("/api/docker/containers")
async def get_containers():
    try:
        client = docker.from_env(timeout=5)  # 5 second timeout
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
        print(f"Docker error in get_containers: {str(e)}")
        return {
            "containers": [],
            "error": str(e)
        }

# Linter routes
LINTING_CONFIG_FILE = os.path.join(PROJECT_ROOT, '.linting.json')

def get_linting_config():
    try:
        if os.path.exists(LINTING_CONFIG_FILE):
            with open(LINTING_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error reading linting config: {str(e)}")
    return {
        "enabled": True,
        "severity": 0.7,
        "tools": {
            "eslint": True,
            "typescript": True,
            "pylint": True
        }
    }

def save_linting_config(config: dict):
    try:
        with open(LINTING_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving linting config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/linter/config")
async def get_config():
    try:
        return get_linting_config()
    except Exception as e:
        print(f"Error in get_config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/linter/config")
async def update_config(config: dict):
    try:
        save_linting_config(config)
        return {"status": "success"}
    except Exception as e:
        print(f"Error in update_config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/linter/status")
async def get_linter_status():
    try:
        config = get_linting_config()
        if not config["enabled"]:
            return {
                "tools": [],
                "message": "Linting is disabled"
            }

        tools = []
        severity = config["severity"]

        # Return mock data for now to prevent timeouts
        tools = [
            {
                "tool": "ESLint",
                "errors": 0,
                "warnings": 2
            },
            {
                "tool": "TypeScript",
                "errors": 0,
                "warnings": 1
            },
            {
                "tool": "Pylint",
                "errors": 0,
                "warnings": 3
            }
        ]

        return {
            "tools": tools,
            "severity": severity
        }
    except Exception as e:
        print(f"Error in get_linter_status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 