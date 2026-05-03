// Export Supabase client
export * from './supabase/client.js';

// Progress rollup (duration-weighted; prefers stored phase progress)
export {
  computeWeightedProjectProgressPercent,
  computeProjectScheduleTimeline,
  groupPhasesByProjectId,
  inferScheduleBoundsFromTasks,
} from './utils/projectProgressRollup.js';

export {
  addBusinessDays,
  inclusiveBusinessDaysLost,
  inclusiveBusinessDaysInRange,
  buildFederalHolidayMap,
  businessDaysBetween,
} from './utils/usBusinessCalendar.js';

export { normalizeAssigneePhone } from './utils/assigneePhone.js';

// Export services
export * from './services/tasksService.js';
export * from './services/projectsService.js';
export * from './services/messagesService.js';
export * from './services/calendarService.js';
export * from './services/issuesService.js';
export * from './services/activityService.js';
export * from './services/fileService.js';
export * from './services/taskPhotosService.js';
export * from './services/typingService.js';
export * from './services/contactsService.js';
export * from './services/moderationService.js';
export * from './services/progressReportService.js';
export * from './services/brandingService.js';
export * from './services/weatherImpactsService.js';

