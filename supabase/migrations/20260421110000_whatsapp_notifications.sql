-- SQL to support WhatsApp Notifications for Absent Guards

-- 1. Create a table to track sent notifications for today to avoid duplicate alerts
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    admin_phone TEXT NOT NULL,
    status TEXT NOT NULL, -- e.g., 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    date_checked DATE DEFAULT (now() AT TIME ZONE 'utc')::date,
    UNIQUE(guard_id, date_checked)
);

-- 2. Add an RLS policy for the logs (Admin only)
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Admins manage logs" ON public.whatsapp_logs 
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. (Optional) Add a 'work_start_time' to guards if you want to check at specific times
-- For now, we will use a global check time (e.g., 10:00 AM).
ALTER TABLE public.guards ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00';
