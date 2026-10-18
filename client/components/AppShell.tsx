"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { cn } from "@/lib/utils";

/**
 * DISPATCH background: two static repeating-linear-gradient grids (72px / 288px) plus the
 * composited sweep band. No canvas, no JS, no per-page mount. `sweep` is for the landing hero
 * only — every other route ships the grids alone.
 */
export function PageBackground({ sweep = false }: { sweep?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -inset-px bg-[image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute -inset-px bg-[image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:288px_288px] [-webkit-mask-image:radial-gradient(120%_90%_at_70%_0%,#000_25%,transparent_75%)] [mask-image:radial-gradient(120%_90%_at_70%_0%,#000_25%,transparent_75%)]" />
        {sweep && (
          <div className="absolute inset-y-0 left-0 w-[340px] animate-sweep bg-[image:linear-gradient(90deg,transparent,rgba(203,239,74,.05)_45%,rgba(203,239,74,.09)_50%,rgba(203,239,74,.05)_55%,transparent)] will-change-transform motion-reduce:hidden">
            <div className="absolute inset-y-0 left-[168px] w-px bg-[image:linear-gradient(180deg,transparent,rgba(203,239,74,.5),transparent)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-[image:radial-gradient(130%_100%_at_50%_0%,transparent_55%,rgba(0,0,0,.55))]" />
      </div>

      {/* console frame: registration ticks at the four corners */}
      <div
        className="pointer-events-none fixed inset-3 z-1 border border-line"
        aria-hidden="true"
      >
        <i className="absolute -top-px -left-px size-2.5 border border-r-0 border-b-0 border-line-2" />
        <i className="absolute -top-px -right-px size-2.5 border border-b-0 border-l-0 border-line-2" />
        <i className="absolute -bottom-px -left-px size-2.5 border border-t-0 border-r-0 border-line-2" />
        <i className="absolute -bottom-px -right-px size-2.5 border border-t-0 border-l-0 border-line-2" />
      </div>
    </>
  );
}

/**
 * Mounted once in app/layout.tsx. Supplies the background, the header (absent on the auth
 * screens) and the content container, so pages render content only — no per-page
 * `min-h-screen bg-… pt-24` scaffold and no per-page background.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/login" || pathname === "/register";

  return (
    <>
      <PageBackground sweep={pathname === "/"} />
      <div className="relative z-10 flex min-h-dvh flex-col">
        {!bare && <Navigation />}
        <main
          className={cn(
            "flex flex-1 flex-col px-[var(--pad-x)]",
            !bare && "pb-12",
          )}
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
