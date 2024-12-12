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
import re

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

# New models for Git commit endpoints
class CommitPreview(BaseModel):
    message: str
    changes: List[str]

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

def get_changed_files(repo: Repo) -> List[str]:
    """Get list of changed files with their status."""
    changed_files = []
    try:
        # Get both staged and unstaged changes
        diff_index = repo.index.diff(None)  # Unstaged changes
        staged_diff = repo.index.diff('HEAD')  # Staged changes
        
        # Add unstaged changes
        for diff in diff_index:
            path = diff.a_path or diff.b_path
            if path:
                changed_files.append(path)
        
        # Add staged changes
        for diff in staged_diff:
            path = diff.a_path or diff.b_path
            if path and path not in changed_files:
                changed_files.append(path)
                
        # Add untracked files
        untracked = repo.untracked_files
        changed_files.extend(untracked)
        
        return sorted(set(changed_files))  # Remove duplicates and sort
    except Exception as e:
        print(f"Error getting changed files: {str(e)}")
        return []

def analyze_changes(repo: Repo, files: List[str]) -> List[str]:
    """Analyze changes in files to generate commit message parts."""
    changes = []
    
    for file in files:
        try:
            # Get file extension
            ext = os.path.splitext(file)[1].lower()
            
            if ext in ['.py', '.ts', '.tsx', '.js', '.jsx']:
                # For code files, try to get function/class changes
                diff = repo.git.diff(file)
                
                # Look for added/modified functions, classes, or interfaces
                patterns = [
                    r'^\+.*\bdef\s+(\w+)',  # Python functions
                    r'^\+.*\bclass\s+(\w+)',  # Python/TypeScript classes
                    r'^\+.*\bfunction\s+(\w+)',  # JavaScript/TypeScript functions
                    r'^\+.*\bconst\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>',  # Arrow functions
                    r'^\+.*\binterface\s+(\w+)',  # TypeScript interfaces
                    r'^\+.*\btype\s+(\w+)\s*=',  # TypeScript types
                ]
                
                changes_found = []
                for pattern in patterns:
                    matches = re.finditer(pattern, diff, re.MULTILINE)
                    changes_found.extend(match.group(1) for match in matches)
                
                if changes_found:
                    changes.append(f"- Update {file}: {', '.join(changes_found)}")
                else:
                    # Try to get the actual changes
                    diff_lines = [line for line in diff.split('\n') if line.startswith('+') and not line.startswith('+++')]
                    if diff_lines:
                        # Get meaningful changes, excluding whitespace-only changes
                        meaningful_changes = [line[1:].strip() for line in diff_lines if line[1:].strip()]
                        if meaningful_changes:
                            summary = meaningful_changes[0][:50]  # Take first meaningful change as summary
                            changes.append(f"- Update {file}: {summary}")
                        else:
                            changes.append(f"- Update {file}")
                    else:
                        changes.append(f"- Update {file}")
            else:
                # For other files, try to get a summary of changes
                try:
                    diff = repo.git.diff(file)
                    diff_lines = [line for line in diff.split('\n') if line.startswith('+') and not line.startswith('+++')]
                    if diff_lines:
                        summary = diff_lines[0][1:].strip()[:50]  # Take first line as summary
                        changes.append(f"- Update {file}: {summary}")
                    else:
                        changes.append(f"- Update {file}")
                except:
                    changes.append(f"- Update {file}")
                
        except Exception as e:
            print(f"Error analyzing {file}: {str(e)}")
            changes.append(f"- Update {file}")
    
    return changes

@app.get("/api/git/commit/preview", response_model=CommitPreview)
async def preview_feature_commit():
    """Generate a preview of the feature commit."""
    try:
        repo = get_repo()
        changed_files = get_changed_files(repo)
        
        if not changed_files:
            raise HTTPException(status_code=400, detail="No changes to commit")
        
        # Analyze changes to generate commit message
        changes = analyze_changes(repo, changed_files)
        
        # Generate commit message
        if len(changes) == 1:
            # Single file change - use its description
            primary_change = changes[0].replace('- Update ', '')
            message = f"feat: {primary_change}"
        else:
            # Multiple files - create a summary
            main_files = [os.path.basename(f) for f in changed_files[:3]]
            if len(changed_files) > 3:
                message = f"feat: update {', '.join(main_files)} and {len(changed_files) - 3} more files"
            else:
                message = f"feat: update {', '.join(main_files)}"
        
        return CommitPreview(
            message=message,
            changes=changes
        )
    except Exception as e:
        print(f"Error generating commit preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/commit/feature")
async def create_feature_commit():
    """Create a feature commit with the generated message."""
    try:
        repo = get_repo()
        preview = await preview_feature_commit()
        
        # Ensure Git user is configured
        git_user_name = os.getenv('GIT_USER_NAME')
        git_user_email = os.getenv('GIT_USER_EMAIL')
        
        if not git_user_name or not git_user_email:
            raise HTTPException(
                status_code=500,
                detail="Git user not configured. Please set GIT_USER_NAME and GIT_USER_EMAIL environment variables."
            )
        
        # Configure Git user locally for this repository
        repo.config_writer().set_value("user", "name", git_user_name).release()
        repo.config_writer().set_value("user", "email", git_user_email).release()
        
        # Stage all changes
        repo.git.add('.')
        
        # Create commit with full message
        full_message = preview.message + "\n\n" + "\n".join(preview.changes)
        commit = repo.index.commit(full_message)
        
        return {
            "status": "success",
            "message": full_message,
            "commit_hash": commit.hexsha
        }
    except Exception as e:
        print(f"Error creating feature commit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# New Git operation endpoints
@app.post("/api/git/push")
async def push_changes():
    """Push changes to remote repository."""
    try:
        repo = get_repo()
        if not repo.head.is_valid():
            raise HTTPException(status_code=400, detail="No commits to push")
        
        # Get current branch
        branch = repo.active_branch
        
        # Check if remote exists
        if not repo.remotes:
            raise HTTPException(status_code=400, detail="No remote repository configured")
        
        # Push to remote
        repo.remotes.origin.push(branch.name)
        
        return {"status": "success", "message": f"Successfully pushed to {branch.name}"}
    except Exception as e:
        print(f"Error pushing changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/pull")
async def pull_changes():
    """Pull changes from remote repository."""
    try:
        repo = get_repo()
        if not repo.remotes:
            raise HTTPException(status_code=400, detail="No remote repository configured")
        
        # Pull from remote
        repo.remotes.origin.pull()
        
        return {"status": "success", "message": "Successfully pulled changes"}
    except Exception as e:
        print(f"Error pulling changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/stash")
async def stash_changes():
    """Stash current changes."""
    try:
        repo = get_repo()
        repo.git.stash('save')
        return {"status": "success", "message": "Changes stashed successfully"}
    except Exception as e:
        print(f"Error stashing changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/stash/pop")
async def pop_stashed_changes():
    """Pop most recent stashed changes."""
    try:
        repo = get_repo()
        repo.git.stash('pop')
        return {"status": "success", "message": "Stashed changes applied successfully"}
    except Exception as e:
        print(f"Error popping stashed changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/branches")
async def get_branches():
    """Get list of all branches."""
    try:
        repo = get_repo()
        branches = [branch.name for branch in repo.heads]
        return {"branches": branches}
    except Exception as e:
        print(f"Error getting branches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/branch")
async def create_branch(name: str):
    """Create a new branch."""
    try:
        repo = get_repo()
        current = repo.active_branch
        new_branch = repo.create_head(name)
        new_branch.checkout()
        return {
            "status": "success",
            "message": f"Created and switched to branch {name}",
            "previous_branch": current.name
        }
    except Exception as e:
        print(f"Error creating branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/checkout")
async def checkout_branch(branch: str):
    """Switch to specified branch."""
    try:
        repo = get_repo()
        current = repo.active_branch
        repo.heads[branch].checkout()
        return {
            "status": "success",
            "message": f"Switched to branch {branch}",
            "previous_branch": current.name
        }
    except Exception as e:
        print(f"Error switching branch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 