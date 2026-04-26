-- 1. Create a table to track sent notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    admin_phone TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    date_checked DATE DEFAULT (now() AT TIME ZONE 'utc')::date,
    UNIQUE(guard_id, date_checked)
);

-- 2. Add an RLS policy for the logs (Admin only)
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage logs" ON public.whatsapp_logs 
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add work_start_time to guards
ALTER TABLE public.guards ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00';
