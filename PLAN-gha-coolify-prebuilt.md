# Plan: GHA Build & Coolify Deployment (Pre-built Method)

## 1. Goal

Align with the "Science-Quest" reference project by using a static `.coolify-prebuilt.yml` file and simplifying the GitHub Actions workflow.

## 2. Architecture Overview

- **Source Code**: `main` branch.
- **Build System**: GitHub Actions (Ubuntu runners).
- **Registry**: GitHub Container Registry (GHCR).
- **Deployment Config**: `.coolify-prebuilt.yml` (in repo root).
- **Deployment Trigger**: Push to `deploy` branch (mirrored from main).

### The Flow

1. **Push to `main`**: Triggers GHA workflow.
2. **Conditional Build**: GHA builds `server` and `client` Docker images (if changed).
3. **Push**: Images pushed to `ghcr.io/qiiks/overwatch-account-share/<service>:latest`.
4. **GitOps Update**: GHA pushes the _current state of main_ to the `deploy` branch (`git push origin main:deploy --force`).
5. **Deploy**: Coolify (configured to watch `deploy` branch and use `.coolify-prebuilt.yml`) pulls the new images.

## 3. Implementation Steps

### Phase 1: Create `.coolify-prebuilt.yml`

Create a file that mimics `Science-Quest` but for this project:

- Service: `frontend` (Client) -> `ghcr.io/qiiks/overwatch-account-share/client:latest`
- Service: `backend` (Server) -> `ghcr.io/qiiks/overwatch-account-share/server:latest`
- Network: `coolify` (external)
- Env Vars: Pass-through from Coolify UI.

### Phase 2: Update Workflow (`.github/workflows/deploy.yml`)

- **Keep**: Build & Push logic (with the casing fix).
- **Remove**: `generate_compose.py` step.
- **Update**: Deployment step to simply push `main` to `deploy`.

### Phase 3: Cleanup

- Delete `.github/scripts/generate_compose.py`.

## 4. Verification

- Verify `deploy` branch content matches `main` after run.
- Verify Coolify pulls correct images.
