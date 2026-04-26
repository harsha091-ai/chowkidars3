-- RPC to get guards who are late by more than X hours
CREATE OR REPLACE FUNCTION public.get_absent_guards_after_grace_period(grace_hours INT, timezone TEXT DEFAULT 'Asia/Kolkata')
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    work_start_time TIME
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.name, g.email, g.phone, g.work_start_time
    FROM public.guards g
    WHERE 
        -- 1. Guard has NOT scanned today
        NOT EXISTS (
            SELECT 1 FROM public.attendance a 
            WHERE a.guard_id = g.id 
            AND a.date = (CURRENT_TIMESTAMP AT TIME ZONE timezone)::DATE
        )
        -- 2. It is currently at least X hours past their duty start time
        AND (CURRENT_TIMESTAMP AT TIME ZONE timezone)::TIME > (g.work_start_time + (grace_hours || ' hours')::INTERVAL);
END;
$$;
