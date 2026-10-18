"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationToggle } from "@/components/admin/RegistrationToggle";
import { UserManagement } from "@/components/admin/UserManagement";
import { GlobalAccessManager } from "@/components/admin/GlobalAccessManager";
import { QuickActions } from "@/components/admin/QuickActions";
import { apiGet } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  flaggedActivities: number;
  totalCredentials: number;
  sharedCredentials: number;
  systemHealth: "healthy" | "warning" | "critical";
}

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-signal",
  warning: "bg-warn",
  critical: "bg-alarm",
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    fetchAdminData();
  }, [authLoading, user, isAdmin, router]);

  const fetchAdminData = async () => {
    try {
      const data = await apiGet<{ stats: AdminStats }>("/admin/dashboard");
      setStats(data.stats);
    } catch (error) {
      toast.error("Failed to load admin data", {
        description: errorMessage(error),
      });
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase animate-led motion-reduce:animate-none">
          Initializing console…
        </span>
      </div>
    );
  }

  const health = stats?.systemHealth ?? "unknown";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <h1 className="text-md font-semibold text-ink">Admin console</h1>
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
          System controls
        </span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line-2 px-2.5 py-1.5">
          <span
            className={`size-2 flex-none ${HEALTH_DOT[health] ?? "bg-ink-3"} ${
              health === "healthy" ? "animate-led motion-reduce:animate-none" : ""
            }`}
          />
          <span className="font-mono text-2xs tracking-[0.1em] text-ink-2 uppercase">
            System: {health}
          </span>
        </span>
      </header>

      {stats && (
        <div className="flex flex-wrap border-b border-line">
          <Readout label="Total users" value={stats.totalUsers} />
          <Readout label="Active now" value={stats.activeUsers} live />
          <Readout label="Credentials" value={stats.totalCredentials} />
          <Readout label="Shared items" value={stats.sharedCredentials} />
          <Readout
            label="Flagged"
            value={stats.flaggedActivities}
            alarm={stats.flaggedActivities > 0}
          />
        </div>
      )}

      <section>
        <SectionHead>Quick actions</SectionHead>
        <QuickActions />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="min-w-0">
          <SectionHead>User database</SectionHead>
          <UserManagement onUsersChange={fetchAdminData} />
        </section>

        <div className="space-y-6">
          <section>
            <SectionHead>Global access</SectionHead>
            <GlobalAccessManager />
          </section>

          <section>
            <SectionHead>Application settings</SectionHead>
            <div className="rounded-lg border border-line bg-panel p-3.5">
              <RegistrationToggle />
              <p className="mt-3 rounded-md border border-line px-3 py-2.5 text-center font-mono text-2xs tracking-[0.06em] text-ink-3 uppercase">
                More system controls coming soon
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="h-4 w-0.5 flex-none bg-signal" />
      <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">
        {children}
      </h2>
    </div>
  );
}

function Readout({
  label,
  value,
  live = false,
  alarm = false,
}: {
  label: string;
  value: number;
  live?: boolean;
  alarm?: boolean;
}) {
  const tone = alarm ? "text-alarm" : live ? "text-signal" : "text-ink";
  return (
    <div className="mr-5 border-r border-line py-3 pr-5 last:mr-0 last:border-r-0">
      <p className={`font-mono text-xl tabular-nums ${tone}`}>{value}</p>
      <p className="font-mono text-2xs tracking-label text-ink-3 uppercase">{label}</p>
    </div>
  );
}
