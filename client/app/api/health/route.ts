import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
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
    if (key.toLowerCase() !== "set-cookie") {
      to.headers.set(key, value);
    }
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
