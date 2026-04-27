-- supabase/migrations/20260427000005_promote_memories_schedule.sql

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
