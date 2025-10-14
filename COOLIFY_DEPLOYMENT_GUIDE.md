# Coolify Production Deployment Guide

## CRITICAL: Next.js Build-Time Environment Variables

**THE ROOT CAUSE OF PRODUCTION FAILURES:**
Next.js requires `NEXT_PUBLIC_*` environment variables to be available at **BUILD TIME**, not runtime. These variables are embedded into the JavaScript bundle during the build process.

## Environment Variables Configuration

### For the Frontend Service (client)

In Coolify, you MUST set these as **BUILD VARIABLES** (not just runtime environment variables):

```env
# BUILD VARIABLES (CRITICAL - Must be set in Coolify's Build Variables section)
NEXT_PUBLIC_API_BASE_URL=https://bwgg4wow8kggc48kko0g080c.qiikzx.dev
NEXT_PUBLIC_FRONTEND_URL=https://overwatch.qiikzx.dev
# Optional but recommended runtime variable for server-to-server calls inside the Docker network
INTERNAL_API_BASE_URL=http://server:5001
```

### For the Backend Service (server)

These can be regular environment variables:

```env
NODE_ENV=production
PORT=5001
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
JWT_SECRET=<your-jwt-secret>
ENCRYPTION_SECRET=<your-encryption-secret>
OAUTH_STATE_SECRET=<your-oauth-state-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://bwgg4wow8kggc48kko0g080c.qiikzx.dev/api/google-auth/otp/callback
FRONTEND_URL=https://overwatch.qiikzx.dev
ALLOWED_ORIGINS=https://overwatch.qiikzx.dev,https://bwgg4wow8kggc48kko0g080c.qiikzx.dev
LOG_LEVEL=info
```

## Deployment Steps in Coolify

### 1. Deploy Backend Service First

1. Create a new service in Coolify
2. Set source as Git repository (server submodule)
3. Set build pack to Dockerfile
4. Configure environment variables (see above)
5. Set public domain: `bwgg4wow8kggc48kko0g080c.qiikzx.dev`
6. Deploy and verify it's accessible

### 2. Deploy Frontend Service

1. Create a new service in Coolify
2. Set source as Git repository (client submodule)
3. Set build pack to Dockerfile
4. **CRITICAL**: In Coolify's service settings:
   - Navigate to "Build Variables" section
   - Add `NEXT_PUBLIC_API_BASE_URL=https://bwgg4wow8kggc48kko0g080c.qiikzx.dev`
   - Add `NEXT_PUBLIC_FRONTEND_URL=https://overwatch.qiikzx.dev`
5. Set public domain: `overwatch.qiikzx.dev`
6. Deploy

### 3. Using Docker Compose in Coolify (Alternative)

If using the docker-compose.yml file:

1. Create a new service in Coolify
2. Select "Docker Compose" as the build pack
3. **CRITICAL**: Set these environment variables in Coolify:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://bwgg4wow8kggc48kko0g080c.qiikzx.dev
   NEXT_PUBLIC_FRONTEND_URL=https://overwatch.qiikzx.dev
   ```
4. These will be passed to the docker-compose build process

## Verification Steps

After deployment, verify:

1. **Backend Health Check**:
   ```bash
   curl https://bwgg4wow8kggc48kko0g080c.qiikzx.dev/health
   ```

2. **Frontend API Configuration**:
   - Open browser developer tools
   - Navigate to https://overwatch.qiikzx.dev
   - Check Network tab - API calls should go to `https://bwgg4wow8kggc48kko0g080c.qiikzx.dev`
   - NOT to `http://localhost:5001`

3. **CORS Headers**:
   ```bash
   curl -H "Origin: https://overwatch.qiikzx.dev" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        https://bwgg4wow8kggc48kko0g080c.qiikzx.dev/api/auth/me
   ```

## Common Issues and Solutions

### Issue: "No available server" error
**Cause**: Frontend is trying to connect to localhost:5001 instead of production backend
**Solution**: Ensure `NEXT_PUBLIC_API_BASE_URL` is set as a BUILD VARIABLE in Coolify

### Issue: CORS errors
**Cause**: Backend not configured with correct allowed origins
**Solution**: Verify `ALLOWED_ORIGINS` and `FRONTEND_URL` environment variables in backend

### Issue: 404 on API routes
**Cause**: Incorrect API base URL or route registration mismatch
**Solution**: Check that all routes are correctly registered and API base URL includes protocol

## Docker Build Verification

To verify the Docker images build correctly with production URLs:

```bash
# Build with production URLs
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://bwgg4wow8kggc48kko0g080c.qiikzx.dev \
  --build-arg NEXT_PUBLIC_FRONTEND_URL=https://overwatch.qiikzx.dev \
  -t overwatch-client ./client

# Verify the build embedded the correct URLs
docker run --rm overwatch-client sh -c "grep -r 'localhost:5001' /usr/src/app/.next" || echo "Good: No localhost references found"
```

## Emergency Rollback

If deployment fails:

1. In Coolify, navigate to the service
2. Click on "Deployments" tab
3. Find the last working deployment
4. Click "Redeploy" on that version

## Post-Deployment Checklist

- [ ] Backend responds to health check
- [ ] Frontend loads without errors
- [ ] Login functionality works
- [ ] API calls use production backend URL
- [ ] No CORS errors in browser console
- [ ] WebSocket connections work (if applicable)
- [ ] All environment variables are properly set
- [ ] SSL certificates are valid

## Contact for Issues

If following this guide doesn't resolve the issue, check:
1. Coolify logs for build errors
2. Container logs for runtime errors
3. Browser console for client-side errors
4. Network tab for API call issues

Remember: **BUILD VARIABLES are CRITICAL for Next.js applications!**