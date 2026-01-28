-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily deadline notifications at 8:00 AM UTC
SELECT cron.schedule(
  'send-deadline-notifications',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ggrlsxpnlzjgshbclhii.supabase.co/functions/v1/send-deadline-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncmxzeHBubHpqZ3NoYmNsaGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjkyODAsImV4cCI6MjA4NTIwNTI4MH0.UnLJHLI7389N6RSrtqx0kMSc1DEY4rTo6lU72rVPoh0"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);