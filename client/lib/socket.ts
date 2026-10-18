import { io, type Socket } from "socket.io-client";

/**
 * Socket.IO origin: NEXT_PUBLIC_API_BASE_URL without its `/api` suffix, or the page origin when the
 * configured base is relative (production routes /api and /socket.io to the API on the same host).
 */
export function socketOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (/^https?:\/\//i.test(base)) return base.replace(/\/api\/?$/, "");
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** Cookie-authenticated socket: the server authorises from the handshake cookie. */
export function connectSocket(): Socket {
  return io(socketOrigin(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}
