
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'crm-process-scheduled-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eydsprhlsdgqfovjuylt.supabase.co/functions/v1/crm-process-scheduled',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
