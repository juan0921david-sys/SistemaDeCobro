-- ÚNICAMENTE para PostgreSQL desechable. Nunca ejecutar este fixture en Supabase.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.routes (
    id integer PRIMARY KEY, name varchar NOT NULL, description text,
    is_active boolean DEFAULT true, updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar UNIQUE NOT NULL,
    password_hash varchar NOT NULL, role varchar NOT NULL DEFAULT 'worker',
    full_name varchar, identification varchar UNIQUE, phone varchar,
    is_active boolean DEFAULT true, route_id integer REFERENCES public.routes(id),
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), route_id integer REFERENCES public.routes(id)
);
CREATE TABLE public.guarantors (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES public.clients(id),
    guarantor_id uuid REFERENCES public.guarantors(id), created_by uuid REFERENCES public.users(id)
);
CREATE TABLE public.installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), credit_id uuid REFERENCES public.credits(id)
);
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), credit_id uuid REFERENCES public.credits(id),
    installment_id uuid REFERENCES public.installments(id), client_id uuid REFERENCES public.clients(id),
    received_by uuid REFERENCES public.users(id)
);
CREATE TABLE public.receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid REFERENCES public.payments(id)
);
INSERT INTO public.routes (id, name) VALUES (1, 'Ruta antigua');
INSERT INTO public.users (email, password_hash, role, full_name, route_id) VALUES
    ('admin@local.invalid', 'hash-admin-no-modificar', 'admin', 'Administrador local', 1),
    ('worker@local.invalid', 'hash-worker', 'worker', 'Trabajador local', 1);
INSERT INTO public.clients (route_id) VALUES (1);
INSERT INTO public.guarantors DEFAULT VALUES;
INSERT INTO public.credits (client_id, guarantor_id, created_by)
SELECT c.id, g.id, u.id FROM public.clients c, public.guarantors g, public.users u WHERE u.role = 'worker';
INSERT INTO public.installments (credit_id) SELECT id FROM public.credits;
INSERT INTO public.payments (credit_id, installment_id, client_id, received_by)
SELECT c.id, i.id, c.client_id, c.created_by FROM public.credits c, public.installments i;
INSERT INTO public.receipts (payment_id) SELECT id FROM public.payments;
