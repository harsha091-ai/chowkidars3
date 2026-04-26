-- Update the user creation trigger to handle duty start time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.guards (user_id, name, email, phone, work_start_time)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data ->> 'work_start_time')::TIME, '09:00:00'::TIME)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guard') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
