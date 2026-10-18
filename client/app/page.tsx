"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { connectSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

/** The relay, stated as the mechanism it is — no specimen codes, no invented figures. */
const TAPE = [
  {
    channel: "MAIL",
    tone: "text-chan-mail",
    body: "the Battle.net code lands in the linked mailbox",
  },
  {
    channel: "RELAY",
    tone: "text-signal",
    body: "pushed over the socket to every member who holds access",
  },
  {
    channel: "LOGIN",
    tone: "text-ink",
    body: "the member signs in and the code is spent",
  },
];

const RUNDOWN = [
  {
    title: "Link the mailbox",
    body: "The Gmail that receives Battle.net codes. Revocable at any time, and members never see it.",
  },
  {
    title: "Add the account",
    body: "Store the Battle.net tag and credentials once. Encrypted at rest, masked everywhere else.",
  },
  {
    title: "Share the access",
    body: "Grant a member by name. Nothing is copied out and the mailbox stays yours.",
  },
  {
    title: "Catch the code",
    body: "New mail arrives and the code lands in their session. No screenshots, no DMs.",
  },
];

export default function IndexPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const isLoggedIn = !!user;

  // Real presence: the anonymous socket is allowed for the count only.
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("requestOnlineUsers");
    });
    socket.on("onlineUsers", (count: number) => setOnlineUsersCount(count));
    socket.on("connectionSuccess", (data: { onlineUsers: number }) =>
      setOnlineUsersCount(data.onlineUsers),
    );
    socket.on("disconnect", () => {
      setConnected(false);
      setOnlineUsersCount(0);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <section className="grid items-start gap-8 pt-8 pb-10 lg:grid-cols-[minmax(0,1.22fr)_minmax(380px,.78fr)] lg:gap-14 lg:pt-13">
        <div>
          <h1 className="mb-5 text-display font-bold tracking-display uppercase text-balance">
            Share the
            <br />
            account, not
            <br />
            <span className="text-ink-3">the mailbox.</span>
          </h1>
          <p className="mb-6 max-w-[52ch] text-lg text-ink-2">
            Owners keep the keys. A linked Gmail mailbox relays the Battle.net
            login code the moment it lands, so a member gets into the session
            without ever seeing your email.
          </p>

          <p className="mb-6 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-mono text-xs tracking-[0.05em] text-ink-3 uppercase">
            <span className="flex items-center gap-2 text-ink-2">
              <span
                className={cn(
                  "size-[7px]",
                  connected
                    ? "bg-signal motion-safe:animate-led"
                    : "bg-ink-3",
                )}
                aria-hidden="true"
              />
              <b className="font-medium">{onlineUsersCount}</b> online now
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {settings?.allow_registration
                ? "registration open"
                : "accounts by approval"}
            </span>
          </p>

          <div className="flex flex-wrap gap-3">
            {!isLoggedIn ? (
              <>
                {settings?.allow_registration && (
                  <GlassButton
                    size="lg"
                    variant="primary"
                    onClick={() => router.push("/register")}
                  >
                    Create account
                    <ArrowRight />
                  </GlassButton>
                )}
                <GlassButton
                  size="lg"
                  variant="ghost"
                  onClick={() => router.push("/login")}
                >
                  Log in
                </GlassButton>
              </>
            ) : (
              <>
                <GlassButton
                  size="lg"
                  variant="primary"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to dashboard
                  <ArrowRight />
                </GlassButton>
                {isAdmin && (
                  <GlassButton
                    size="lg"
                    variant="ghost"
                    onClick={() => router.push("/admin")}
                  >
                    Admin console
                  </GlassButton>
                )}
              </>
            )}
            <GlassButton size="lg" variant="ghost" asChild>
              <a href="#how">
                How the relay works
                <ArrowRight />
              </a>
            </GlassButton>
          </div>
        </div>

        <GlassCard>
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
            <span className="font-mono text-xs tracking-label text-ink-2 uppercase">
              Relay
            </span>
            <span className="ml-auto font-mono text-xs text-ink-3">
              battle.net login
            </span>
          </div>

          <div className="border-b border-line bg-panel-2 px-3.5 py-4">
            <p className="mb-2 flex items-center gap-2 font-mono text-2xs tracking-label text-ink-3 uppercase">
              <Lock size={12} aria-hidden="true" />
              Login code — masked until you hold access
            </p>
            <div className="flex items-center gap-4" aria-hidden="true">
              <span className="flex gap-1.5">
                <span className="size-4 bg-ink-2" />
                <span className="size-4 bg-ink-2" />
                <span className="size-4 bg-ink-2" />
              </span>
              <span className="flex gap-1.5">
                <span className="size-4 bg-ink-2" />
                <span className="size-4 bg-ink-2" />
                <span className="size-4 bg-ink-2" />
              </span>
            </div>
            <span className="sr-only">
              The login code stays hidden until you hold access.
            </span>
            <p className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 font-mono text-2xs tracking-[0.05em] text-ink-3 uppercase">
              <span>delivered live</span>
              <span>scoped to members</span>
              <span>spent on sign-in</span>
            </p>
          </div>

          <ol className="py-1.5">
            {TAPE.map((event) => (
              <li
                key={event.channel}
                className="grid grid-cols-[54px_1fr] items-baseline gap-x-2.5 gap-y-1 px-3.5 py-2 font-mono text-xs text-ink-2"
              >
                <span className={cn("text-2xs tracking-[0.08em]", event.tone)}>
                  {event.channel}
                </span>
                <span>{event.body}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
      </section>

      <section id="how" className="scroll-mt-4 border-y border-line-2">
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
          {RUNDOWN.map((step, index) => (
            <li
              key={step.title}
              className="group relative border-b border-line px-4 py-3.5 last:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0"
            >
              <span className="font-mono text-2xs tracking-[0.12em] text-ink-3">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-1.5 mb-1.5 text-sm font-semibold tracking-[0.09em] uppercase">
                {step.title}
              </h2>
              <p className="max-w-[34ch] text-sm text-ink-2">{step.body}</p>
              <span className="absolute bottom-0 left-0 h-px w-0 bg-signal transition-[width] duration-[var(--dur-3)] ease-standard group-hover:w-full" />
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 pb-4 font-mono text-2xs tracking-[0.1em] text-ink-3 uppercase">
        <span>Account sharing · OTP relay</span>
        <span className="ml-auto flex gap-4">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </span>
      </footer>
    </>
  );
}
