/**
 * Tasks Service
 * Handles all task-related database operations
 */

/**
 * Fetch all tasks
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @returns {Promise<Array>} Array of tasks
 */
export async function fetchTasks(supabase) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch tasks assigned to a specific user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function fetchUserTasks(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch incomplete tasks assigned to a user
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of incomplete tasks
 */
export async function fetchUserIncompleteTasks(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Create a new task
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createTask(supabase, taskData) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a task
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} taskId - Task ID
 * @param {Object} updates - Task updates
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(supabase, taskId, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Mark a task as complete
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export async function completeTask(supabase, taskId) {
  return updateTask(supabase, taskId, { completed: true });
}

/**
 * Delete a task
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(supabase, taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
}

