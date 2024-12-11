#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${RED}No changes to commit${NC}"
    exit 1
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only)

# Generate summary of changes
SUMMARY=""

for file in $CHANGED_FILES; do
    # Get file extension
    ext="${file##*.}"
    
    case $ext in
        "py")
            # For Python files, get function/class changes
            CHANGES=$(git diff $file | grep "^+.*def\|^+.*class" | sed 's/^+[[:space:]]*//' | sed 's/def //' | sed 's/class //' | tr '\n' ',' | sed 's/,$//')
            if [ ! -z "$CHANGES" ]; then
                SUMMARY="$SUMMARY\n- Update $file: $CHANGES"
            fi
            ;;
        "tsx"|"ts")
            # For TypeScript files, get component/function changes
            CHANGES=$(git diff $file | grep "^+.*function\|^+.*const.*=.*=>\|^+.*interface\|^+.*type" | sed 's/^+[[:space:]]*//' | tr '\n' ',' | sed 's/,$//')
            if [ ! -z "$CHANGES" ]; then
                SUMMARY="$SUMMARY\n- Update $file: $CHANGES"
            fi
            ;;
        *)
            # For other files, just mention the file was changed
            SUMMARY="$SUMMARY\n- Update $file"
            ;;
    esac
done

# Create commit message
COMMIT_MSG="feat: $(echo $SUMMARY | head -n 1 | sed 's/- Update //')"

# Show the proposed commit message
echo -e "${YELLOW}Proposed commit message:${NC}"
echo -e "$COMMIT_MSG"
echo -e "${YELLOW}Changes summary:${NC}"
echo -e "$SUMMARY"

# Prompt for confirmation
echo -e "${GREEN}Proceed with commit? [Y/n]${NC}"
read confirm

if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
    echo -e "${RED}Commit cancelled${NC}"
    exit 1
fi

# Stage all changes
git add .

# Create commit with message
git commit -m "$COMMIT_MSG"

echo -e "${GREEN}Successfully created feature commit:${NC}"
echo "$COMMIT_MSG" 