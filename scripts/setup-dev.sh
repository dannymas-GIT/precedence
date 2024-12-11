#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the root directory (should have frontend/ and backend/)
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}Please run this script from the project root directory${NC}"
    exit 1
fi

# Create and switch to development branch
echo -e "${YELLOW}Creating and switching to development branch...${NC}"
git checkout -b development

# Remove empty files causing linter errors
echo -e "${YELLOW}Cleaning up empty files...${NC}"
rm -f frontend/src/index.tsx
rm -f frontend/src/hooks/useSearch.test.ts

# Stage all files
echo -e "${YELLOW}Staging files...${NC}"
git add .

# Create initial commit
echo -e "${YELLOW}Creating initial commit...${NC}"
git commit -m "feat: initial project setup

- Add frontend React/TypeScript setup
- Add backend FastAPI setup
- Add Docker configuration
- Add development scripts"

# Push to remote with upstream tracking
echo -e "${YELLOW}Pushing to remote...${NC}"
git push -u origin development

echo -e "${GREEN}Development branch setup complete!${NC}"
echo -e "You are now on the 'development' branch"
git status 