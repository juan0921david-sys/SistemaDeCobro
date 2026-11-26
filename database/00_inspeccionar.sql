-- SOLO LECTURA. Ejecutar primero en el SQL Editor del proyecto que se va a limpiar.
SELECT current_database() AS base, current_user AS usuario_sql;
SELECT role, is_active, count(*) AS cantidad
FROM public.users GROUP BY role, is_active ORDER BY role, is_active;

SELECT 'routes' AS tabla, count(*) AS cantidad FROM public.routes
UNION ALL SELECT 'clients', count(*) FROM public.clients
UNION ALL SELECT 'guarantors', count(*) FROM public.guarantors
UNION ALL SELECT 'credits', count(*) FROM public.credits
UNION ALL SELECT 'installments', count(*) FROM public.installments
UNION ALL SELECT 'payments', count(*) FROM public.payments
UNION ALL SELECT 'receipts', count(*) FROM public.receipts;

SELECT conrelid::regclass AS tabla, conname,
       pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

SELECT event_object_table AS tabla, trigger_name, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
