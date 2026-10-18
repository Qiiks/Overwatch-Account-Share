"use client"

import { useRouter } from "next/navigation"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <p className="font-mono text-2xs tracking-label text-ink-3 uppercase">
        Error · 404 · route not found
      </p>
      <p className="mt-4 font-mono text-display tabular-nums text-ink">404</p>
      <h1 className="mt-4 text-lg text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-2">
        The page you're looking for doesn't exist or has been moved to a more
        secure location.
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        <button
          onClick={() => router.push("/")}
          className="h-[34px] rounded-lg border border-signal bg-signal px-3 text-sm font-semibold text-signal-ink transition-colors duration-[var(--dur-2)] ease-standard hover:bg-accent"
        >
          Go home
        </button>
        <button
          onClick={() => router.back()}
          className="h-[34px] rounded-lg border border-line-2 px-3 text-sm font-semibold text-ink-2 transition-colors duration-[var(--dur-2)] ease-standard hover:bg-white/5 hover:text-ink"
        >
          Go back
        </button>
      </div>

      <p className="mt-6 w-full border-t border-line pt-4 font-mono text-2xs text-ink-3">
        If you believe this is an error, please contact our support team.
      </p>
    </div>
  )
}
