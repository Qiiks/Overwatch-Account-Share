import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

/**
 * Proxy handler for all API requests
 * This forwards requests to the backend and properly handles Set-Cookie headers
 * to solve the CSRF token cookie issue with Next.js rewrites
 */
async function proxyRequest(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
): Promise<NextResponse> {
  try {
    // Reconstruct the path from the catch-all segments
    const pathSegments = params.proxy || [];
    const path = `/api/${pathSegments.join('/')}`;
    
    // Get query string
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}${path}${queryString}`;

    // Prepare headers to forward
    const headers = new Headers();
    
    // Copy relevant headers from the incoming request
    request.headers.forEach((value, key) => {
      // Skip host and connection headers as they'll be set automatically
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Prepare the request body
    let body: BodyInit | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // For requests with a body, we need to read it
      body = await request.text();
    }

    // Make the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      credentials: 'include',
    });

    // Debug: log backend response headers
    console.log('[Proxy] Backend response headers:');
    backendResponse.headers.forEach((value, key) => {
      console.log(`[Proxy] ${key}: ${value}`);
    });

    // Read the response body
    const responseBody = await backendResponse.text();

    // Create the response to send back to the client
    const response = new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    // Forward all headers from backend response
    backendResponse.headers.forEach((value, key) => {
      // Don't copy set-cookie here, we'll handle it separately
      if (key.toLowerCase() !== 'set-cookie') {
        response.headers.set(key, value);
      }
    });

    // Handle Set-Cookie headers - forward them directly to the client
    // This ensures cookies work correctly with the Next.js App Router
    const setCookieHeaders: string[] = [];
    
    // Get all Set-Cookie headers (there can be multiple)
    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Clean up any malformed line breaks in the cookie string
        const cleanedCookie = value.replace(/\n/g, '').replace(/\r/g, '').trim();
        setCookieHeaders.push(cleanedCookie);
      }
    });
    
    // Set all cookies in the response
    if (setCookieHeaders.length > 0) {
      console.log('[Proxy] Setting', setCookieHeaders.length, 'cookies from backend');
      
      // Use the append method to add multiple Set-Cookie headers
      setCookieHeaders.forEach((cookieString, index) => {
        if (index === 0) {
          response.headers.set('Set-Cookie', cookieString);
        } else {
          response.headers.append('Set-Cookie', cookieString);
        }
        console.log('[Proxy] Cookie set:', cookieString.substring(0, 50) + '...');
      });
    }

    return response;
  } catch (error) {
    console.error('[Proxy] Request failed:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  return proxyRequest(request, context);
}