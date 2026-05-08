
ALTER TABLE public.contracts DISABLE TRIGGER USER;

DO $$
DECLARE r RECORD; sql_text text;
BEGIN
  FOR r IN
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='pets' AND ccu.column_name='id' AND tc.table_schema='public'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = CASE %I
         WHEN ''9a9295c8-959c-4142-a842-c38059c9aaf2''::uuid THEN ''e60e5a29-8be5-4ee5-8f1a-3f69a232cf48''::uuid
         WHEN ''1c858163-5efa-4bb9-826b-5fb3a4e2bec1''::uuid THEN ''c3820e1a-bd44-4979-a9ca-f7306bba9b8d''::uuid
         WHEN ''621798d5-6993-43d1-8795-e605496782f2''::uuid THEN ''2fbd0812-21ac-481d-a334-1ba6534bae04''::uuid
         ELSE %I END
       WHERE %I IN (''9a9295c8-959c-4142-a842-c38059c9aaf2''::uuid,''1c858163-5efa-4bb9-826b-5fb3a4e2bec1''::uuid,''621798d5-6993-43d1-8795-e605496782f2''::uuid)',
      r.table_schema, r.table_name, r.column_name, r.column_name, r.column_name, r.column_name);
  END LOOP;

  FOR r IN
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='clientes' AND ccu.column_name='id' AND tc.table_schema='public'
  LOOP
    BEGIN
      EXECUTE format('UPDATE %I.%I SET %I = ''40d5e362-c36d-4b09-a1bc-4ffe1e8965d5''::uuid WHERE %I = ''680b0a13-b971-4c78-bd60-ef1d1a942ed6''::uuid',
        r.table_schema, r.table_name, r.column_name, r.column_name);
    EXCEPTION WHEN unique_violation THEN
      EXECUTE format('DELETE FROM %I.%I WHERE %I = ''680b0a13-b971-4c78-bd60-ef1d1a942ed6''::uuid', r.table_schema, r.table_name, r.column_name);
    END;
  END LOOP;
END $$;

ALTER TABLE public.contracts ENABLE TRIGGER USER;

DELETE FROM pets WHERE id IN ('9a9295c8-959c-4142-a842-c38059c9aaf2','1c858163-5efa-4bb9-826b-5fb3a4e2bec1','621798d5-6993-43d1-8795-e605496782f2');
DELETE FROM clientes WHERE id='680b0a13-b971-4c78-bd60-ef1d1a942ed6';
