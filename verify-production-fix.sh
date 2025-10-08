#!/bin/bash

# Production Fix Verification Script
# This script verifies that the production deployment fixes are working correctly

echo "========================================="
echo "PRODUCTION FIX VERIFICATION SCRIPT"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URLs
FRONTEND_URL="https://overwatch.qiikzx.dev"
BACKEND_URL="https://bwgg4wow8kggc48kko0g080c.qiikzx.dev"

echo -e "\n${YELLOW}Testing Production URLs:${NC}"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"

# Test 1: Backend Health Check
echo -e "\n${YELLOW}Test 1: Backend Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    echo "Please check if the backend is deployed and running"
fi

# Test 2: Frontend Accessibility
echo -e "\n${YELLOW}Test 2: Frontend Accessibility${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Frontend not accessible (HTTP $FRONTEND_RESPONSE)${NC}"
    echo "Please check if the frontend is deployed"
fi

# Test 3: Check for localhost references in frontend
echo -e "\n${YELLOW}Test 3: Checking for localhost references${NC}"
FRONTEND_HTML=$(curl -s "$FRONTEND_URL")
if echo "$FRONTEND_HTML" | grep -q "localhost:5001"; then
    echo -e "${RED}✗ CRITICAL: Frontend still contains localhost:5001 references${NC}"
    echo "This means NEXT_PUBLIC_API_BASE_URL was not set at build time"
    echo "Solution: Set NEXT_PUBLIC_API_BASE_URL as a BUILD VARIABLE in Coolify"
else
    echo -e "${GREEN}✓ No localhost references found in frontend${NC}"
fi

# Test 4: CORS Configuration
echo -e "\n${YELLOW}Test 4: CORS Configuration${NC}"
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    "$BACKEND_URL/api/auth/me" 2>/dev/null | grep -i "access-control-allow-origin")

if echo "$CORS_RESPONSE" | grep -q "$FRONTEND_URL"; then
    echo -e "${GREEN}✓ CORS is properly configured${NC}"
else
    echo -e "${RED}✗ CORS not configured for $FRONTEND_URL${NC}"
    echo "Backend needs ALLOWED_ORIGINS environment variable set"
fi

# Test 5: API Endpoint Test
echo -e "\n${YELLOW}Test 5: API Endpoint Test${NC}"
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/me")
if [ "$API_TEST" = "401" ] || [ "$API_TEST" = "403" ]; then
    echo -e "${GREEN}✓ API endpoints are responding (HTTP $API_TEST - Auth required as expected)${NC}"
elif [ "$API_TEST" = "200" ]; then
    echo -e "${GREEN}✓ API endpoints are responding (HTTP 200)${NC}"
else
    echo -e "${RED}✗ API endpoint test failed (HTTP $API_TEST)${NC}"
fi

# Test 6: Check if frontend calls correct backend
echo -e "\n${YELLOW}Test 6: Frontend API Configuration Check${NC}"
echo "Checking if frontend JavaScript bundles contain correct API URL..."

# Try to fetch a JavaScript chunk and check for API URL
JS_FILES=$(curl -s "$FRONTEND_URL" | grep -oP '/_next/static/[^"]+\.js' | head -5)
FOUND_CORRECT_URL=false

for js_file in $JS_FILES; do
    JS_CONTENT=$(curl -s "$FRONTEND_URL$js_file")
    if echo "$JS_CONTENT" | grep -q "$BACKEND_URL"; then
        FOUND_CORRECT_URL=true
        break
    fi
done

if $FOUND_CORRECT_URL; then
    echo -e "${GREEN}✓ Frontend is configured with production backend URL${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify frontend API configuration from JavaScript bundles${NC}"
    echo "This might be normal if the bundles are minified"
fi

# Summary
echo -e "\n========================================="
echo -e "${YELLOW}VERIFICATION SUMMARY${NC}"
echo "========================================="

if [ "$HEALTH_RESPONSE" = "200" ] && [ "$FRONTEND_RESPONSE" = "200" ] && ! echo "$FRONTEND_HTML" | grep -q "localhost:5001"; then
    echo -e "${GREEN}✓ Production deployment appears to be WORKING${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Test login functionality manually"
    echo "2. Check browser console for any errors"
    echo "3. Verify WebSocket connections if applicable"
else
    echo -e "${RED}✗ Production deployment has ISSUES${NC}"
    echo -e "\n${YELLOW}Required Actions:${NC}"
    echo "1. In Coolify, set NEXT_PUBLIC_API_BASE_URL as a BUILD VARIABLE (not just environment variable)"
    echo "2. Ensure backend has correct ALLOWED_ORIGINS and FRONTEND_URL"
    echo "3. Rebuild and redeploy both services"
    echo -e "\n${YELLOW}See COOLIFY_DEPLOYMENT_GUIDE.md for detailed instructions${NC}"
fi

echo -e "\n========================================="
echo "Verification complete!"