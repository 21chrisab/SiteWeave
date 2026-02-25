# Progress Reports Feature - Comprehensive Overview

## Introduction

The Progress Reports feature is a comprehensive email reporting system built into the SiteWeave desktop application. It allows users to schedule and send automated progress reports to stakeholders, with intelligent data filtering based on audience type and full customization capabilities.

## Key Features

### 1. Audience-Specific Templates

The system provides three distinct report templates, each optimized for different audiences:

#### Client Reports
- **Purpose**: Professional updates for external clients
- **Data Filtering**: Automatically excludes sensitive internal information
- **Language**: Client-friendly, jargon-free terminology
- **Content**: Completed work, status updates, next steps
- **Security**: Hides internal notes, budget data, team discussions

#### Internal Reports
- **Purpose**: Detailed technical updates for team members
- **Data Filtering**: No filtering - includes all data
- **Language**: Technical terminology, internal references
- **Content**: All tasks, internal notes, blockers, action items
- **Features**: Links to app for full project access

#### Executive Reports
- **Purpose**: High-level briefings for leadership and owners
- **Data Filtering**: Aggregated summaries, no granular details
- **Language**: Executive-friendly, scannable format
- **Content**: At-a-glance metrics, key highlights, status indicators
- **Features**: Multi-project rollups, traffic light indicators

### 2. Full Customization

Every report is fully customizable:

- **Custom Subject Lines**: Override default subjects with personalized text
- **Personal Messages**: Add context, notes, or explanations for recipients
- **Flexible Sections**: Toggle which sections to include (status changes, task completion, phase progress, executive summaries)
- **Branding**: Organization logo, custom colors, company footer, email signature
- **Section Ordering**: Customize the order of content sections

### 3. Flexible Scheduling

Reports can be sent on various schedules:

- **Weekly**: Every 7 days
- **Bi-weekly**: Every 14 days
- **Monthly**: Same day each month
- **Custom**: Every N days (user-defined)
- **Manual Only**: No automatic sending (on-demand reports)

### 4. Smart Recipient Management

Leverage existing contacts or add external emails:

- **Contact Selector**: Choose from existing organization contacts
- **Type Filtering**: Filter by Team, Client, PM, External
- **Project Integration**: Quick-add from project crew members
- **Manual Entry**: Add external email addresses not in contacts
- **Recipient Types**: Configure To, CC, or BCC for each recipient
- **Type Badges**: Visual indicators showing contact types (Client, Team, etc.)

### 5. Approval Workflow

Client-facing reports can require approval before sending:

- **Draft → Review → Approve** workflow
- **Preview Before Approval**: Full email preview with recipient list
- **Reject with Feedback**: Provide reasons for rejection
- **Auto-send**: Internal reports can skip approval (optional)

### 6. Manual Sending & Export

Beyond scheduled sending:

- **Send Now**: Immediate sending for urgent updates or pre-meeting briefs
- **Export to PDF**: Generate print-ready PDFs for meetings
- **Test Send**: Preview emails by sending to your own address
- **Re-send**: Resend previous reports from history

## Technical Architecture

### Database Schema

Four new tables created:

1. **`progress_report_schedules`**: Store report configurations
   - Schedule settings (frequency, template, audience)
   - Custom content (subject, message, sections)
   - Approval workflow status
   - Next send date calculation

2. **`progress_report_recipients`**: Manage recipient lists
   - Links to contacts or stores manual emails
   - Recipient type (to, cc, bcc)
   - Active/inactive status

3. **`progress_report_history`**: Track sent reports
   - Snapshot of report data
   - Filtered data (based on audience)
   - Email delivery tracking
   - Manual vs scheduled sends

4. **`organization_branding`**: Store branding configuration
   - Logo URL
   - Primary and secondary colors
   - Company footer and email signature

### Backend Services

#### Core Logic Package (`packages/core-logic/src/services/`)

**`progressReportService.js`**:
- CRUD operations for schedules
- Recipient management
- Approval workflow functions
- Manual send and test send
- Next send date calculation
- PDF export

**`brandingService.js`**:
- Get/update organization branding
- Logo upload to Supabase Storage
- Default branding settings

#### Supabase Edge Functions

**`generate-progress-report`**:
- Fetches schedule configuration
- Queries activity_log for changes in reporting period
- Retrieves current project/organization state
- Applies audience-based data filtering
- Generates executive summaries for leadership reports
- Returns structured report data

**`send-progress-report`**:
- Validates approval status (if required)
- Calls `generate-progress-report` for data
- Fetches organization branding
- Generates HTML email using appropriate template
- Sends email via Resend API
- Records in history table
- Updates schedule with next send date

**`process-scheduled-reports`**:
- Cron job that runs hourly
- Queries active schedules where `next_send_at <= now()`
- Processes each due schedule
- Handles errors gracefully
- Continues processing even if individual reports fail

**`export-progress-report-pdf`**:
- Generates PDF version of reports
- Used for pre-meeting briefings
- Returns print-ready HTML or PDF buffer

### Frontend Components

#### Main Components

**`ProgressReportBuilder.jsx`**:
- 5-step wizard for creating/editing reports
- Step 1: Basic info (name, audience, template)
- Step 2: Content customization (subject, message, sections)
- Step 3: Recipients (contact selector)
- Step 4: Schedule settings (frequency, approval)
- Step 5: Preview and test

**`ContactSelector.jsx`**:
- Search and filter existing contacts
- Add manual email addresses
- Configure recipient types (To, CC, BCC)
- Display contact type badges
- Warnings for client recipients

**`ProgressReportModal.jsx`**:
- Project-level report management
- List of project-specific schedules
- Quick actions: Send Now, Export PDF, Edit, Delete
- Embedded ProgressReportBuilder

**`ProgressReportDashboard.jsx`**:
- Organization-wide report management
- Statistics dashboard (active schedules, reports sent, pending approvals)
- Active schedules list with quick actions
- Recent reports history with re-send capability

**`ProgressReportPreview.jsx`**:
- Live email preview with sample data
- Switch between template types
- Display recipient list
- Send test email button

**`ProgressReportApproval.jsx`**:
- Approval queue for pending reports
- Full report preview before approval
- Approve/reject with feedback
- Bulk approval workflow

**`BrandingSettings.jsx`**:
- Logo uploader with image preview
- Color pickers for primary/secondary colors
- Company footer editor (HTML supported)
- Email signature configuration
- Live preview of branding

### Email Templates

Located in `src/utils/progressReportEmailTemplates.js`:

**Three template generator functions**:
1. `generateClientReportEmail()` - Clean, professional client updates
2. `generateInternalReportEmail()` - Detailed technical reports
3. `generateExecutiveReportEmail()` - High-level executive briefs

**Features**:
- Responsive HTML design (600px max width)
- Inline CSS for email client compatibility
- Mobile-friendly layouts
- Color-coded change highlighting
- Organization branding integration
- No authentication required to view

## Data Privacy & Security

### Audience-Based Filtering

**Client Reports** exclude:
- Internal task notes and discussions
- Budget and cost information
- Team member performance data
- Pending/incomplete internal tasks
- Technical identifiers and system IDs

**Internal Reports** include:
- All task details and internal notes
- Budget and hours tracking
- Team discussions and blockers
- Technical terminology
- Full access to all data

**Executive Reports** focus on:
- High-level summaries only
- Key metrics (on track, at risk, behind)
- Major milestones, not granular tasks
- Risk highlights and attention items

### Row Level Security

RLS policies enforce:
- Users can only view schedules in their organization
- Users need `can_manage_progress_reports` permission to create/edit
- Project-level schedules require project access
- History is read-only for organization members

**Important**: Email recipients do NOT need to log in. Emails are self-contained HTML with all content embedded.

## Permissions

New permission: `can_manage_progress_reports`

**Default assignments**:
- ✅ Org Admin: Yes
- ✅ Project Manager: Yes
- ❌ Regular Team Members: No
- ❌ Clients: No

Permission guards integrated in:
- ProjectDetailsView (Progress Reports button)
- DashboardView (ProgressReportDashboard section)
- SettingsView (BrandingSettings section)

## Integration Points

### Project Details View
- **Location**: Button in project header (next to "Manage Crew")
- **Icon**: Chart bar icon with "Progress Reports" label
- **Access**: Opens ProgressReportModal
- **Guard**: `<PermissionGuard permission="can_manage_progress_reports">`

### Dashboard View
- **Location**: New section after DashboardStats
- **Component**: ProgressReportDashboard
- **Features**: Org-wide schedules, stats, quick create
- **Guard**: Entire section wrapped in PermissionGuard

### Settings View
- **Location**: New "Report Branding" card in settings grid
- **Component**: BrandingSettings
- **Purpose**: Configure organization branding for emails
- **Guard**: PermissionGuard for visibility

## Activity Logging

Progress reports track three types of changes:

1. **Project Status Changes** (already tracked)
   - Logged when project status field changes
   - Includes old and new status values

2. **Task Completion** (already tracked)
   - Logged when tasks are marked complete
   - Includes completion timestamp and assignee

3. **Phase Progress Changes** (newly added)
   - Logged when project phase progress % changes
   - Includes old and new progress values
   - Implementation in `BuildPath.jsx` component

## Workflow Examples

### Creating a Weekly Client Report

1. User opens Project Details View
2. Clicks "Progress Reports" button
3. Clicks "Create New Report"
4. **Step 1**: Names report "Weekly Client Update", selects "Client" audience
5. **Step 2**: Adds custom message: "Here's your weekly progress update"
6. **Step 3**: Selects client contacts from project crew
7. **Step 4**: Selects "Weekly" frequency, enables approval requirement
8. **Step 5**: Previews email, sends test to themselves
9. Saves as draft, submits for approval
10. Org Admin approves report
11. Report automatically sends every week with filtered data

### Sending a Manual Executive Brief

1. User opens Dashboard View
2. Navigates to Progress Reports section
3. Clicks "Create New Report"
4. Selects "Executive" audience type
5. Adds multiple recipients (executives, owners)
6. Sets frequency to "Manual Only"
7. Activates schedule
8. Clicks "Send Now" to send immediately before board meeting
9. Also exports to PDF for in-person presentation

## Email Features

### No Login Required
- Recipients receive complete, self-contained HTML emails
- All content embedded directly in email body
- No download links or authentication needed
- Works in all major email clients (Gmail, Outlook, Apple Mail)

### Professional Design
- Responsive mobile-friendly layout
- Organization logo and branding colors
- Clean typography and spacing
- Color-coded status indicators
- Progress bars for phase tracking

### Change Highlighting
- ✅ Green: Completed items and positive changes
- ⚠️ Yellow: Status changes and updates
- 📈 Blue: Progress increases
- 🔴 Red: Issues and delays (internal reports only)

## Database Tables

### progress_report_schedules
Primary configuration table for scheduled reports.

**Key Fields**:
- `report_audience_type`: client | internal | executive
- `template_type`: client_standard | internal_detailed | executive_summary | custom
- `frequency`: weekly | bi-weekly | monthly | custom | manual
- `report_sections`: JSONB with toggleable sections
- `approval_status`: draft | pending_review | approved | rejected
- `next_send_at`: Calculated based on frequency

### progress_report_recipients
Stores recipient email addresses with contact linking.

**Key Fields**:
- `contact_id`: Link to existing contact (nullable)
- `email`: Recipient email address
- `recipient_type`: to | cc | bcc
- `is_active`: Enable/disable without deleting

### progress_report_history
Audit trail of all sent reports.

**Key Fields**:
- `report_data`: Full report snapshot
- `filtered_data`: Data after audience filtering
- `sent_at`: Timestamp of sending
- `was_manual_send`: Distinguish manual vs scheduled
- `email_id`: Resend tracking ID

### organization_branding
Branding configuration per organization.

**Key Fields**:
- `logo_url`: Public URL to logo image
- `primary_color`: Hex color for headers (#3B82F6)
- `secondary_color`: Hex color for accents (#10B981)
- `company_footer`: HTML footer content
- `email_signature`: Signature block

## Files Created

### Database & Migrations
- `scripts/migrations/add-progress-reports.sql` - Main migration script
- `scripts/migrations/rollback-progress-reports.sql` - Rollback script

### Backend Services
- `packages/core-logic/src/services/progressReportService.js` - Report CRUD operations
- `packages/core-logic/src/services/brandingService.js` - Branding management

### Edge Functions
- `supabase/functions/generate-progress-report/index.ts` - Report generation & filtering
- `supabase/functions/send-progress-report/index.ts` - Email sending & history
- `supabase/functions/process-scheduled-reports/index.ts` - Cron processor
- `supabase/functions/export-progress-report-pdf/index.ts` - PDF export

### Frontend Components
- `src/components/ContactSelector.jsx` - Recipient selection UI
- `src/components/ProgressReportBuilder.jsx` - 5-step creation wizard
- `src/components/ProgressReportModal.jsx` - Project-level modal
- `src/components/ProgressReportDashboard.jsx` - Org-wide dashboard
- `src/components/ProgressReportPreview.jsx` - Email preview
- `src/components/ProgressReportApproval.jsx` - Approval workflow UI
- `src/components/BrandingSettings.jsx` - Branding configuration

### Utilities
- `src/utils/progressReportEmailTemplates.js` - Email HTML generators

### Documentation
- `docs/progress-reports-scheduling-setup.md` - Scheduling guide

### Modified Files
- `src/views/ProjectDetailsView.jsx` - Added Progress Reports button
- `src/views/DashboardView.jsx` - Added ProgressReportDashboard section
- `src/views/SettingsView.jsx` - Added BrandingSettings section
- `src/components/BuildPath.jsx` - Added phase progress logging
- `src/utils/activityLogger.js` - Added logPhaseProgressChange function
- `packages/core-logic/src/index.js` - Export new services

## Setup Instructions

### 1. Database Setup

Run the migration script in your Supabase SQL editor:

```bash
# Copy contents of scripts/migrations/add-progress-reports.sql
# Paste and execute in Supabase SQL Editor
```

This creates:
- 4 new tables
- 9 indexes for performance
- RLS policies for security
- Default permissions for roles
- Default branding for existing organizations

### 2. Deploy Edge Functions

Deploy the 4 edge functions to Supabase:

```bash
supabase functions deploy generate-progress-report
supabase functions deploy send-progress-report
supabase functions deploy process-scheduled-reports
supabase functions deploy export-progress-report-pdf
```

### 3. Configure Environment

Ensure the following environment variables are set in Supabase:

- `RESEND_API_KEY` - Your Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (already configured)

### 4. Set Up Scheduling

Choose one option from `docs/progress-reports-scheduling-setup.md`:

**Option A: pg_cron (Recommended)**:
```sql
SELECT cron.schedule(
  'process-scheduled-reports',
  '0 * * * *', -- Every hour
  $$ SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/process-scheduled-reports', ...) $$
);
```

**Option B: External Cron**: Use cron-job.org or similar service

**Option C: Manual**: Trigger manually during development

### 5. Test the Feature

1. Log in as Org Admin or Project Manager
2. Navigate to any project → Click "Progress Reports"
3. Create a test schedule
4. Set frequency to "Manual Only"
5. Add your email as recipient
6. Click "Send Now" to test
7. Check your email inbox

## Usage Guide

### For Project Managers

**To create a client report**:
1. Open project → "Progress Reports"
2. Click "Create New Report"
3. Select "Client" audience type
4. Customize subject and add personal message
5. Select client contacts from project crew
6. Set frequency (e.g., Weekly)
7. Enable "Require approval"
8. Save and submit for approval

**To send urgent update**:
1. Open existing schedule
2. Click "Send Now"
3. Report sent immediately to all recipients

### For Organization Admins

**To create organization-wide report**:
1. Dashboard → Progress Reports section
2. Click "Create New Report"
3. Select "Executive" audience type
4. Add all executives as recipients
5. Set to monthly frequency
6. Activate schedule

**To approve pending reports**:
1. Dashboard → Progress Reports
2. See "Pending Approvals" count
3. Click "Review →"
4. Preview each report
5. Approve or reject with feedback

### For Owners/Executives

**No action required** - simply receive and read emails:
- Emails arrive on schedule
- Open in any email client
- No login needed
- Professional, branded format
- High-level summaries

## Data Tracked in Reports

### Status Changes
- Old status → New status
- Who made the change
- When change occurred
- Project name (for org-wide reports)

### Task Completion
- Task title/description
- Completion date
- Assignee (internal reports only)
- Project association

### Phase Progress
- Phase name
- Progress percentage change (e.g., 60% → 80%)
- Visual progress bars
- Project association

### Executive Summaries (Executive Reports)
- Projects on track / at risk / behind
- Total tasks completed
- Key highlights (top 3-5 updates)
- Attention required items

## Security Considerations

### Data Filtering
- Server-side filtering in edge functions
- Client reports: sensitive data removed before sending
- Cannot be bypassed by clients
- Logged in history for audit trail

### Authentication
- Only authenticated users can create schedules (RLS enforced)
- Recipients don't need authentication (emails self-contained)
- Approval workflow prevents accidental external data leaks

### Rate Limiting
- Resend API has rate limits (check your plan)
- Manual sends can be throttled if needed
- Scheduled sends spread throughout the day

## Limitations & Considerations

### Current Limitations

1. **Email Service**: Requires Resend API (or similar service)
2. **PDF Export**: Currently returns HTML for browser printing (full PDF generation TBD)
3. **Analytics**: No email open rates or click tracking yet
4. **Attachments**: No file attachments support (by design - inline only)
5. **Unsubscribe**: Unsubscribe mechanism not yet implemented (future enhancement)

### Best Practices

1. **Test Before Activating**: Always send test emails before activating schedules
2. **Use Approval for Clients**: Enable approval workflow for all client-facing reports
3. **Personalize Messages**: Add context in custom message field
4. **Configure Branding**: Set up organization branding before sending first report
5. **Review Frequency**: Don't over-email - weekly or bi-weekly is usually sufficient
6. **Monitor History**: Check sent reports to ensure they're going out correctly

### Performance Notes

- Reports with many projects (50+) may take longer to generate
- Recommendation: Limit organization reports to active projects only
- Activity log queries are indexed for performance
- Email generation is async (doesn't block user interface)

## Future Enhancements

Potential additions for future versions:

1. **Unsubscribe Management**: Proper unsubscribe links and preference management
2. **Email Analytics**: Track open rates and link clicks
3. **Advanced PDF Export**: Full server-side PDF generation with Puppeteer
4. **File Attachments**: Attach photos or documents to reports
5. **Report Templates Library**: Save custom templates for reuse
6. **Multi-language Support**: Translate reports for international clients
7. **Slack/Teams Integration**: Send reports to collaboration platforms
8. **Custom KPIs**: Allow organizations to define custom metrics

## Troubleshooting

### Reports Not Sending

**Check**:
1. Is schedule active? (`is_active = true`)
2. Is `next_send_at` in the past?
3. Does schedule require approval? Is it approved?
4. Is RESEND_API_KEY configured?
5. Check edge function logs in Supabase dashboard

### Recipients Not Receiving

**Check**:
1. Verify email addresses are correct
2. Check spam/junk folders
3. Verify Resend API key is valid
4. Review `progress_report_history` to confirm send
5. Check recipient `is_active` status

### Data Not Showing in Reports

**Check**:
1. Verify changes occurred during reporting period
2. Check activity_log table has entries
3. Ensure phase progress logging is working
4. Verify project_id filter is correct
5. Review filtered_data in history table

### Permission Errors

**Check**:
1. User has `can_manage_progress_reports` permission
2. User's role has correct permissions JSONB
3. Run migration to add permission to roles
4. User is in correct organization

## Support & Maintenance

### Monitoring

Monitor these metrics:
- Number of active schedules
- Reports sent per month
- Pending approvals
- Failed sends (check edge function logs)

### Database Maintenance

Periodically clean up old history:
```sql
-- Delete history older than 1 year
DELETE FROM progress_report_history 
WHERE sent_at < NOW() - INTERVAL '1 year';
```

### Updating Templates

Email templates can be updated by modifying:
- `src/utils/progressReportEmailTemplates.js` (frontend preview)
- `supabase/functions/send-progress-report/index.ts` (actual email generation)

Note: Templates are inline - changes take effect immediately without migration.

## Summary

The Progress Reports feature provides a professional, flexible, and secure way to keep stakeholders informed about project progress. With audience-specific templates, intelligent data filtering, and comprehensive customization options, it serves the needs of clients, internal teams, and executives while maintaining data privacy and security.

Key benefits:
- ✅ Saves time with automated scheduling
- ✅ Professional branded emails
- ✅ Protects sensitive data with filtering
- ✅ Flexible for different audiences
- ✅ Integrated with existing project data
- ✅ No login required for recipients
- ✅ Full approval workflow for client reports
