#!/bin/bash

MESSAGE=$1

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./sync-submodules.sh 'commit message'"
  exit 1
fi

echo "Syncing client submodule..."
cd client
git add .
if git diff --cached --quiet; then
  echo "No changes in client to commit."
else
  git commit -m "$MESSAGE"
  git push origin main
fi
cd ..

git submodule update --remote client

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

echo "Submodules synced successfully."