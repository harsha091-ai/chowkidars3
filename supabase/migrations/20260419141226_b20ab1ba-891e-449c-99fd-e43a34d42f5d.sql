-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'guard');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sites
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL,
  location TEXT NOT NULL,
  qr_code_value TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view sites" ON public.sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sites" ON public.sites FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Guards
CREATE TABLE public.guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  base_salary NUMERIC(10,2) NOT NULL DEFAULT 15000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guard view own" ON public.guards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Guard update own" ON public.guards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view guards" ON public.guards FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage guards" ON public.guards FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'present',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  UNIQUE (guard_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX attendance_guard_date_idx ON public.attendance(guard_id, date);
CREATE POLICY "Guard view own attendance" ON public.attendance FOR SELECT USING (EXISTS (SELECT 1 FROM public.guards g WHERE g.id = attendance.guard_id AND g.user_id = auth.uid()));
CREATE POLICY "Guard insert own attendance" ON public.attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.guards g WHERE g.id = attendance.guard_id AND g.user_id = auth.uid()));
CREATE POLICY "Admins view attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_guards_updated_at BEFORE UPDATE ON public.guards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create guard profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.guards (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guard') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed demo site
INSERT INTO public.sites (site_name, location, qr_code_value)
VALUES ('Main Gate - Demo Site', 'Mumbai, Maharashtra', 'SITE-DEMO-001');
