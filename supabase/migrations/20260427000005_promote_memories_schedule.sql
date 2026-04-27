-- supabase/migrations/20260427000005_promote_memories_schedule.sql

-- pg_cron and pg_net are platform-enabled on Supabase managed instances.
-- These guards ensure local development (supabase start) does not fail.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'promote-memories',
  '0 3 * * *',
  $$select net.http_post(
      url := supabase_url() || '/functions/v1/promote-memories',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || supabase_service_role_key(),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
  ) as request_id$$
);
