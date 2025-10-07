#!/bin/bash

# Note: The client directory is no longer a submodule. The nested submodule within client/ must be managed separately.

MESSAGE=$1

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./sync-submodules.sh 'commit message'"
  exit 1
fi

echo "Syncing server submodule..."
cd server
git add .
if git diff --cached --quiet; then
  echo "No changes in server to commit."
else
  git commit -m "$MESSAGE"
  git push origin main
fi
cd ..

git submodule update --remote server

echo "Server submodule synced successfully."