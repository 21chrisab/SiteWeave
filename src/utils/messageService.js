/**
 * Message Service Utilities
 * Simplified versions of message functions for the web app
 */

/**
 * Helper function to fetch user info from contacts via profiles
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Object>} Object mapping user_id to user info
 */
async function fetchUserInfo(supabase, userIds) {
  if (!userIds || userIds.length === 0) return {}
  
  // First, get profiles with contact_ids
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, contact_id')
    .in('id', userIds)
  
  if (profilesError) throw profilesError
  if (!profiles || profiles.length === 0) return {}
  
  // Get unique contact IDs
  const contactIds = [...new Set(profiles.map(p => p.contact_id).filter(Boolean))]
  if (contactIds.length === 0) return {}
  
  // Then, fetch contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, name, avatar_url')
    .in('id', contactIds)
  
  if (contactsError) throw contactsError
  
  // Create a map of contact_id to contact info
  const contactMap = {}
  ;(contacts || []).forEach(contact => {
    contactMap[contact.id] = contact
  })
  
  // Map profiles to user info
  const userMap = {}
  profiles.forEach(profile => {
    if (profile.contact_id && contactMap[profile.contact_id]) {
      const contact = contactMap[profile.contact_id]
      userMap[profile.id] = {
        id: profile.id,
        name: contact.name,
        avatar_url: contact.avatar_url
      }
    }
  })
  
  return userMap
}

/**
 * Fetch messages for a specific channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - Current user ID for read status
 * @returns {Promise<Array>} Array of messages with user info, reactions, and read status
 */
export async function fetchChannelMessages(supabase, channelId, userId = null) {
  // Fetch top-level messages only (exclude thread replies)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .is('parent_message_id', null)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  if (!data || data.length === 0) return []
  
  // Fetch user info for all message authors
  const userIds = [...new Set(data.map(m => m.user_id).filter(Boolean))]
  const userInfo = await fetchUserInfo(supabase, userIds)
  
  // Fetch reactions for all messages
  const messageIds = data.map(m => m.id)
  const reactions = await fetchMessageReactions(supabase, messageIds)
  
  // Fetch read status if userId provided
  let readStatuses = {}
  if (userId) {
    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('user_id', userId)
    
    if (reads) {
      readStatuses = reads.reduce((acc, read) => {
        acc[read.message_id] = true
        return acc
      }, {})
    }
  }
  
  // Attach user info, reactions and read status to messages
  return data.map(message => ({
    ...message,
    user: userInfo[message.user_id] || null,
    reactions: reactions[message.id] || [],
    isRead: readStatuses[message.id] || false
  }))
}

/**
 * Send a message to a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message with user info
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
    .select('*')
    .single()
  
  if (error) throw error
  
  // Fetch user info for the message author
  if (data.user_id) {
    const userInfo = await fetchUserInfo(supabase, [data.user_id])
    data.user = userInfo[data.user_id] || null
  }
  
  return data
}

/**
 * Fetch unread message counts per channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {Array<string>} channelIds - Array of channel IDs
 * @returns {Promise<Object>} Object mapping channel_id to unread count
 */
export async function fetchUnreadCounts(supabase, userId, channelIds) {
  if (!channelIds || channelIds.length === 0) return {}
  
  // Get last read message for each channel
  const { data: channelReads, error: readsError } = await supabase
    .from('channel_reads')
    .select('channel_id, last_read_message_id, last_read_at')
    .eq('user_id', userId)
    .in('channel_id', channelIds)
  
  if (readsError) throw readsError
  
  const readMap = {}
  ;(channelReads || []).forEach(read => {
    readMap[read.channel_id] = {
      lastReadMessageId: read.last_read_message_id,
      lastReadAt: read.last_read_at
    }
  })
  
  // Count unread messages for each channel
  const unreadCounts = {}
  
  for (const channelId of channelIds) {
    const readInfo = readMap[channelId]
    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .is('parent_message_id', null) // Only count top-level messages
    
    if (readInfo && readInfo.lastReadMessageId) {
      // Count messages after last read
      query = query.gt('created_at', readInfo.lastReadAt || new Date(0).toISOString())
    }
    
    const { count, error } = await query
    if (error) throw error
    unreadCounts[channelId] = count || 0
  }
  
  return unreadCounts
}

/**
 * Get current typing users in a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} currentUserId - Current user ID (to exclude from results)
 * @returns {Promise<Array>} Array of typing users
 */
export async function getTypingUsers(supabase, channelId, currentUserId = null) {
  const { data: indicators, error } = await supabase
    .from('typing_indicators')
    .select('user_id')
    .eq('channel_id', channelId)
    .eq('is_typing', true)
    .gt('updated_at', new Date(Date.now() - 5000).toISOString())
    .neq('user_id', currentUserId)
  
  if (error) throw error
  if (!indicators || indicators.length === 0) return []
  
  // Get unique user IDs
  const userIds = [...new Set(indicators.map(i => i.user_id))]
  
  // Get profiles with contact_ids
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, contact_id')
    .in('id', userIds)
  
  if (!profiles || profiles.length === 0) return []
  
  // Get unique contact IDs
  const contactIds = [...new Set(profiles.map(p => p.contact_id).filter(Boolean))]
  if (contactIds.length === 0) return []
  
  // Fetch contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, avatar_url')
    .in('id', contactIds)
  
  if (!contacts) return []
  
  // Create contact map
  const contactMap = {}
  contacts.forEach(contact => {
    contactMap[contact.id] = contact
  })
  
  // Map to return format
  return profiles
    .filter(profile => profile.contact_id && contactMap[profile.contact_id])
    .map(profile => {
      const contact = contactMap[profile.contact_id]
      return {
        id: profile.id,
        name: contact.name,
        avatar_url: contact.avatar_url
      }
    })
}

/**
 * Set typing status for a user in a channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @param {boolean} isTyping - Whether user is typing
 * @returns {Promise<void>}
 */
export async function setTypingStatus(supabase, channelId, userId, isTyping = true) {
  if (isTyping) {
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        channel_id: channelId,
        user_id: userId,
        is_typing: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'channel_id,user_id'
      })
    
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('typing_indicators')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId)
    
    if (error) throw error
  }
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
  let lastUpdate = 0
  const DEBOUNCE_MS = 1000 // Max 1 update per second
  
  return async (isTyping = true) => {
    const now = Date.now()
    if (now - lastUpdate < DEBOUNCE_MS && isTyping) {
      return // Skip if too soon and still typing
    }
    
    lastUpdate = now
    await setTypingStatus(supabase, channelId, userId, isTyping)
  }
}

/**
 * Fetch message reactions with user info and counts
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {Array<string>} messageIds - Array of message IDs
 * @returns {Promise<Object>} Object mapping message_id to array of reactions with counts
 */
export async function fetchMessageReactions(supabase, messageIds) {
  if (!messageIds || messageIds.length === 0) return {}
  
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .in('message_id', messageIds)
  
  if (error) throw error
  
  // Fetch user info for all reaction authors
  const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))]
  const userInfo = await fetchUserInfo(supabase, userIds)
  
  // Group reactions by message_id and emoji, count users
  const reactionsMap = {}
  ;(data || []).forEach(reaction => {
    if (!reactionsMap[reaction.message_id]) {
      reactionsMap[reaction.message_id] = {}
    }
    if (!reactionsMap[reaction.message_id][reaction.emoji]) {
      reactionsMap[reaction.message_id][reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      }
    }
    reactionsMap[reaction.message_id][reaction.emoji].count++
    if (userInfo[reaction.user_id]) {
      reactionsMap[reaction.message_id][reaction.emoji].users.push(userInfo[reaction.user_id])
    }
  })
  
  // Convert to array format
  const result = {}
  Object.keys(reactionsMap).forEach(messageId => {
    result[messageId] = Object.values(reactionsMap[messageId])
  })
  
  return result
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
    })
  
  if (error) throw error
  
  // Update channel_reads with latest read message
  const { data: message } = await supabase
    .from('messages')
    .select('channel_id, created_at')
    .eq('id', messageId)
    .single()
  
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
      })
  }
}

