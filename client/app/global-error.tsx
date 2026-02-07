"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error(error);

    // Check if the error is related to missing server implementation (deployment skew)
    // "Failed to find Server Action" is a specific Next.js error when the improved security skew protection fails
    // or when the build ID mismatches and the client tries to invoke an old action ID.
    if (error.message.includes("Failed to find Server Action")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-muted-foreground">
            We've just updated the application. Please reload the page to get
            the latest version.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
