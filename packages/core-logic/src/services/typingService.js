/**
 * Typing Service
 * Handles typing indicators with debouncing and auto-cleanup
 */

let typingTimeouts = new Map();

/**
 * Set typing status for a user in a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @param {boolean} isTyping - Whether user is typing
 * @returns {Promise<void>}
 */
export async function setTypingStatus(supabase, channelId, userId, isTyping = true) {
  // Clear existing timeout for this user/channel
  const key = `${channelId}-${userId}`;
  if (typingTimeouts.has(key)) {
    clearTimeout(typingTimeouts.get(key));
    typingTimeouts.delete(key);
  }

  if (isTyping) {
    // Upsert typing indicator
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        channel_id: channelId,
        user_id: userId,
        is_typing: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'channel_id,user_id'
      });

    if (error) throw error;

    // Set timeout to clear typing status after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      clearTypingStatus(supabase, channelId, userId);
      typingTimeouts.delete(key);
    }, 3000);

    typingTimeouts.set(key, timeout);
  } else {
    // Immediately clear typing status
    await clearTypingStatus(supabase, channelId, userId);
  }
}

/**
 * Clear typing status for a user in a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function clearTypingStatus(supabase, channelId, userId) {
  const { error } = await supabase
    .from('typing_indicators')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) throw error;

  // Clear timeout if exists
  const key = `${channelId}-${userId}`;
  if (typingTimeouts.has(key)) {
    clearTimeout(typingTimeouts.get(key));
    typingTimeouts.delete(key);
  }
}

/**
 * Get current typing users in a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} currentUserId - Current user ID (to exclude from results)
 * @returns {Promise<Array>} Array of typing users with user info
 */
export async function getTypingUsers(supabase, channelId, currentUserId = null) {
  const { data, error } = await supabase
    .from('typing_indicators')
    .select('*, user:user_id(id, name, avatar_url)')
    .eq('channel_id', channelId)
    .eq('is_typing', true)
    .gt('updated_at', new Date(Date.now() - 5000).toISOString()); // Only get recent (last 5 seconds)

  if (error) throw error;

  // Filter out current user and return user info
  const typingUsers = (data || [])
    .filter(indicator => indicator.user_id !== currentUserId)
    .map(indicator => indicator.user);

  return typingUsers;
}

/**
 * Debounced typing status setter
 * Creates a debounced version that only updates every 1 second max
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {Function} Debounced function
 */
export function createDebouncedTypingStatus(supabase, channelId, userId) {
  let lastUpdate = 0;
  const DEBOUNCE_MS = 1000; // Max 1 update per second

  return async (isTyping = true) => {
    const now = Date.now();
    if (now - lastUpdate < DEBOUNCE_MS && isTyping) {
      // Skip if too soon and still typing
      return;
    }

    lastUpdate = now;
    await setTypingStatus(supabase, channelId, userId, isTyping);
  };
}

