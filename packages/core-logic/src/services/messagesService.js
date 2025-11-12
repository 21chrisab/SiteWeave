/**
 * Messages Service
 * Handles all message-related database operations
 */

/**
 * Fetch all message channels
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @returns {Promise<Array>} Array of message channels
 */
export async function fetchMessageChannels(supabase) {
  const { data, error } = await supabase
    .from('message_channels')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch messages for a specific channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @returns {Promise<Array>} Array of messages
 */
export async function fetchChannelMessages(supabase, channelId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, user:user_id(name, avatar_url)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Send a message to a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message
 */
export async function sendMessage(supabase, messageData) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...messageData,
      created_at: new Date().toISOString(),
      inserted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('*, user:user_id(name, avatar_url)')
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new message channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} channelData - Channel data
 * @returns {Promise<Object>} Created channel
 */
export async function createMessageChannel(supabase, channelData) {
  const { data, error } = await supabase
    .from('message_channels')
    .insert(channelData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

