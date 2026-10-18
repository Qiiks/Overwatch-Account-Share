"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/GlassButton";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { DotGrid } from "@/components/DotGrid";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { connectSocket } from "@/lib/socket";
import { ShieldCheck, Users, Lock, RefreshCw } from "lucide-react";

export default function IndexPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const isLoggedIn = !!user;

  // Online users count state
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);

  // Online users real-time sync. Anonymous sockets are allowed for the count only.
  useEffect(() => {
    const socket = connectSocket();
    socket.on("connect", () => {
      socket.emit("requestOnlineUsers");
    });
    socket.on("onlineUsers", (count: number) => setOnlineUsersCount(count));
    socket.on("connectionSuccess", (data: { onlineUsers: number }) =>
      setOnlineUsersCount(data.onlineUsers),
    );
    socket.on("disconnect", () => setOnlineUsersCount(0));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#EAEAEA] relative overflow-hidden">
      <Navigation />
      <DotGrid />

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-12 sm:py-16 pt-20 sm:pt-24">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="platform-title text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 font-heading tracking-tight">
            SECUREVAULT
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#EAEAEA]/70 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
            AES-256-GCM encrypted credential sharing for teams
          </p>
          <p className="text-sm text-[#DA70D6]/60 mb-8">
            Military-grade encryption · Zero-knowledge architecture · Real-time
            sync
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center w-full sm:w-auto max-w-md sm:max-w-none mx-auto">
            {!isLoggedIn ? (
              <>
                <GlassButton
                  onClick={() => router.push("/login")}
                  variant="primary"
                  size="lg"
                  className="px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                >
                  Sign In
                </GlassButton>
                <GlassButton
                  onClick={() => router.push("/register")}
                  variant="ghost"
                  size="lg"
                  className="px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                >
                  Create Account
                </GlassButton>
              </>
            ) : (
              <>
                <GlassButton
                  onClick={() => router.push("/dashboard")}
                  variant="primary"
                  size="lg"
                  className="px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
                >
                  Go to Dashboard
                </GlassButton>
                {isAdmin && (
                  <GlassButton
                    onClick={() => router.push("/admin")}
                    variant="ghost"
                    size="lg"
                    className="px-6 sm:px-8 py-3 text-base sm:text-lg border-green-400/50 text-green-400 hover:bg-green-400/10 w-full sm:w-auto"
                  >
                    Admin Console
                  </GlassButton>
                )}
              </>
            )}
          </div>
        </div>

        {/* Platform Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16">
          <GlassCard className="holographic">
            <GlassCardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#8A2BE2]" />
                <GlassCardTitle className="text-[#8A2BE2] text-lg">
                  Secure Storage
                </GlassCardTitle>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-[#EAEAEA]/60 text-sm">
                AES-256 encryption with zero-knowledge architecture. Your
                credentials never leave your device unencrypted.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="holographic">
            <GlassCardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-[#DA70D6]" />
                <GlassCardTitle className="text-[#DA70D6] text-lg">
                  Team Sharing
                </GlassCardTitle>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-[#EAEAEA]/60 text-sm">
                Secure channels with multi-user access and granular permissions.
                Share credentials without exposing them.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="holographic">
            <GlassCardHeader>
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-[#8A2BE2]" />
                <GlassCardTitle className="text-[#8A2BE2] text-lg">
                  Access Control
                </GlassCardTitle>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-[#EAEAEA]/60 text-sm">
                Role-based authentication with comprehensive audit logging and
                permission management.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="holographic">
            <GlassCardHeader>
              <div className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 text-[#DA70D6]" />
                <GlassCardTitle className="text-[#DA70D6] text-lg">
                  OTP Generator
                </GlassCardTitle>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-[#EAEAEA]/60 text-sm">
                TOTP algorithm with auto-refresh and instant sharing. Real-time
                OTP extraction from email.
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 bg-[#0a0a0a]/60 border border-[#8A2BE2]/20 rounded-full px-6 py-2 text-xs text-[#EAEAEA]/50 backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Online
            </span>
            <span className="text-[#8A2BE2]/40">|</span>
            <span>Encrypted</span>
            <span className="text-[#8A2BE2]/40">|</span>
            <span>
              <span className="text-[#DA70D6]">{onlineUsersCount}</span> active
            </span>
            <span className="text-[#8A2BE2]/40">|</span>
            <span className="text-green-400/70">99.99% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
