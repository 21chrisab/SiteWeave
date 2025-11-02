# Resend Setup Guide - Step by Step

This guide will walk you through setting up Resend for email notifications in SiteWeave.

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" (you can use Google/GitHub for quick signup)
3. Verify your email address

## Step 2: Get Your API Key

1. Once logged in, go to **API Keys** in the left sidebar
2. Click **Create API Key**
3. Give it a name (e.g., "SiteWeave Production")
4. Select permissions (full access is fine for now)
5. Click **Add**
6. **Copy the API key immediately** - it starts with `re_` and you won't be able to see it again!

Example API key format: `re_1234567890abcdefghijklmnopqrstuvwxyz`

## Step 3: Choose Email Sending Domain

You have two options:

### Option A: Use Resend's Test Domain (Quick Start)
- No verification needed
- Works immediately
- **LIMITATION**: Emails will say "via send.resend.dev" in the "From" field
- Good for development/testing
- Free tier: 100 emails/day, 3,000 emails/month

### Option B: Verify Your Own Domain (Production)
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records to your domain:
   - **SPF Record**: Add the TXT record shown
   - **DKIM Record**: Add the CNAME records shown
5. Wait for verification (usually 5-15 minutes)
6. Once verified, you can use `notifications@yourdomain.com` as your sender

## Step 4: Install Supabase CLI (If Not Already Installed)

```bash
npm install -g supabase
```

## Step 5: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 6: Link Your Supabase Project

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your SiteWeave project
3. Click **Settings** → **General**
4. Copy your **Project Reference ID** (looks like `abcdefghijklmnop`)
5. Run:
```bash
supabase link --project-ref YOUR_PROJECT_REF_ID
```

## Step 7: Set Your Resend API Key as a Secret

```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

Replace `re_your_actual_api_key_here` with the API key you copied in Step 2.

**Important**: The API key starts with `re_` - make sure you include the whole thing!

## Step 8: Deploy the Edge Functions

Navigate to your project root and deploy both functions:

```bash
# Deploy the email notification function
supabase functions deploy send-email

# Deploy the invitation email function
supabase functions deploy send-invitation-email
```

## Step 9: Update Email "From" Addresses (Optional)

If you verified your own domain (Option B above), update the edge functions:

**Edit `supabase/functions/send-email/index.ts`:**
- Line 35: Change `'SiteWeave Notifications <notifications@send.resend.dev>'` to `'SiteWeave Notifications <notifications@yourdomain.com>'`

**Edit `supabase/functions/send-invitation-email/index.ts`:**
- Line 153: Change `'SiteWeave Invitations <invitations@send.resend.dev>'` to `'SiteWeave Invitations <invitations@yourdomain.com>'`

Then redeploy:
```bash
supabase functions deploy send-email
supabase functions deploy send-invitation-email
```

## Step 10: Test It!

### Test 1: Check if Functions are Deployed

```bash
supabase functions list
```

You should see both `send-email` and `send-invitation-email` in the list.

### Test 2: Test Email Sending

In your SiteWeave app:
1. Create a contact with your email address
2. Assign that contact to a task/issue step
3. You should receive an email notification

### Test 3: Check Logs

```bash
# Watch logs in real-time
supabase functions logs send-email --follow
```

### Test 4: Verify in Resend Dashboard

1. Go to Resend dashboard
2. Click **Emails** in the sidebar
3. You should see your test emails being sent

## Troubleshooting

### "Function not found"
- Make sure you deployed both functions: `supabase functions deploy send-email` and `supabase functions deploy send-invitation-email`

### "Failed to send email via Resend"
- Check that your API key is set correctly: `supabase secrets list`
- Verify the API key is correct in Resend dashboard
- Check Resend dashboard for error messages

### "Emails not being received"
- Check spam folder
- Verify Resend dashboard shows emails as "delivered"
- Check function logs: `supabase functions logs send-email`
- If using test domain, some email providers may block `@send.resend.dev` emails

### "API key not working"
- Make sure the secret is set: `supabase secrets list`
- Re-set it: `supabase secrets set RESEND_API_KEY=re_your_key`
- Redeploy functions after setting secrets

## Quick Reference Commands

```bash
# Set API key
supabase secrets set RESEND_API_KEY=re_your_key

# Deploy functions
supabase functions deploy send-email
supabase functions deploy send-invitation-email

# View logs
supabase functions logs send-email --follow
supabase functions logs send-invitation-email --follow

# List secrets (to verify)
supabase secrets list

# List functions
supabase functions list
```

## Next Steps

Once Resend is set up, you can:
1. Test the contact sharing feature end-to-end
2. Send test invitations
3. Monitor email delivery in Resend dashboard
4. Set up custom domain for production emails (if needed)

## Cost

- **Free tier**: 3,000 emails/month
- **Pro**: $20/month for 50,000 emails
- Most projects can start on the free tier!

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- Supabase Functions Docs: https://supabase.com/docs/guides/functions




