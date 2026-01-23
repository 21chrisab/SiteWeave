/**
 * Lazy Data Loader
 * Functions to load non-critical data on-demand
 */

/**
 * Load tasks if not already loaded
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Function} dispatch - Redux-like dispatch function
 * @param {Object} state - Current app state
 */
export async function loadTasksIfNeeded(supabaseClient, dispatch, state) {
  if (state.tasksLoaded) {
    console.log('Tasks already loaded, skipping');
    return;
  }

  console.log('📦 Lazy loading tasks...');
  const startTime = performance.now();
  
  try {
    const { data: tasks, error } = await supabaseClient
      .from('tasks')
      .select('*, contacts(name, avatar_url)');
    
    if (error) throw error;
    
    const endTime = performance.now();
    console.log(`✅ Tasks loaded in ${Math.round(endTime - startTime)}ms`);
    
    dispatch({ type: 'SET_TASKS_LOADED', payload: tasks || [] });
  } catch (error) {
    console.error('Error loading tasks:', error);
    dispatch({ type: 'SET_TASKS_LOADED', payload: [] });
  }
}

/**
 * Load files if not already loaded
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Function} dispatch - Redux-like dispatch function
 * @param {Object} state - Current app state
 */
export async function loadFilesIfNeeded(supabaseClient, dispatch, state) {
  if (state.filesLoaded) {
    console.log('Files already loaded, skipping');
    return;
  }

  console.log('📦 Lazy loading files...');
  const startTime = performance.now();
  
  try {
    const { data: files, error } = await supabaseClient
      .from('files')
      .select('*');
    
    if (error) throw error;
    
    const endTime = performance.now();
    console.log(`✅ Files loaded in ${Math.round(endTime - startTime)}ms`);
    
    dispatch({ type: 'SET_FILES_LOADED', payload: files || [] });
  } catch (error) {
    console.error('Error loading files:', error);
    dispatch({ type: 'SET_FILES_LOADED', payload: [] });
  }
}

/**
 * Load calendar events if not already loaded
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Function} dispatch - Redux-like dispatch function
 * @param {Object} state - Current app state
 */
export async function loadCalendarEventsIfNeeded(supabaseClient, dispatch, state) {
  if (state.calendarEventsLoaded) {
    console.log('Calendar events already loaded, skipping');
    return;
  }

  console.log('📦 Lazy loading calendar events...');
  const startTime = performance.now();
  
  try {
    const { data: calendarEvents, error } = await supabaseClient
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    const endTime = performance.now();
    console.log(`✅ Calendar events loaded in ${Math.round(endTime - startTime)}ms`);
    
    dispatch({ type: 'SET_CALENDAR_EVENTS_LOADED', payload: calendarEvents || [] });
  } catch (error) {
    console.error('Error loading calendar events:', error);
    dispatch({ type: 'SET_CALENDAR_EVENTS_LOADED', payload: [] });
  }
}

/**
 * Load tasks for a specific project (more efficient than loading all tasks)
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Function} dispatch - Redux-like dispatch function
 * @param {string} projectId - Project ID to load tasks for
 * @param {Object} state - Current app state
 */
export async function loadProjectTasks(supabaseClient, dispatch, projectId, state) {
  console.log(`📦 Loading tasks for project ${projectId}...`);
  const startTime = performance.now();
  
  try {
    const { data: tasks, error } = await supabaseClient
      .from('tasks')
      .select('*, contacts(name, avatar_url)')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    
    const endTime = performance.now();
    console.log(`✅ Project tasks loaded in ${Math.round(endTime - startTime)}ms`);
    
    // Merge with existing tasks (replace tasks for this project)
    const otherTasks = state.tasks.filter(t => t.project_id !== projectId);
    dispatch({ type: 'SET_TASKS_LOADED', payload: [...otherTasks, ...(tasks || [])] });
    
    return tasks || [];
  } catch (error) {
    console.error('Error loading project tasks:', error);
    return [];
  }
}

