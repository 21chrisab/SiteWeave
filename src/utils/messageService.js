/**
 * Message Service Utilities
 * Simplified versions of message functions for the web app
 */

/**
 * Fetch messages for a specific channel
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {string} channelId - Channel ID
 * @param {string} userId - Current user ID for read status
 * @returns {Promise<Array>} Array of messages
 */
export async function fetchChannelMessages(supabase, channelId, userId = null) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .is('parent_message_id', null)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
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
    .select('*')
    .single()
  
  if (error) throw error
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
  
  const unreadCounts = {}
  
  for (const channelId of channelIds) {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .is('parent_message_id', null)
    
    if (error) {
      console.error('Error fetching unread count:', error)
      unreadCounts[channelId] = 0
    } else {
      unreadCounts[channelId] = count || 0
    }
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

