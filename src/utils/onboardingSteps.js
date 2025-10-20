// Comprehensive onboarding steps configuration - 6 key steps
export const onboardingSteps = [
  // Phase 1: Dashboard Overview (1 step)
  {
    id: 'dashboard-overview',
    view: 'Dashboard',
    selector: '[data-onboarding="project-grid"]',
    title: 'Welcome to Your Dashboard',
    description: 'This is your project command center. Here you can see all your construction projects at a glance, track their progress, and manage your daily tasks.',
    position: 'center',
    action: null
  },

  // Phase 2: Projects Management (2 steps)
  {
    id: 'projects-overview',
    view: 'Projects',
    selector: '[data-onboarding="project-header"]',
    title: 'Project Details View',
    description: 'This is where you manage individual projects in detail. You can see all project information, tasks, files, and team members.',
    position: 'bottom',
    action: null
  },
  {
    id: 'projects-tasks',
    view: 'Projects',
    selector: '[data-onboarding="tasks-section"]',
    title: 'Task Management',
    description: 'The tasks section is where you break down your project into manageable pieces. Add, edit, complete, or delete tasks as needed.',
    position: 'top',
    action: null
  },

  // Phase 3: Calendar (2 steps)
  {
    id: 'calendar-overview',
    view: 'Calendar',
    selector: '[data-onboarding="calendar-container"]',
    title: 'Project Calendar',
    description: 'Visualize all your project deadlines, meetings, and milestones in one calendar. This helps you plan and track project timelines.',
    position: 'center',
    action: null
  },
  {
    id: 'calendar-add-event',
    view: 'Calendar',
    selector: '[data-onboarding="add-event-btn"]',
    title: 'Schedule Events',
    description: 'Click any date to schedule a new event or meeting. You can set reminders and invite team members.',
    position: 'left',
    action: null
  },

  // Phase 4: Contacts (1 step)
  {
    id: 'contacts-overview',
    view: 'Contacts',
    selector: '[data-onboarding="contacts-list"]',
    title: 'You\'re All Set!',
    description: 'Congratulations! You\'ve completed the tour. You now know how to use SiteWeave to manage your construction projects. Start by creating your first project!',
    position: 'center',
    action: 'complete'
  }
];

// Helper function to get steps by view
export const getStepsByView = (view) => {
  return onboardingSteps.filter(step => step.view === view);
};

// Helper function to get step by ID
export const getStepById = (id) => {
  return onboardingSteps.find(step => step.id === id);
};

// Helper function to get total steps count
export const getTotalSteps = () => {
  return onboardingSteps.length;
};
