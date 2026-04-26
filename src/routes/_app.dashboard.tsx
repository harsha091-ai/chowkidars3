import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2, XCircle, MapPin, QrCode, Calendar, Wallet, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GuardCheck" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id, todayStr],
    enabled: !!user,
    queryFn: async () => {
      const { data: guard } = await supabase
        .from("guards")
        .select("id, name, base_salary, site:sites(id, site_name, location, qr_code_value)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!guard) return { guard: null, todayAttendance: null };

      const { data: att } = await supabase
        .from("attendance")
        .select("id, marked_at, status")
        .eq("guard_id", guard.id)
        .eq("date", todayStr)
        .maybeSingle();

      return { guard, todayAttendance: att };
    },
  });

  const guard = data?.guard;
  const present = !!data?.todayAttendance;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {format(today, "EEEE, d MMMM yyyy")}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
          {isLoading ? <Skeleton className="h-7 w-40" /> : `Hi, ${guard?.name?.split(" ")[0] ?? "Guard"}`}
        </h1>
      </div>

      {/* Status hero */}
      <Card
        className={`relative overflow-hidden border-0 p-5 text-primary-foreground shadow-[var(--shadow-elegant)] ${
          present ? "" : ""
        }`}
        style={{
          background: present
            ? "linear-gradient(135deg, oklch(0.55 0.16 145), oklch(0.65 0.17 150))"
            : "var(--gradient-hero)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Today's status</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-7 w-32 bg-white/20" />
              ) : present ? (
                <>
                  <CheckCircle2 className="h-6 w-6" /> Present
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6" /> Not marked
                </>
              )}
            </p>
            {present && data?.todayAttendance?.marked_at && (
              <p className="mt-1 text-sm opacity-90">
                Marked at {format(new Date(data.todayAttendance.marked_at), "h:mm a")}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
            {present ? <CheckCircle2 className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
          </div>
        </div>

        {!present && (
          <Button
            onClick={() => navigate({ to: "/scan" })}
            className="mt-4 w-full bg-white text-primary hover:bg-white/90"
            size="lg"
          >
            <QrCode className="mr-2 h-5 w-5" /> Scan QR to mark attendance
          </Button>
        )}
      </Card>

      {/* Site card */}
      <Card className="p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Assigned site</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-40" />
            ) : guard?.site ? (
              <>
                <p className="font-semibold">{guard.site.site_name}</p>
                <p className="truncate text-sm text-muted-foreground">{guard.site.location}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No site assigned. Contact admin.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/attendance">
          <Card className="p-4 transition hover:shadow-[var(--shadow-card)]">
            <Calendar className="h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">My Attendance</p>
            <p className="text-xs text-muted-foreground">Monthly calendar view</p>
          </Card>
        </Link>
        <Link to="/salary">
          <Card className="p-4 transition hover:shadow-[var(--shadow-card)]">
            <Wallet className="h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">My Salary</p>
            <p className="text-xs text-muted-foreground">Breakdown & deductions</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
