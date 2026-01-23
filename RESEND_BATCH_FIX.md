# Resend Batch API Fix - Rate Limit Solution

## Problem

When adding multiple people to a project, the app was hitting Resend's rate limit:
- **Rate limit**: 2 requests per second
- **Issue**: Sending emails one at a time in rapid succession
- **Error**: `429 - Your request was rejected because your account hit its API rate limit`

## Solution

Updated the `invite_or_add_member` Supabase Edge Function to use **Resend's Batch API**.

### What Changed

**Before** (hitting rate limit):
```typescript
// Sent emails one at a time in a loop
for (const entry of entries) {
  // ... process entry ...
  await fetch('https://api.resend.com/emails', { ... })  // ❌ 1 request per person
}
```

**After** (using batch API):
```typescript
// Collect all emails
const emailsToSend = []
for (const entry of entries) {
  // ... process entry ...
  emailsToSend.push({ from, to, subject, html })  // ✅ Collect
}

// Send all in one batch request
await fetch('https://api.resend.com/emails/batch', {  // ✅ 1 request for up to 100 emails
  body: JSON.stringify(emailsToSend)
})
```

## Benefits

✅ **No more rate limits** - Can send up to 100 emails in one request
✅ **Faster** - One API call instead of multiple
✅ **More reliable** - Less network overhead
✅ **Cost effective** - Fewer API requests

## Files Updated

- ✅ `supabase/functions/invite_or_add_member/index.ts`
- ✅ `apps/web/supabase/functions/invite_or_add_member/index.ts`

## Deployment

### Option 1: Via Supabase CLI (Recommended)

```bash
# Deploy the function
supabase functions deploy invite_or_add_member
```

### Option 2: Via Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Edge Functions**
3. Select `invite_or_add_member`
4. Upload the updated `index.ts` file
5. Click **Deploy**

## Testing

1. Add multiple people (3-5) to a project
2. Check that:
   - ✅ All people are added to the project
   - ✅ All emails are sent successfully
   - ✅ No rate limit errors
   - ✅ Logs show: `Sending X emails in batch`

## Resend Batch API Details

**Endpoint**: `POST https://api.resend.com/emails/batch`

**Format**:
```json
[
  {
    "from": "sender@example.com",
    "to": ["recipient1@example.com"],
    "subject": "Subject 1",
    "html": "..."
  },
  {
    "from": "sender@example.com",
    "to": ["recipient2@example.com"],
    "subject": "Subject 2",
    "html": "..."
  }
]
```

**Limits**:
- Up to **100 emails per batch**
- Same authentication as regular email API

**Response**:
```json
{
  "data": [
    { "id": "email-id-1" },
    { "id": "email-id-2" }
  ]
}
```

## Fallback Behavior

If batch sending fails:
- Users are still added to the project ✅
- Results include `batch_email_failed` reason
- Check Supabase function logs for details

## Next Steps

After deployment:
1. ✅ Test with multiple users
2. ✅ Monitor Supabase Edge Function logs
3. ✅ Check Resend dashboard for batch email deliveries
4. ✅ Verify no more rate limit errors

## References

- [Resend Batch API Documentation](https://resend.com/docs/api-reference/emails/send-batch-emails)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
