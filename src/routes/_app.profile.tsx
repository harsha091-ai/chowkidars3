import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Mail, Phone, MapPin, Shield, BadgeIndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/salary";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — GuardCheck" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("guards")
        .select("name, email, phone, base_salary, site:sites(site_name, location)")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </div>

      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gradient-primary)] text-2xl font-bold text-primary-foreground">
            {(data?.name ?? "G").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <p className="truncate text-lg font-semibold">{data?.name ?? "Guard"}</p>
            )}
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Shield className="h-3 w-3" /> {isAdmin ? "Admin" : "Guard"}
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <Item icon={<Mail className="h-4 w-4" />} label="Email" value={data?.email ?? user?.email ?? "—"} />
        <Item icon={<Phone className="h-4 w-4" />} label="Phone" value={data?.phone ?? "Not set"} />
        <Item
          icon={<MapPin className="h-4 w-4" />}
          label="Assigned site"
          value={data?.site ? `${data.site.site_name} · ${data.site.location}` : "Not assigned"}
        />
        <Item
          icon={<BadgeIndianRupee className="h-4 w-4" />}
          label="Base salary"
          value={data?.base_salary ? formatINR(Number(data.base_salary)) : "—"}
        />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          await signOut();
          navigate({ to: "/login" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </Card>
  );
}
