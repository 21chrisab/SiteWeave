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
 * @param {string} userId - Current user ID for read status
 * @returns {Promise<Array>} Array of messages with reactions and read status
 */
export async function fetchChannelMessages(supabase, channelId, userId = null) {
  // Fetch top-level messages only (exclude thread replies)
  const { data, error } = await supabase
    .from('messages')
    .select('*, user:user_id(name, avatar_url)')
    .eq('channel_id', channelId)
    .is('parent_message_id', null)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  if (!data || data.length === 0) return [];
  
  // Fetch reactions for all messages
  const messageIds = data.map(m => m.id);
  const reactions = await fetchMessageReactions(supabase, messageIds);
  
  // Fetch read status if userId provided
  let readStatuses = {};
  if (userId) {
    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('user_id', userId);
    
    if (reads) {
      readStatuses = reads.reduce((acc, read) => {
        acc[read.message_id] = true;
        return acc;
      }, {});
    }
  }
  
  // Attach reactions and read status to messages
  return data.map(message => ({
    ...message,
    reactions: reactions[message.id] || [],
    isRead: readStatuses[message.id] || false
  }));
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

/**
 * Fetch message reactions with user info and counts
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Array<string>} messageIds - Array of message IDs
 * @returns {Promise<Object>} Object mapping message_id to array of reactions with counts
 */
export async function fetchMessageReactions(supabase, messageIds) {
  if (!messageIds || messageIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, user:user_id(id, name, avatar_url)')
    .in('message_id', messageIds);
  
  if (error) throw error;
  
  // Group reactions by message_id and emoji, count users
  const reactionsMap = {};
  (data || []).forEach(reaction => {
    if (!reactionsMap[reaction.message_id]) {
      reactionsMap[reaction.message_id] = {};
    }
    if (!reactionsMap[reaction.message_id][reaction.emoji]) {
      reactionsMap[reaction.message_id][reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      };
    }
    reactionsMap[reaction.message_id][reaction.emoji].count++;
    reactionsMap[reaction.message_id][reaction.emoji].users.push(reaction.user);
  });
  
  // Convert to array format
  const result = {};
  Object.keys(reactionsMap).forEach(messageId => {
    result[messageId] = Object.values(reactionsMap[messageId]);
  });
  
  return result;
}

/**
 * Fetch unread message counts per channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {Array<string>} channelIds - Array of channel IDs
 * @returns {Promise<Object>} Object mapping channel_id to unread count
 */
export async function fetchUnreadCounts(supabase, userId, channelIds) {
  if (!channelIds || channelIds.length === 0) return {};
  
  // Get last read message for each channel
  const { data: channelReads, error: readsError } = await supabase
    .from('channel_reads')
    .select('channel_id, last_read_message_id, last_read_at')
    .eq('user_id', userId)
    .in('channel_id', channelIds);
  
  if (readsError) throw readsError;
  
  const readMap = {};
  (channelReads || []).forEach(read => {
    readMap[read.channel_id] = {
      lastReadMessageId: read.last_read_message_id,
      lastReadAt: read.last_read_at
    };
  });
  
  // Count unread messages for each channel
  const unreadCounts = {};
  
  for (const channelId of channelIds) {
    const readInfo = readMap[channelId];
    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .is('parent_message_id', null); // Only count top-level messages
    
    if (readInfo && readInfo.lastReadMessageId) {
      // Count messages after last read
      query = query.gt('created_at', readInfo.lastReadAt || new Date(0).toISOString());
    }
    
    const { count, error } = await query;
    if (error) throw error;
    unreadCounts[channelId] = count || 0;
  }
  
  return unreadCounts;
}

/**
 * Mark a message as read
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function markMessageAsRead(supabase, messageId, userId) {
  // Upsert read receipt
  const { error } = await supabase
    .from('message_reads')
    .upsert({
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString()
    }, {
      onConflict: 'message_id,user_id'
    });
  
  if (error) throw error;
  
  // Update channel_reads with latest read message
  const { data: message } = await supabase
    .from('messages')
    .select('channel_id, created_at')
    .eq('id', messageId)
    .single();
  
  if (message) {
    await supabase
      .from('channel_reads')
      .upsert({
        user_id: userId,
        channel_id: message.channel_id,
        last_read_message_id: messageId,
        last_read_at: message.created_at
      }, {
        onConflict: 'user_id,channel_id'
      });
  }
}

/**
 * Fetch thread replies for a message
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} parentMessageId - Parent message ID
 * @returns {Promise<Array>} Array of thread replies
 */
export async function fetchThreadReplies(supabase, parentMessageId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, user:user_id(name, avatar_url)')
    .eq('parent_message_id', parentMessageId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  if (!data || data.length === 0) return [];
  
  // Fetch reactions for thread replies
  const messageIds = data.map(m => m.id);
  const reactions = await fetchMessageReactions(supabase, messageIds);
  
  return data.map(message => ({
    ...message,
    reactions: reactions[message.id] || []
  }));
}

/**
 * Get thread reply count for a message
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} messageId - Message ID
 * @returns {Promise<number>} Reply count
 */
export async function getThreadReplyCount(supabase, messageId) {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('parent_message_id', messageId);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Send a reply to a message thread
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} messageData - Message data with parent_message_id
 * @returns {Promise<Object>} Created reply message
 */
export async function sendThreadReply(supabase, messageData) {
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
  
  // Update thread_reply_count on parent message
  if (messageData.parent_message_id) {
    const replyCount = await getThreadReplyCount(supabase, messageData.parent_message_id);
    await supabase
      .from('messages')
      .update({ thread_reply_count: replyCount })
      .eq('id', messageData.parent_message_id);
  }
  
  return data;
}

