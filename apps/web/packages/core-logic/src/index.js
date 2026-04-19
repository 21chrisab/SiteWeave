// Export Supabase client
export * from './supabase/client.js';

export {
  computeWeightedProjectProgressPercent,
  groupPhasesByProjectId,
} from './utils/projectProgressRollup.js';

// Export services
export * from './services/tasksService.js';
export * from './services/projectsService.js';
export * from './services/messagesService.js';
export * from './services/calendarService.js';
export * from './services/issuesService.js';
export * from './services/activityService.js';
export * from './services/fileService.js';
export * from './services/typingService.js';
export * from './services/contactsService.js';
export * from './services/moderationService.js';
export * from './services/weatherImpactsService.js';
