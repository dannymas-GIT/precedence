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
class Metric(BaseModel):
    name: str
    value: float
    unit: str
    trend: str
    change: Optional[float] = None

class MetricsResponse(BaseModel):
    metrics: List[Metric]

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
        prev_cpu = psutil.cpu_percent(interval=0)
        cpu_change = round(cpu_percent - prev_cpu, 1)
        metrics.append({
            "name": "CPU Usage",
            "value": round(cpu_percent, 1),
            "unit": "%",
            "trend": "up" if cpu_percent > 75 else "down",
            "change": cpu_change
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
        except:
            container_count = 0
            
        metrics.append({
            "name": "Active Containers",
            "value": container_count,
            "unit": "",
            "trend": "neutral"
        })

        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Git routes
@app.get("/api/git/branch")
async def get_current_branch():
    try:
        # Print debug information
        print(f"Checking Git repository at {PROJECT_ROOT}")
        print(f"Directory contents: {os.listdir(PROJECT_ROOT)}")
        print(f"Git directory exists: {os.path.exists(os.path.join(PROJECT_ROOT, '.git'))}")
        
        repo = Repo(PROJECT_ROOT)
        if not repo.head.is_valid():
            print("Git head is not valid")
            return {
                "branch": "no branch",
                "error": "Git repository has no commits"
            }
        
        branch_name = repo.active_branch.name
        print(f"Current branch: {branch_name}")
        return {
            "branch": branch_name
        }
    except (GitCommandError, Exception) as e:
        error_msg = f"Git error in get_current_branch: {str(e)}"
        print(error_msg)
        return {
            "branch": "unknown",
            "error": error_msg
        }

@app.get("/api/git/commit")
async def get_last_commit():
    try:
        # Print debug information
        print(f"Checking Git repository at {PROJECT_ROOT}")
        print(f"Git directory exists: {os.path.exists(os.path.join(PROJECT_ROOT, '.git'))}")
        
        repo = Repo(PROJECT_ROOT)
        if not repo.head.is_valid():
            print("Git head is not valid")
            return {
                "message": "No commits yet",
                "timestamp": datetime.now().isoformat(),
                "error": "No commits in repository"
            }
        
        commit = repo.head.commit
        commit_info = {
            "message": commit.message.strip(),
            "timestamp": datetime.fromtimestamp(commit.committed_date).isoformat()
        }
        print(f"Last commit: {commit_info}")
        return commit_info
    except (GitCommandError, Exception) as e:
        error_msg = f"Git error in get_last_commit: {str(e)}"
        print(error_msg)
        return {
            "message": "No commits found",
            "timestamp": datetime.now().isoformat(),
            "error": error_msg
        }

@app.get("/api/git/prs")
async def get_pr_count():
    # This is a placeholder. For actual PR count, you'd need to use GitHub API
    return {"count": 0}

# Docker routes
@app.get("/api/docker/containers")
async def get_containers():
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
    except docker.errors.DockerException as e:
        print(f"Docker error: {str(e)}")
        return {
            "containers": [],
            "error": "Could not connect to Docker daemon. Make sure Docker is running and accessible."
        }
    except Exception as e:
        print(f"Unexpected error in get_containers: {str(e)}")
        return {
            "containers": [],
            "error": "An unexpected error occurred while fetching container information."
        }

# Linter routes
LINTING_CONFIG_FILE = os.path.join(PROJECT_ROOT, '.linting.json')

def get_linting_config():
    try:
        if os.path.exists(LINTING_CONFIG_FILE):
            with open(LINTING_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "enabled": True,
        "severity": 0.7,  # 0.0 to 1.0, higher means stricter
        "tools": {
            "eslint": True,
            "typescript": True,
            "pylint": True
        }
    }

def save_linting_config(config: dict):
    with open(LINTING_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def run_eslint(path: str) -> Dict:
    try:
        result = subprocess.run(
            ['npx', 'eslint', path, '--format', 'json'],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT
        )
        if result.stdout:
            issues = json.loads(result.stdout)
            return {
                "errors": sum(1 for file in issues for msg in file['messages'] if msg['severity'] == 2),
                "warnings": sum(1 for file in issues for msg in file['messages'] if msg['severity'] == 1)
            }
    except Exception as e:
        print(f"ESLint error: {str(e)}")
    return {"errors": 0, "warnings": 0}

def run_tsc(path: str) -> Dict:
    try:
        result = subprocess.run(
            ['npx', 'tsc', '--noEmit'],
            capture_output=True,
            text=True,
            cwd=path
        )
        errors = len([line for line in result.stderr.split('\n') if 'error' in line.lower()])
        return {"errors": errors, "warnings": 0}
    except Exception as e:
        print(f"TypeScript error: {str(e)}")
    return {"errors": 0, "warnings": 0}

def run_pylint(path: str) -> Dict:
    try:
        result = subprocess.run(
            ['pylint', path, '--output-format=json'],
            capture_output=True,
            text=True
        )
        if result.stdout:
            issues = json.loads(result.stdout)
            return {
                "errors": sum(1 for issue in issues if issue['type'] in ['error', 'fatal']),
                "warnings": sum(1 for issue in issues if issue['type'] in ['warning', 'convention', 'refactor'])
            }
    except Exception as e:
        print(f"Pylint error: {str(e)}")
    return {"errors": 0, "warnings": 0}

@app.get("/api/linter/config")
async def get_config():
    return get_linting_config()

@app.post("/api/linter/config")
async def update_config(config: dict):
    save_linting_config(config)
    return {"status": "success"}

@app.get("/api/linter/status")
async def get_linter_status():
    config = get_linting_config()
    if not config["enabled"]:
        return {
            "tools": [],
            "message": "Linting is disabled"
        }

    tools = []
    severity = config["severity"]

    if config["tools"]["eslint"]:
        frontend_results = run_eslint(os.path.join(PROJECT_ROOT, 'frontend/src'))
        dashboard_results = run_eslint(os.path.join(PROJECT_ROOT, 'dashboard/src'))
        tools.append({
            "name": "ESLint",
            "errors": int(frontend_results["errors"] + dashboard_results["errors"] * severity),
            "warnings": int(frontend_results["warnings"] + dashboard_results["warnings"] * severity)
        })

    if config["tools"]["typescript"]:
        frontend_ts = run_tsc(os.path.join(PROJECT_ROOT, 'frontend'))
        dashboard_ts = run_tsc(os.path.join(PROJECT_ROOT, 'dashboard'))
        tools.append({
            "name": "TypeScript",
            "errors": int((frontend_ts["errors"] + dashboard_ts["errors"]) * severity),
            "warnings": 0
        })

    if config["tools"]["pylint"]:
        backend_results = run_pylint(os.path.join(PROJECT_ROOT, 'backend'))
        dashboard_api_results = run_pylint(os.path.join(PROJECT_ROOT, 'dashboard-api'))
        tools.append({
            "name": "Pylint",
            "errors": int((backend_results["errors"] + dashboard_api_results["errors"]) * severity),
            "warnings": int((backend_results["warnings"] + dashboard_api_results["warnings"]) * severity)
        })

    return {
        "tools": tools,
        "severity": severity
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 