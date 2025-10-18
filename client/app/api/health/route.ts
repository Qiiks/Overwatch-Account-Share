import { NextRequest, NextResponse } from "next/server";

const resolveBackendUrl = () => {
  // Validate that at least one API base URL is set
  if (!process.env.INTERNAL_API_BASE_URL && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error('Either INTERNAL_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variable is required but not set');
  }
  
  return process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
  const backendResponse = await fetch(`${resolveBackendUrl()}/api/health`, {
      method: "GET",
      headers: buildForwardHeaders(request),
      credentials: "include",
    });

    const body = await backendResponse.text();
    const response = new NextResponse(body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    copyHeaders(backendResponse, response);
    forwardCookies(backendResponse, response);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Health check proxy failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

function buildForwardHeaders(request: NextRequest): HeadersInit {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function copyHeaders(from: Response, to: NextResponse) {
  from.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (["set-cookie", "content-encoding", "content-length", "transfer-encoding"].includes(lowerKey)) {
      return;
    }
    to.headers.set(key, value);
  });
}

function forwardCookies(from: Response, to: NextResponse) {
  const setCookieHeaders: string[] = [];
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookieHeaders.push(value.replace(/\r?\n/g, "").trim());
    }
  });

  setCookieHeaders.forEach((cookie, index) => {
    if (index === 0) {
      to.headers.set("Set-Cookie", cookie);
    } else {
      to.headers.append("Set-Cookie", cookie);
    }
  });
}
