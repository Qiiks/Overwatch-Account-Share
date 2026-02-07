"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { DotGrid } from "@/components/DotGrid";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { RegistrationToggle } from "@/components/admin/RegistrationToggle";
import { UserManagement } from "@/components/admin/UserManagement";
import { GlobalAccessManager } from "@/components/admin/GlobalAccessManager";
import { QuickActions } from "@/components/admin/QuickActions";
import {
  apiGet,
  clearStoredAuthSession,
  getStoredAuthSession,
} from "@/lib/api";
import {
  Users,
  Activity,
  ShieldCheck,
  Server,
  AlertCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  flaggedActivities: number;
  totalCredentials: number;
  sharedCredentials: number;
  systemHealth: "healthy" | "warning" | "critical";
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { token, expired } = getStoredAuthSession();
    const adminFlag =
      typeof window !== "undefined"
        ? localStorage.getItem("is_admin") === "true"
        : false;

    if (!token || expired) {
      if (expired) {
        clearStoredAuthSession();
      }
      router.push("/login");
      return;
    }

    if (!adminFlag) {
      router.push("/dashboard");
      return;
    }

    fetchAdminData();
  }, [router]);

  const fetchAdminData = async () => {
    try {
      const data = await apiGet<{ stats: AdminStats }>("/api/admin/dashboard");
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-[#00ff88]";
      case "warning":
        return "text-[#ffcc00]";
      case "critical":
        return "text-[#ff0040]";
      default:
        return "text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex items-center justify-center">
        <DotGrid />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A2BE2]"></div>
          <p className="text-[#DA70D6] animate-pulse">
            Initializing AdmnilNK...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden font-sans">
      <Navigation />
      <DotGrid />

      {/* Decorative Background Glows */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-[#8A2BE2]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-[#DA70D6]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8 pt-24 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8A2BE2] via-[#DA70D6] to-[#00ffff] font-[family-name:var(--font-heading)]">
              Admin Command Center
            </h1>
            <p className="text-gray-400 max-w-lg">
              System overhaul complete. Monitoring active neural links and user
              permissions.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <div
              className={`w-2.5 h-2.5 rounded-full ${stats?.systemHealth === "healthy" ? "bg-[#00ff88] animate-pulse" : "bg-red-500"}`}
            />
            <span className="text-sm font-medium uppercase tracking-wider text-gray-300">
              System: {stats?.systemHealth || "Unknown"}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatsCard
              icon={<Users className="w-5 h-5 text-[#8A2BE2]" />}
              label="Total Users"
              value={stats.totalUsers}
              trend="+12%"
            />
            <StatsCard
              icon={<Activity className="w-5 h-5 text-[#00ff88]" />}
              label="Active Now"
              value={stats.activeUsers}
              color="text-[#00ff88]"
            />
            <StatsCard
              icon={<ShieldCheck className="w-5 h-5 text-[#DA70D6]" />}
              label="Credentials"
              value={stats.totalCredentials}
            />
            <StatsCard
              icon={<Server className="w-5 h-5 text-blue-400" />}
              label="Shared Items"
              value={stats.sharedCredentials}
            />
            <StatsCard
              icon={<AlertCircle className="w-5 h-5 text-[#ff0040]" />}
              label="Flagged"
              value={stats.flaggedActivities}
              color="text-[#ff0040]"
            />
            <GlassCard className="col-span-1 lg:col-span-1 flex items-center justify-center bg-gradient-to-br from-[#8A2BE2]/20 to-[#DA70D6]/20 border-[#DA70D6]/30">
              <div className="text-center">
                <div className="text-xs text-[#DA70D6] uppercase tracking-widest mb-1">
                  Status
                </div>
                <div
                  className={`text-xl font-bold ${getHealthColor(stats.systemHealth)}`}
                >
                  {stats.systemHealth.toUpperCase()}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Quick Actions Panel */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-1 bg-[#8A2BE2] rounded-full" />
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-heading)]">
              Quick Actions
            </h2>
          </div>
          <QuickActions />
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area - Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* User Management */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 bg-[#DA70D6] rounded-full" />
                <h2 className="text-xl font-bold text-white font-[family-name:var(--font-heading)]">
                  User Database
                </h2>
              </div>
              <UserManagement onUsersChange={fetchAdminData} />
            </section>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-8">
            {/* Global Access Manager */}
            <section>
              <GlobalAccessManager />
            </section>

            {/* Application Settings */}
            <section>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-400" />
                    System Controls
                  </h3>
                  <div className="space-y-4">
                    <RegistrationToggle />
                    {/* Add more system toggles here later */}
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-500 text-center">
                      More system controls coming soon
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  trend,
  color = "text-white",
}: {
  icon: any;
  label: string;
  value: number;
  trend?: string;
  color?: string;
}) {
  return (
    <GlassCard className="hover:border-[#8A2BE2]/50 transition-colors duration-300 group">
      <GlassCardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 rounded-md bg-white/5 group-hover:bg-[#8A2BE2]/20 transition-colors">
            {icon}
          </div>
          {trend && (
            <span className="text-xs text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded">
              {trend}
            </span>
          )}
        </div>
        <div
          className={`text-2xl font-bold mb-1 ${color} font-[family-name:var(--font-heading)]`}
        >
          {value}
        </div>
        <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
