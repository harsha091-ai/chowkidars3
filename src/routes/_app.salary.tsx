import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { Wallet, TrendingDown, Receipt, PiggyBank, BadgeIndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { calculateSalary, formatINR, WORKING_DAYS } from "@/lib/salary";

export const Route = createFileRoute("/_app/salary")({
  head: () => ({ meta: [{ title: "My Salary — GuardCheck" }] }),
  component: SalaryPage,
});

function SalaryPage() {
  const { user } = useAuth();
  const month = new Date();
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const { data, isLoading } = useQuery({
    queryKey: ["salary", user?.id, format(month, "yyyy-MM")],
    enabled: !!user,
    queryFn: async () => {
      const { data: guard } = await supabase
        .from("guards")
        .select("id, base_salary")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!guard) return null;

      const { count } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("guard_id", guard.id)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      return { base: Number(guard.base_salary), present: count ?? 0 };
    },
  });

  const monthDays = getDaysInMonth(month);
  const breakdown = data
    ? calculateSalary(data.base, data.present, monthDays)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Salary</h1>
        <p className="text-sm text-muted-foreground">{format(month, "MMMM yyyy")}</p>
      </div>

      {/* Net salary hero */}
      <Card
        className="border-0 p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">Net salary</p>
        <p className="mt-1 text-3xl font-bold">
          {isLoading || !breakdown ? (
            <Skeleton className="h-9 w-40 bg-white/20" />
          ) : (
            formatINR(breakdown.net)
          )}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {breakdown
            ? `${breakdown.presentDays} present · ${breakdown.absentDays} absent (${WORKING_DAYS} working days)`
            : "—"}
        </p>
      </Card>

      <div className="space-y-2">
        <Row
          icon={<BadgeIndianRupee className="h-5 w-5" />}
          label="Base salary"
          value={breakdown ? formatINR(breakdown.base) : "—"}
          tone="default"
        />
        <Row
          icon={<Receipt className="h-5 w-5" />}
          label="EPF deduction (25%)"
          value={breakdown ? `− ${formatINR(breakdown.epf)}` : "—"}
          tone="negative"
        />
        <Row
          icon={<PiggyBank className="h-5 w-5" />}
          label="ESI deduction (25%)"
          value={breakdown ? `− ${formatINR(breakdown.esi)}` : "—"}
          tone="negative"
        />
        <Row
          icon={<TrendingDown className="h-5 w-5" />}
          label={`Absent deduction (${breakdown?.absentDays ?? 0} × ${
            breakdown ? formatINR(breakdown.perDay) : "—"
          })`}
          value={breakdown ? `− ${formatINR(breakdown.absentDeduction)}` : "—"}
          tone="negative"
        />
        <Row
          icon={<Wallet className="h-5 w-5" />}
          label="Net salary"
          value={breakdown ? formatINR(breakdown.net) : "—"}
          tone="positive"
          emphasis
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Per day = Base ÷ {WORKING_DAYS} working days
      </p>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "default" | "negative" | "positive";
  emphasis?: boolean;
}) {
  return (
    <Card className={`flex items-center gap-3 p-4 ${emphasis ? "border-primary/30 bg-primary/5" : ""}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          tone === "negative"
            ? "bg-destructive/10 text-destructive"
            : tone === "positive"
              ? "bg-success/10 text-success"
              : "bg-accent text-accent-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p
        className={`text-base font-semibold ${
          tone === "negative"
            ? "text-destructive"
            : tone === "positive"
              ? "text-success"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
