# Progress Reports Scheduling Setup

This document explains how to set up automated scheduling for progress reports.

## Overview

The Progress Reports feature includes a scheduled function (`process-scheduled-reports`) that runs periodically to check for due reports and send them automatically.

## Setup Options

### Option 1: Supabase Scheduled Functions (Recommended)

Supabase supports scheduled functions using pg_cron. To set this up:

1. **Enable pg_cron extension** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Create a cron job** to run the function every hour:
   ```sql
   SELECT cron.schedule(
     'process-scheduled-reports',
     '0 * * * *', -- Every hour at minute 0
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/process-scheduled-reports',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

3. **Verify the schedule**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-scheduled-reports';
   ```

### Option 2: External Cron Service

You can use an external cron service (like cron-job.org, EasyCron, or GitHub Actions) to call the edge function:

**Endpoint**: `https://your-project.supabase.co/functions/v1/process-scheduled-reports`

**Method**: POST

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

**Body**: `{}`

**Schedule**: Run every hour (or as needed)

### Option 3: Manual Trigger (Development)

For development/testing, you can manually trigger the function:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/process-scheduled-reports' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Monitoring

To monitor scheduled reports:

1. **Check function logs** in Supabase Dashboard → Edge Functions → process-scheduled-reports → Logs

2. **Query schedule status**:
   ```sql
   SELECT 
     id,
     name,
     is_active,
     next_send_at,
     last_sent_at,
     frequency
   FROM progress_report_schedules
   WHERE is_active = true
   ORDER BY next_send_at;
   ```

3. **Check report history**:
   ```sql
   SELECT 
     sent_at,
     recipient_emails,
     report_type,
     was_manual_send
   FROM progress_report_history
   ORDER BY sent_at DESC
   LIMIT 20;
   ```

## Troubleshooting

### Reports Not Sending

1. Check that schedules are active: `is_active = true`
2. Verify `next_send_at` is in the past
3. Check approval status if `requires_approval = true`
4. Review edge function logs for errors
5. Verify RESEND_API_KEY is configured

### Cron Job Not Running

1. Verify pg_cron extension is enabled
2. Check cron job exists: `SELECT * FROM cron.job;`
3. Review cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
4. Ensure service role key has correct permissions

## Frequency Options

- **Weekly**: Reports sent every 7 days
- **Bi-weekly**: Reports sent every 14 days  
- **Monthly**: Reports sent on the same day each month
- **Custom**: Reports sent every N days (specified in `frequency_value`)
- **Manual**: No automatic sending (user must trigger manually)

## Next Send Date Calculation

The `next_send_at` field is automatically calculated when:
- A report is sent (manually or scheduled)
- A schedule is created/updated with a frequency
- The `calculateNextSendDate` function is called

The calculation is based on:
- `frequency` type
- `frequency_value` (for custom frequencies)
- `last_sent_at` timestamp
