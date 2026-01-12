# Field Issues Component

A comprehensive field issues management system for the SiteWeave project management application. This component allows project teams to track, manage, and resolve field issues through a structured workflow.

## Features

### Issue Management
- **Issue Cards**: Display all active field issues with key information
- **Priority Levels**: Critical, High, Medium, Low with color-coded indicators
- **Due Dates**: Track issue deadlines and urgency
- **Assignment**: Assign issues to specific team members with roles

### Workflow Progression
- **5-Step Workflow**: New → Survey → Estimate → Approval → Closed
- **Visual Progress Tracker**: Horizontal progression bar showing current step
- **Step Highlighting**: Current step is actively highlighted in blue
- **Step Transitions**: Automatic progression when actions are completed

### Role-Based Action Panels
- **Context-Aware Actions**: Different tools based on user role and current step
- **File Upload**: Upload estimates, reports, and supporting documents
- **Action Buttons**: Submit estimates, approve changes, request modifications
- **Read-Only Status**: Non-assigned users see status information only

### File Management
- **File Upload**: Upload multiple file types (PDF, DOC, images)
- **File Storage**: Integrated with Supabase Storage
- **File Tracking**: Track uploaded files per issue
- **File Types**: Automatic file type detection and categorization

## Database Schema

### Tables Created
1. **field_issues**: Main issues table
2. **field_issue_files**: File attachments for issues
3. **field_issue_comments**: Comments and step change history

### Key Fields
- `project_id`: Links to projects table
- `current_step`: 0-4 representing workflow steps
- `assigned_to_user_id`: User assigned to current step
- `priority`: Critical, High, Medium, Low
- `status`: Active, Resolved, Closed

## Setup Instructions

### 1. Database Setup
Run the SQL scripts in order:

```sql
-- Create tables and relationships
\i create_field_issues_table.sql

-- Insert sample data (optional)
\i field_issues_sample_data.sql
```

### 2. Storage Setup
Ensure Supabase Storage bucket `project_files` exists and has proper permissions for field issue file uploads.

### 3. Component Integration
The component is already integrated into `ProjectDetailsView.jsx` and will appear between the Tasks and Files sections.

## Usage

### For Project Managers
- View all active issues for the project
- See current workflow status and assignments
- Monitor issue priorities and due dates
- Track file uploads and progress

### For Assigned Users
- Click on issue cards to expand action panels
- Upload required files (estimates, reports, surveys)
- Submit completed work to advance workflow
- See specific tools based on current step

### For Other Team Members
- View issue status and assignments
- See read-only information about progress
- Monitor overall project issue resolution

## Workflow Steps

1. **New** (Step 0)
   - Issue created and assigned
   - Initial assessment required

2. **Survey** (Step 1)
   - Site survey and assessment
   - Upload survey reports and photos

3. **Estimate** (Step 2)
   - Cost estimation and planning
   - Upload estimates and supporting documents

4. **Approval** (Step 3)
   - Review and approve estimates
   - Approve or request changes

5. **Closed** (Step 4)
   - Issue resolved and closed
   - Final documentation archived

## File Upload Support

### Supported File Types
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Images**: JPG, PNG, GIF
- **Other**: Any file type supported by the browser

### File Organization
Files are stored in Supabase Storage under:
```
project_files/field-issues/{issue_id}/{filename}
```

### File Metadata
Each uploaded file includes:
- Original filename
- File type classification
- File size in KB
- Upload timestamp
- Uploader information

## API Integration

### Supabase Queries
The component uses Supabase for:
- Fetching issues: `field_issues` table with joins
- File uploads: Supabase Storage integration
- Step updates: Real-time database updates
- Comments: Issue comment tracking

### Real-time Updates
- Automatic refresh after file uploads
- Step progression updates
- Comment additions
- Issue status changes

## Customization

### Adding New Workflow Steps
1. Update `workflowSteps` array in component
2. Add corresponding database values
3. Update action panel logic
4. Modify step transition logic

### Role-Based Actions
Customize action panels by modifying the `getActionPanelContent` function:
- Add new roles and their specific tools
- Modify file upload requirements
- Add custom action buttons
- Implement role-specific workflows

### Styling
The component uses Tailwind CSS classes and follows the existing design system:
- Consistent with other project components
- Responsive design for mobile and desktop
- Accessible color schemes and contrast
- Hover states and transitions

## Error Handling

### File Upload Errors
- Storage quota exceeded
- Invalid file types
- Network connectivity issues
- Permission errors

### Database Errors
- Connection failures
- Constraint violations
- Permission denied
- Data validation errors

### User Feedback
- Toast notifications for success/error states
- Loading indicators during operations
- Clear error messages
- Graceful fallbacks

## Security

### Row Level Security (RLS)
- Users can only view issues for accessible projects
- File access restricted to project members
- Comment permissions based on project access
- Assignment validation

### File Upload Security
- File type validation
- Size limits enforced
- Virus scanning (if configured)
- Access control through Supabase

## Performance

### Optimization Features
- Lazy loading of issue details
- Efficient database queries with joins
- Image optimization for uploads
- Caching of frequently accessed data

### Scalability
- Pagination for large issue lists
- Efficient file storage organization
- Database indexing for performance
- Real-time subscription management

## Troubleshooting

### Common Issues
1. **Issues not loading**: Check project_id and database connection
2. **File upload fails**: Verify Supabase Storage configuration
3. **Step updates not working**: Check user permissions and database constraints
4. **Real-time updates missing**: Verify Supabase real-time subscriptions

### Debug Mode
Enable console logging by setting:
```javascript
const DEBUG = true; // In component
```

### Database Queries
Test database connectivity with:
```sql
SELECT * FROM field_issues WHERE project_id = 1;
SELECT * FROM field_issue_files WHERE issue_id = 1;
```

## Future Enhancements

### Planned Features
- Email notifications for step changes
- Mobile app integration
- Advanced filtering and search
- Issue templates and categories
- Integration with external project management tools
- Advanced reporting and analytics
- Bulk issue operations
- Issue dependencies and relationships

### API Extensions
- RESTful API endpoints
- Webhook integrations
- Third-party tool connections
- Advanced query capabilities
- Export functionality

## Support

For technical support or feature requests:
1. Check the troubleshooting section
2. Review database logs
3. Test with sample data
4. Contact development team

## License

This component is part of the SiteWeave project management application and follows the same licensing terms.
