# Dynamic Workflow Field Issues System

A powerful, flexible field issues management system that allows Project Managers to create custom workflows for each issue. This replaces the rigid 5-step workflow with a dynamic, customizable workflow builder.

## 🎯 Key Features

### **Dynamic Workflow Builder**
- **Custom Workflows**: PMs create unique workflows for each issue
- **Flexible Steps**: Add as many or as few steps as needed
- **Role Assignment**: Assign each step to specific team members
- **Visual Progress**: Real-time workflow progression tracking

### **Issue Management**
- **Issue Cards**: Display all active issues with custom workflows
- **Priority Levels**: Critical, High, Medium, Low with color coding
- **Due Dates**: Track issue deadlines and urgency
- **Status Tracking**: Open, Closed, Cancelled states

### **Workflow Orchestration**
- **Automatic Handoffs**: Workflows advance automatically when steps complete
- **Real-time Notifications**: Team members get instant updates
- **File Attachments**: Upload files at any step
- **Comment System**: Track progress and communication

## 🏗️ Database Architecture

### **Two-Table Design**

#### **project_issues** (Parent Table)
```sql
- id (Primary Key)
- project_id (Links to projects)
- title (Issue title)
- description (Issue description)
- status (open, closed, cancelled)
- current_step_id (Active step reference)
- priority (Critical, High, Medium, Low)
- created_at, updated_at, due_date, resolved_at
- created_by_user_id
```

#### **issue_steps** (Child Table)
```sql
- id (Primary Key)
- issue_id (Links to project_issues)
- step_order (1, 2, 3... sequence)
- description (Task description)
- assigned_to_user_id (User UUID)
- assigned_to_name (Display name)
- assigned_to_role (Role title)
- status (pending, in_progress, completed, skipped)
- completed_at, completed_by_user_id
- notes, created_at, updated_at
```

### **Supporting Tables**
- **issue_files**: File attachments with step linking
- **issue_comments**: Comments and step change history

## 🚀 Setup Instructions

### 1. Database Migration
```sql
-- Run the new schema
\i create_dynamic_workflow_issues.sql

-- Insert sample data
\i dynamic_workflow_sample_data.sql
```

### 2. Component Integration
The component is already integrated into `ProjectDetailsView.jsx` and will appear between Tasks and Files sections.

## 💼 Usage Examples

### **Example 1: Soil Conflict Issue**
**PM creates a 3-step workflow:**
1. **Step 1**: "Survey new elevation at B-4" → Assign to: Sarah Johnson (Surveyor)
2. **Step 2**: "Re-estimate earthwork costs" → Assign to: David Wilson (Estimator)  
3. **Step 3**: "Submit change order to client" → Assign to: Mike Chen (PM)

**Workflow in Action:**
- Surveyor gets notification: "Survey new elevation at B-4"
- Surveyor completes task, uploads topo file, clicks "Mark Step Complete"
- System automatically advances to Step 2
- Estimator gets notification: "Re-estimate earthwork costs"
- Process continues until all steps complete

### **Example 2: Foundation Crack Assessment**
**PM creates a 4-step workflow:**
1. **Step 1**: "Conduct structural assessment" → Assign to: Sarah Johnson (Surveyor)
2. **Step 2**: "Consult with structural engineer" → Assign to: Dr. Emily Rodriguez (Engineer)
3. **Step 3**: "Prepare repair plan and estimate" → Assign to: David Wilson (Estimator)
4. **Step 4**: "Present findings to client" → Assign to: Mike Chen (PM)

### **Example 3: Material Delivery Delay**
**PM creates a 2-step workflow:**
1. **Step 1**: "Contact alternative suppliers" → Assign to: Jennifer Lee (Procurement)
2. **Step 2**: "Update construction schedule" → Assign to: Mike Chen (PM)

## 🎨 User Interface

### **Create Issue Modal**
When PM clicks "Create Issue," they see:

#### **Part 1: Issue Details**
- Issue Title: "Soil conflict in Sector C"
- Description: "Hit unexpected rock shelf at grid line B-4..."
- Priority: Dropdown (Critical, High, Medium, Low)
- Due Date: Date picker

#### **Part 2: Workflow Builder**
- **Step 1**: [Text Input: "Enter task description..."] [Assign to: "Name, Role, User ID"]
- **+ Add Step** button to add more steps
- **Remove Step** button (if more than 1 step)
- **Reorder Steps** automatically

### **Issue Display**
- **Issue Cards**: Show title, description, priority, progress
- **Workflow Tracker**: Visual progress bar with step numbers
- **Current Step**: Highlighted in blue
- **Completed Steps**: Green checkmarks
- **Expandable**: Click to see action panel

### **Action Panels**
- **Assigned Users**: See action buttons and file upload
- **Other Users**: See read-only status information
- **File Upload**: Upload supporting documents
- **Step Completion**: Mark step complete to advance workflow

## ⚙️ Technical Implementation

### **Workflow Progression Logic**
```sql
-- When a step is completed, trigger automatically:
1. Mark current step as 'completed'
2. Find next step (step_order + 1)
3. Update project_issues.current_step_id
4. If no more steps, mark issue as 'closed'
```

### **Real-time Updates**
- Supabase real-time subscriptions
- Automatic UI refresh after actions
- Toast notifications for user feedback
- Progress tracking updates

### **File Management**
- Supabase Storage integration
- File type detection and categorization
- Step-specific file linking
- Upload progress indicators

## 🔧 Customization Options

### **Adding New Workflow Steps**
1. PM clicks "+ Add Step" in modal
2. Fills in task description and assignment
3. System automatically reorders steps
4. Workflow is saved with new step

### **Modifying Existing Workflows**
- Steps can be reordered
- Assignments can be changed
- New steps can be inserted
- Steps can be removed (if not completed)

### **Role-Based Actions**
- **Surveyors**: Upload survey reports and photos
- **Estimators**: Upload cost estimates and calculations
- **Engineers**: Upload technical assessments
- **Project Managers**: Approve, reject, or request changes

## 📊 Workflow Analytics

### **Progress Tracking**
- Step completion rates
- Average time per step
- Bottleneck identification
- Team member workload

### **Issue Metrics**
- Total issues created
- Issues by priority
- Resolution times
- File upload statistics

## 🔒 Security & Permissions

### **Row Level Security (RLS)**
- Users can only view issues for accessible projects
- File access restricted to project members
- Step updates limited to assigned users
- Comment permissions based on project access

### **Data Validation**
- Required field validation
- Step order integrity
- User assignment validation
- File type and size limits

## 🚨 Error Handling

### **Common Scenarios**
- **Missing Assignments**: Prevent saving incomplete workflows
- **File Upload Failures**: Graceful error handling with retry
- **Step Completion Errors**: Rollback on failure
- **Permission Denied**: Clear error messages

### **User Feedback**
- Toast notifications for all actions
- Loading states during operations
- Clear error messages
- Success confirmations

## 🔄 Migration from Fixed Workflow

### **Data Migration**
```sql
-- Convert existing field_issues to new structure
-- Map fixed steps to custom workflow steps
-- Preserve existing file attachments
-- Maintain user assignments
```

### **Backward Compatibility**
- Existing issues continue to work
- Gradual migration to new system
- Legacy workflow support
- Data integrity maintained

## 🎯 Future Enhancements

### **Planned Features**
- **Workflow Templates**: Save common workflows for reuse
- **Conditional Steps**: If/then logic in workflows
- **Parallel Steps**: Multiple steps running simultaneously
- **Step Dependencies**: Steps that depend on others
- **Time Tracking**: Track time spent on each step
- **Mobile App**: Native mobile workflow management
- **Integration**: Connect with external project management tools

### **Advanced Workflow Features**
- **Approval Chains**: Multiple approval levels
- **Escalation Rules**: Automatic escalation for delays
- **SLA Tracking**: Service level agreement monitoring
- **Workflow Analytics**: Advanced reporting and insights

## 📱 Mobile Responsiveness

### **Responsive Design**
- Mobile-optimized workflow builder
- Touch-friendly interface
- Swipe gestures for navigation
- Offline capability for field work

### **Mobile-Specific Features**
- Camera integration for photos
- GPS location tagging
- Offline file upload queue
- Push notifications for step assignments

## 🧪 Testing

### **Unit Tests**
- Workflow creation and modification
- Step completion logic
- File upload functionality
- Permission validation

### **Integration Tests**
- Database operations
- Real-time updates
- File storage integration
- User authentication

### **User Acceptance Tests**
- PM workflow creation
- Team member task completion
- File upload and sharing
- Progress tracking

## 📚 API Documentation

### **REST Endpoints**
```
GET /api/issues - List issues for project
POST /api/issues - Create new issue
PUT /api/issues/:id - Update issue
DELETE /api/issues/:id - Delete issue

GET /api/issues/:id/steps - List workflow steps
POST /api/issues/:id/steps - Add workflow step
PUT /api/steps/:id - Update step
DELETE /api/steps/:id - Remove step

POST /api/steps/:id/complete - Complete step
POST /api/steps/:id/files - Upload file
```

### **Real-time Events**
```
issue_created - New issue created
step_completed - Step marked complete
workflow_advanced - Workflow moved to next step
file_uploaded - File attached to step
```

## 🆘 Support & Troubleshooting

### **Common Issues**
1. **Workflow not advancing**: Check step completion logic
2. **Files not uploading**: Verify Supabase Storage configuration
3. **Permissions denied**: Check RLS policies
4. **Real-time updates missing**: Verify Supabase subscriptions

### **Debug Mode**
Enable detailed logging:
```javascript
const DEBUG_WORKFLOW = true; // In component
```

### **Database Queries**
Test workflow functionality:
```sql
-- Check issue workflow
SELECT * FROM project_issues WHERE id = 1;
SELECT * FROM issue_steps WHERE issue_id = 1 ORDER BY step_order;

-- Check step completion
SELECT * FROM issue_steps WHERE status = 'completed';
```

## 📄 License

This dynamic workflow system is part of the SiteWeave project management application and follows the same licensing terms.

---

**The Dynamic Workflow Field Issues System transforms your project management from a rigid, one-size-fits-all approach to a flexible, powerful workflow orchestration platform that adapts to your team's unique processes and requirements.**
