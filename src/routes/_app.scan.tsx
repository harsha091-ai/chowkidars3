import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { ShieldCheck, Loader2, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({ meta: [{ title: "Scan QR — GuardCheck" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      const s = scannerRef.current;
      if (s && s.isScanning) {
        s.stop().catch(() => {}).finally(() => s.clear());
      }
    };
  }, []);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (s && s.isScanning) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* noop */
      }
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    await stopScanner();

    try {
      // Find or auto-create a guard row for this user
      let { data: guard, error: gErr } = await supabase
        .from("guards")
        .select("id, site_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (gErr) throw gErr;
      if (!guard) {
        const { data: created, error: cErr } = await supabase
          .from("guards")
          .insert({
            user_id: user!.id,
            name: user!.email?.split("@")[0] ?? "Guard",
            email: user!.email ?? null,
          })
          .select("id, site_id")
          .single();
        if (cErr) throw cErr;
        guard = created;
      }

      const todayStr = format(new Date(), "yyyy-MM-dd");

      // Geo-location (best effort)
      let lat: number | null = null;
      let lng: number | null = null;
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 4000, maximumAge: 60_000 },
          );
        });
      }

      const { error: insErr } = await supabase.from("attendance").insert({
        guard_id: guard.id,
        site_id: guard.site_id ?? null,
        date: todayStr,
        status: "present",
        latitude: lat,
        longitude: lng,
      });
      if (insErr) throw insErr;

      setSuccess(true);
      toast.success("Attendance marked successfully");
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to mark attendance";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const startScanner = async () => {
    setError(null);
    setSuccess(false);
    setScanning(true);
    // Wait a tick so the container div is mounted
    await new Promise((r) => setTimeout(r, 50));
    try {
      // Ensure camera permission is granted (shows native prompt)
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found on this device.");
      }
      // Prefer rear camera
      const rear =
        cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[cameras.length - 1];

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const qrbox = (vw: number, vh: number) => {
        const min = Math.min(vw, vh);
        const size = Math.floor(min * 0.7);
        return { width: size, height: size };
      };

      await scanner.start(
        rear.id,
        {
          fps: 15,
          qrbox,
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (text) => handleScan(text),
        () => {
          /* ignore per-frame decode errors */
        },
      );
    } catch (e) {
      setScanning(false);
      scannerRef.current = null;
      const msg = e instanceof Error ? e.message : "Camera access failed.";
      setError(
        `${msg} Please allow camera permission in your browser settings and use HTTPS.`,
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scan QR Code</h1>
        <p className="text-sm text-muted-foreground">Point your camera at the site's QR code.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success/40 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Attendance marked. Redirecting…</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
        <div className="relative aspect-square w-full bg-muted" style={{ minHeight: 280 }}>
          {/* html5-qrcode injects the <video> here. Keep it empty when scanner is active. */}
          <div id={containerId} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {!scanning && !processing && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-8 w-8" />
              </div>
              <p className="text-sm text-muted-foreground">Tap "Start scanning" to open the camera</p>
            </div>
          )}
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="p-4">
          {!scanning ? (
            <Button onClick={startScanner} className="w-full" size="lg" disabled={processing}>
              <Camera className="mr-2 h-5 w-5" /> Start scanning
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" className="w-full" size="lg">
              Stop
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Security checks</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Scan any QR to mark attendance as present</li>
              <li>Location captured for verification</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
