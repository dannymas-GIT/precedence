# Development Dashboard

A real-time development dashboard that provides insights into your project's Git status, Docker containers, and linting issues.

## Features

- 🔄 Real-time Git status (branch, commits, PRs)
- 🐳 Docker container monitoring
- ✨ Live linting status (ESLint, TypeScript, Pylint)
- 🌙 Interactive API documentation (Swagger/OpenAPI)
- 🌙 Dark/Light mode support
- 🔄 Auto-refresh data

## Installation

### As a Development Tool

```bash
npm install -g @devtools/dashboard
```

### In Your Project

1. Install as a dev dependency:
```bash
npm install --save-dev @devtools/dashboard
```

2. Add to your package.json scripts:
```json
{
  "scripts": {
    "dashboard": "dev-dashboard"
  }
}
```

## Usage

### Global Installation
```bash
dev-dashboard
```

### Project Installation
```bash
npm run dashboard
```

The dashboard will be available at http://localhost:5173

### API Documentation

The dashboard includes interactive API documentation:

- Swagger UI: http://localhost:3001/docs
- OpenAPI Spec: http://localhost:3001/openapi.json

Available APIs:
- Git Status API
  - Get current branch
  - Get last commit info
  - Get PR count
- Docker API
  - List container statuses
- Linting API
  - Get linting issues from multiple tools

## Docker Usage

You can also run the dashboard using Docker:

```bash
# Set the project root environment variable
export PROJECT_ROOT=$(pwd)

# Run with Docker Compose
docker-compose up
```

## Configuration

The dashboard can be configured using environment variables:

- `PROJECT_ROOT`: The root directory of your project (default: current directory)
- `VITE_API_URL`: The URL of the dashboard API (default: http://localhost:3001)

## Development

To start developing the dashboard:

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## API Documentation Development

To update the API documentation:

1. Update the Pydantic models in `api/main.py`
2. Add proper docstrings to your API endpoints
3. Use appropriate response models and tags
4. The Swagger UI will automatically update

## License

MIT
