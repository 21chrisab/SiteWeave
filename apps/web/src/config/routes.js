export const ROUTE_PATHS = {
  home: '/',
  projects: '/projects',
  project: '/projects/:id',
  projectTasks: '/projects/:id/tasks',
  projectGantt: '/projects/:id/gantt',
  projectFieldIssues: '/projects/:id/field-issues',
  projectActivity: '/projects/:id/activity',
  messages: '/messages',
  calendar: '/calendar',
  team: '/team',
  teamDirectory: '/team/directory',
  organization: '/organization',
  settings: '/settings',
  notifications: '/settings/notifications',
  login: '/login',
  invite: '/invite/:token',
}

export const PRIMARY_NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTE_PATHS.home },
  { label: 'Projects', to: ROUTE_PATHS.projects },
  { label: 'Calendar', to: ROUTE_PATHS.calendar },
  { label: 'Team', to: ROUTE_PATHS.team },
  { label: 'Organization', to: ROUTE_PATHS.organization },
  { label: 'Settings', to: ROUTE_PATHS.settings },
]
