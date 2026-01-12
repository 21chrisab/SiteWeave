# Create Organization Guide

## Overview

Organization creation for SiteWeave is handled via a Supabase Edge Function. This guide explains how to onboard new construction company clients.

---

## Prerequisites

1. **Super Admin Access**: You must be a super admin in the database
2. **Edge Function Deployed**: The `create-organization` function must be deployed
3. **Auth Token**: You need your authentication token

---

## Method 1: HTML Tool (Recommended)

### Setup

1. Open `CREATE-ORGANIZATION-TOOL.html` in your browser
2. Bookmark it for easy access
3. Configure once:
   - **Supabase URL**: `https://your-project.supabase.co`
   - **Auth Token**: Get from browser localStorage after logging into SiteWeave

### Usage

1. Fill in client information:
   - **Company Name**: "Miller Construction"
   - **Owner Name**: "John Miller"
   - **Owner Email**: "john@miller.com"
2. Click **Create Organization**
3. Copy the setup link
4. Hand your device to the client: *"Click this link to set your password"*

---

## Method 2: cURL Command

### Get Your Auth Token

1. Log into SiteWeave in your browser
2. Open Developer Tools (F12)
3. Go to Console
4. Run:
```javascript
JSON.parse(localStorage.getItem('sb-YOUR-PROJECT-auth-token')).access_token
```
5. Copy the token

### Create Organization

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-organization \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Miller Construction",
    "ownerName": "John Miller",
    "ownerEmail": "john@miller.com"
  }'
```

### Response

```json
{
  "success": true,
  "organization": {
    "id": "uuid-here",
    "name": "Miller Construction",
    "slug": "miller-construction"
  },
  "owner": {
    "name": "John Miller",
    "email": "john@miller.com"
  },
  "setupUrl": "https://yourapp.com/invite/abc123...",
  "invitation": {
    "id": "uuid-here",
    "token": "abc123...",
    "expiresAt": "2026-01-14T12:00:00Z"
  },
  "message": "Organization \"Miller Construction\" created successfully..."
}
```

---

## Method 3: JavaScript/Node.js

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const AUTH_TOKEN = 'your-auth-token';

async function createOrganization(companyName, ownerName, ownerEmail) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-organization`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      companyName,
      ownerName,
      ownerEmail
    })
  });

  return await response.json();
}

// Usage
const result = await createOrganization(
  'Miller Construction',
  'John Miller',
  'john@miller.com'
);

console.log('Setup Link:', result.setupUrl);
```

---

## What Happens Behind the Scenes

When you call the edge function, it:

1. **Creates Organization**
   - Name: "Miller Construction"
   - Slug: "miller-construction"
   - Status: Active

2. **Creates OrganizationAdmin Role**
   - Full permissions
   - Linked to organization

3. **Creates Contact**
   - Name: "John Miller"
   - Email: "john@miller.com"
   - Type: Team
   - Role: Owner

4. **Creates Invitation**
   - Unique token
   - Expires in 7 days
   - Status: Pending

5. **Sends Email** (if Resend configured)
   - Welcome message
   - Setup link
   - Instructions

6. **Returns Setup Link**
   - Format: `https://yourapp.com/invite/{token}`
   - One-time use
   - Valid for 7 days

---

## Deploying the Edge Function

### First Time Deployment

1. **Install Supabase CLI**:
```bash
npm install -g supabase
```

2. **Link to Project**:
```bash
supabase link --project-ref your-project-ref
```

3. **Deploy Function**:
```bash
supabase functions deploy create-organization
```

### Set Environment Variables

```bash
# Required
supabase secrets set APP_URL=https://yourapp.com

# Optional (for email sending)
supabase secrets set RESEND_API_KEY=re_xxxxx
```

### Update Function

```bash
# After making changes to the edge function
supabase functions deploy create-organization
```

---

## Setting Yourself as Super Admin

```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET is_super_admin = true
WHERE id = 'your-user-id';
```

---

## Troubleshooting

### Error: "Unauthorized"
- You're not logged in or your token expired
- You're not a super admin

**Fix**: Re-login or update your `is_super_admin` flag

### Error: "Missing required fields"
- You didn't provide all three fields: companyName, ownerName, ownerEmail

**Fix**: Include all required fields

### Error: "Cannot find module 'create-organization'"
- Edge function not deployed

**Fix**: Run `supabase functions deploy create-organization`

### Email not sending
- Resend API key not configured or invalid

**Fix**: Set `RESEND_API_KEY` secret and update edge function with your sender domain

---

## Email Configuration (Optional)

If you want automatic invitation emails:

1. **Sign up for Resend**: https://resend.com
2. **Get API Key**: From Resend dashboard
3. **Set Secret**:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
```
4. **Update Edge Function**: Change sender domain in `index.ts`
```typescript
from: 'SiteWeave <onboarding@yourdomain.com>',
```

---

## Best Practices

1. **Keep the HTML tool bookmarked** for quick access
2. **Always verify the email** before creating
3. **Copy the setup link immediately** after creation
4. **Test the link** in an incognito window first
5. **Hand the device to the client** don't just send the link

---

## The Workflow

1. **You** (Consultant):
   - Open HTML tool
   - Enter company details
   - Click "Create Organization"
   - Hand device to client

2. **Client** (Owner):
   - Clicks setup link
   - Sets their password
   - Logs in automatically
   - Sees empty dashboard

3. **Client** defines their team:
   - Goes to Settings > Roles
   - Creates "Foreman", "Laborer", etc.
   - Goes to Team > Add Members
   - Invites their team

4. **Team Members**:
   - Receive invitation email
   - Set their password
   - Log in
   - See the whole team in Team Directory (the "magic moment")

---

## Support

For issues:
- Check edge function logs: `supabase functions logs create-organization`
- Verify super admin status in database
- Test with cURL first to isolate issues
- Check CORS settings if calling from web

---

**Last Updated**: January 7, 2026
