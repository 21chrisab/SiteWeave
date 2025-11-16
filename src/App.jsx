import React from 'react'
import { Link, Route, Routes, useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LoadingSpinner from './components/LoadingSpinner'
import MessageItem from './components/MessageItem'
import { fetchChannelMessages, sendMessage, fetchUnreadCounts, getTypingUsers, createDebouncedTypingStatus, setTypingStatus, markMessageAsRead, fetchMessageReactions } from './utils/messageService.js'

function UseSession() {
  const [session, setSession] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  
  return { session, loading }
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      navigate('/')
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      setError('Google login failed: ' + error.message)
      setIsLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid email profile'
      }
    })
    if (error) {
      setError('Microsoft login failed: ' + error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to SiteWeave
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Client Portal
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>

              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                  <path fill="#7fba00" d="M1 13h10v10H1z"/>
                  <path fill="#ffb900" d="M13 13h10v10H13z"/>
                </svg>
                <span className="ml-2">Outlook</span>
              </button>
            </div>
          </div>
      </form>
      </div>
    </div>
  )
}

function TaskItem({ task, onToggle }) {
  const handleCheckboxChange = (e) => {
    e.stopPropagation()
    onToggle(task.id, task.completed)
  }

  const formatTaskDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today'
    } else if (taskDate.getTime() === today.getTime() + 86400000) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0 pt-0.5">
          <input
            type="checkbox"
            checked={task.completed || false}
            onChange={handleCheckboxChange}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all hover:scale-110"
            aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${task.text || 'Task'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-gray-800 ${task.completed ? 'line-through text-gray-400' : ''}`}>
                {task.text || 'Untitled Task'}
              </h4>
              {task.description && (
                <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-600'} line-clamp-1`}>
                  {task.description}
                </p>
              )}
              {task.project && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 font-semibold">PROJECT</p>
                  <Link
                    to={`/projects/${task.project_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {task.project.name}
                  </Link>
                </div>
              )}
            </div>
            {task.due_date && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 font-semibold">DUE DATE</p>
                <p className={`text-sm font-medium ${task.completed ? 'text-gray-400' : 'text-gray-800'}`}>
                  {formatTaskDate(task.due_date)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Home() {
  const { session } = UseSession()
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState([])
  const [tasks, setTasks] = React.useState([])
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [projectsResult, tasksResult] = await Promise.all([
          supabase.from('projects').select('*').order('updated_at', { ascending: false }),
          session ? supabase.from('tasks').select('*').eq('completed', false).order('due_date', { ascending: true }) : Promise.resolve({ data: [], error: null })
        ])
        
        if (projectsResult.error) throw projectsResult.error
        if (tasksResult.error) throw tasksResult.error
        
        const projectsData = projectsResult.data || []
        const tasksData = tasksResult.data || []
        
        // Match tasks with their projects
        const tasksWithProjects = tasksData.map(task => ({
          ...task,
          project: projectsData.find(p => p.id === task.project_id)
        }))
        
        if (!cancelled) {
          setProjects(projectsData)
          setTasks(tasksWithProjects)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setProjects([])
          setTasks([])
          setError(e.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [session])

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'planning':
        return 'bg-blue-100 text-blue-800'
      case 'in progress':
        return 'bg-green-100 text-green-800'
      case 'on hold':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-16 max-w-6xl px-4">
        <LoadingSpinner size="lg" text="Loading your projects..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-6xl px-4">
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-800">
            <p className="font-semibold">Error loading projects</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const formatTaskDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today'
    } else if (taskDate.getTime() === today.getTime() + 86400000) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-6xl px-4 pb-16">
      <h1 className="mb-4 text-3xl font-bold text-gray-800">Your Projects</h1>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No projects available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {projects.map(p => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-3 cursor-pointer hover:border-blue-500 transition-all hover:shadow-md group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  {p.project_type && (
                    <p className="text-xs text-gray-500 mt-1">{p.project_type}</p>
                  )}
                </div>
                {p.status && (
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                )}
              </div>
              
              {p.address && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold">ADDRESS</p>
                  <p className="text-sm text-gray-700 mt-1">{p.address}</p>
                </div>
              )}
              
              {p.due_date && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold">DUE DATE</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">{formatDate(p.due_date)}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-4 text-3xl font-bold text-gray-800">Your Tasks</h2>
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">No tasks at this time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={async (taskId, currentStatus) => {
                  try {
                    const { error } = await supabase
                      .from('tasks')
                      .update({ completed: !currentStatus })
                      .eq('id', taskId)
                    
                    if (error) throw error
                    
                    // Remove from list if completed
                    if (!currentStatus) {
                      setTasks(prev => prev.filter(t => t.id !== taskId))
                    }
                  } catch (e) {
                    console.error('Error updating task:', e)
                    alert('Error updating task: ' + e.message)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Messages() {
  const sessionData = UseSession()
  const session = sessionData.session
  const [channels, setChannels] = React.useState([])
  const [selectedChannelId, setSelectedChannelId] = React.useState(null)
  const [messages, setMessages] = React.useState([])
  const [projects, setProjects] = React.useState([])
  const [newMessage, setNewMessage] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [typingUsers, setTypingUsers] = React.useState([])
  const [unreadCounts, setUnreadCounts] = React.useState({})
  const messagesEndRef = React.useRef(null)
  const messagesContainerRef = React.useRef(null)
  const previousMessageCountRef = React.useRef(0)
  const isUserScrollingRef = React.useRef(false)
  const scrollTimeoutRef = React.useRef(null)
  const debouncedTypingRef = React.useRef(null)
  const hasAutoSelectedChannelRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch projects
        const { data: projectsData } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
        if (!cancelled) setProjects(projectsData || [])

        // Fetch message channels
        const { data: channelsData } = await supabase.from('message_channels').select('*').order('name')
        if (!cancelled) {
          setChannels(channelsData || [])
          if (channelsData && channelsData.length > 0 && !selectedChannelId && !hasAutoSelectedChannelRef.current) {
            setSelectedChannelId(channelsData[0].id)
            hasAutoSelectedChannelRef.current = true
          }
        }
      } catch (e) {
        console.error('Error loading messages:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (!selectedChannelId || !session?.user?.id) return
    
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchChannelMessages(supabase, selectedChannelId, session.user.id)
        if (!cancelled) setMessages(data || [])
      } catch (e) {
        console.error('Error loading messages:', e)
      }
    })()
    return () => { cancelled = true }
  }, [selectedChannelId, session?.user?.id])

  // Load unread counts
  React.useEffect(() => {
    if (channels.length > 0 && session?.user?.id) {
      const channelIds = channels.map(ch => ch.id)
      fetchUnreadCounts(supabase, session.user.id, channelIds)
        .then(counts => setUnreadCounts(counts))
        .catch(err => console.error('Error fetching unread counts:', err))
    }
  }, [channels, session?.user?.id, messages.length])

  // Mark messages as read when viewing
  React.useEffect(() => {
    const activeChannel = channels.find(c => c.id === selectedChannelId)
    const channelMessages = messages.filter(msg => msg.channel_id === selectedChannelId && !msg.parent_message_id)
    
    if (activeChannel && channelMessages.length > 0 && session?.user?.id) {
      const lastMessage = channelMessages[channelMessages.length - 1]
      if (lastMessage && !lastMessage.isRead) {
        markMessageAsRead(supabase, lastMessage.id, session.user.id)
          .catch(err => console.error('Error marking message as read:', err))
      }
    }
  }, [selectedChannelId, messages.length, session?.user?.id])

  // Typing indicator setup
  React.useEffect(() => {
    if (selectedChannelId && session?.user?.id) {
      debouncedTypingRef.current = createDebouncedTypingStatus(
        supabase, 
        selectedChannelId, 
        session.user.id
      )
    }
    return () => {
      if (debouncedTypingRef.current && selectedChannelId && session?.user?.id) {
        setTypingStatus(supabase, selectedChannelId, session.user.id, false)
      }
    }
  }, [selectedChannelId, session?.user?.id])

  // Fetch typing users
  React.useEffect(() => {
    if (!selectedChannelId || !session?.user?.id) return
    
    const interval = setInterval(async () => {
      try {
        const users = await getTypingUsers(supabase, selectedChannelId, session.user.id)
        setTypingUsers(users)
      } catch (err) {
        console.error('Error fetching typing users:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedChannelId, session?.user?.id])

  // Check if user is near the bottom of the scroll container
  const isNearBottom = React.useCallback(() => {
    if (!messagesContainerRef.current) return true
    const container = messagesContainerRef.current
    const threshold = 100 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // Handle scroll events to detect user scrolling
  const handleScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    isUserScrollingRef.current = true
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false
    }, 150)
  }, [])

  // Auto-scroll only when appropriate
  React.useEffect(() => {
    const channelMessages = messages.filter(msg => msg.channel_id === selectedChannelId && !msg.parent_message_id)
    
    // Check if this is a new message (count increased) or channel change
    const currentMessageCount = channelMessages.length
    const isNewMessage = currentMessageCount > previousMessageCountRef.current
    const isChannelChange = previousMessageCountRef.current === 0
    
    // Only auto-scroll if:
    // 1. It's a new message AND user is near bottom (or channel just changed)
    // 2. OR channel changed (initial load)
    if ((isNewMessage && (isNearBottom() || isChannelChange)) || isChannelChange) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (!isUserScrollingRef.current || isChannelChange) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
    
    previousMessageCountRef.current = currentMessageCount
  }, [messages.length, selectedChannelId, isNearBottom])

  // Real-time subscriptions
  React.useEffect(() => {
    if (!selectedChannelId) return

    const channelMessages = messages.filter(msg => msg.channel_id === selectedChannelId && !msg.parent_message_id)

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${selectedChannelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${selectedChannelId}`
      }, async (payload) => {
        if (!payload.new.parent_message_id) {
          // Fetch user info for new message
          const userIds = [payload.new.user_id].filter(Boolean)
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, contact_id')
              .in('id', userIds)
            
            if (profiles && profiles.length > 0) {
              const contactIds = profiles.map(p => p.contact_id).filter(Boolean)
              if (contactIds.length > 0) {
                const { data: contacts } = await supabase
                  .from('contacts')
                  .select('id, name, avatar_url')
                  .in('id', contactIds)
                
                if (contacts && contacts.length > 0) {
                  const profile = profiles[0]
                  const contact = contacts.find(c => c.id === profile.contact_id)
                  if (contact) {
                    payload.new.user = {
                      id: profile.id,
                      name: contact.name,
                      avatar_url: contact.avatar_url
                    }
                  }
                }
              }
            }
          }
          setMessages(prev => [...prev, payload.new])
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${selectedChannelId}`
      }, (payload) => {
        setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg))
      })
      .subscribe()

    // Subscribe to reactions
    const messageIds = channelMessages.map(m => m.id)
    if (messageIds.length > 0) {
      const reactionsChannel = supabase
        .channel(`reactions:${selectedChannelId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(${messageIds.join(',')})`
        }, async () => {
          // Refetch reactions for visible messages
          const reactions = await fetchMessageReactions(supabase, messageIds)
          setMessages(prev => prev.map(msg => ({
            ...msg,
            reactions: reactions[msg.id] || []
          })))
        })
        .subscribe()

      // Subscribe to typing indicators
      const typingChannel = supabase
        .channel(`typing:${selectedChannelId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `channel_id=eq.${selectedChannelId}`
        }, async () => {
          if (session?.user?.id) {
            const users = await getTypingUsers(supabase, selectedChannelId, session.user.id)
            setTypingUsers(users)
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(messagesChannel)
        supabase.removeChannel(reactionsChannel)
        supabase.removeChannel(typingChannel)
      }
    }

    return () => {
      supabase.removeChannel(messagesChannel)
    }
  }, [selectedChannelId, messages.length, session?.user?.id])

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedChannelId || !session) return

    setSending(true)
    try {
      await sendMessage(supabase, {
        channel_id: selectedChannelId,
        user_id: session.user.id,
        content: newMessage.trim(),
        type: 'text',
        topic: 'General',
        extension: 'txt'
      })
      setNewMessage('')
      
      // Clear typing status
      if (debouncedTypingRef.current) {
        debouncedTypingRef.current(false)
      }
    } catch (e) {
      console.error('Error sending message:', e)
      alert('Error sending message: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setNewMessage(value)
    
    // Update typing indicator
    if (debouncedTypingRef.current && value.trim()) {
      debouncedTypingRef.current(true)
    } else if (debouncedTypingRef.current && !value.trim()) {
      debouncedTypingRef.current(false)
    }
  }

  const getProjectForChannel = (channelId) => {
    const channel = channels.find(c => c.id === channelId)
    return projects.find(p => p.id === channel?.project_id)
  }

  // Message grouping logic - group consecutive messages from same user within the same minute
  const groupedMessages = React.useMemo(() => {
    const channelMessages = messages.filter(msg => msg.channel_id === selectedChannelId && !msg.parent_message_id)
    if (!channelMessages.length) return []
    
    // Sort messages by created_at to ensure chronological order
    const sortedMessages = [...channelMessages].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    )
    
    const grouped = []
    let currentGroup = null
    
    const getMinuteKey = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      // Create a key based on year, month, day, hour, and minute
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    sortedMessages.forEach((msg, index) => {
      const prevMsg = index > 0 ? sortedMessages[index - 1] : null
      const isSameUser = prevMsg && prevMsg.user_id === msg.user_id
      const isSameMinute = prevMsg && getMinuteKey(msg.created_at) === getMinuteKey(prevMsg.created_at)
      
      // Check if we can add to current group (same user, same minute)
      if (isSameUser && isSameMinute && currentGroup && currentGroup.user_id === msg.user_id) {
        // Same user, same minute - group it (no timestamp, no avatar)
        currentGroup.messages.push({ 
          ...msg, 
          isGrouped: true, 
          showAvatar: false, 
          showTimestamp: false 
        })
      } else {
        // Start a new group
        if (currentGroup) grouped.push(currentGroup)
        // New group - first message shows timestamp and avatar
        currentGroup = {
          id: msg.id,
          user_id: msg.user_id,
          user: msg.user,
          created_at: msg.created_at,
          messages: [{ 
            ...msg, 
            isGrouped: false, 
            showAvatar: true, 
            showTimestamp: true 
          }]
        }
      }
    })
    
    if (currentGroup) grouped.push(currentGroup)
    return grouped
  }, [messages, selectedChannelId])

  if (loading) {
    return (
      <div className="mx-auto mt-16 max-w-6xl px-4">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    )
  }

  const activeChannel = channels.find(c => c.id === selectedChannelId)
  const activeProject = getProjectForChannel(selectedChannelId)

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Messages</h1>
      
      <div className="flex h-[calc(100vh-12rem)] border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Channels Sidebar */}
        <aside className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Projects</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {channels.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No message channels available
              </div>
            ) : (
              <div className="space-y-1">
                {channels.map(channel => {
                  const project = getProjectForChannel(channel.id)
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedChannelId === channel.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="font-medium"># {project?.name || channel.name}</div>
                      {(unreadCounts[channel.id] > 0 || project?.notification_count > 0) && (
                        <span className="inline-block mt-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {unreadCounts[channel.id] || project?.notification_count || 0}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Messages Area */}
        <main className="flex-1 flex flex-col">
          {activeChannel ? (
            <>
              <header className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-800"># {activeProject?.name || activeChannel.name}</h3>
              </header>
              
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
                onScroll={handleScroll}
              >
                {groupedMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  groupedMessages.map((group, groupIdx) => (
                    <div key={group.id} className="space-y-1">
                      {group.messages.map((msg, idx) => {
                        // Check if this is the very last message in the entire channel
                        const isLastMessageInChannel = 
                          groupIdx === groupedMessages.length - 1 && 
                          idx === group.messages.length - 1
                        
                        const isCurrentUser = msg.user_id === session?.user?.id
                        
                        return (
                          <MessageItem 
                            key={msg.id} 
                            message={msg} 
                            isGrouped={msg.isGrouped}
                            showAvatar={msg.showAvatar}
                            showTimestamp={msg.showTimestamp}
                            isLastInChannel={isLastMessageInChannel}
                            isCurrentUser={isCurrentUser}
                            currentUserId={session?.user?.id}
                          />
                        )
                      })}
                    </div>
                  ))
                )}
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-500 italic mt-2">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0]?.name || 'Someone'} is typing...`
                      : `${typingUsers[0]?.name || 'Someone'} and ${typingUsers.length - 1} other${typingUsers.length > 2 ? 's' : ''} are typing...`
                    }
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a project to view messages
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ProjectDetails() {
  const { id } = useParams()
  const [project, setProject] = React.useState(null)
  const [files, setFiles] = React.useState([])
  const [phases, setPhases] = React.useState([])
  const [tasks, setTasks] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [projectResult, filesResult, phasesResult, tasksResult] = await Promise.all([
          supabase.from('projects').select('*').eq('id', id).maybeSingle(),
          supabase.from('files').select('*').eq('project_id', id).order('modified_at', { ascending: false }),
          supabase.from('project_phases').select('*').eq('project_id', id).order('order', { ascending: true }),
          supabase.from('tasks').select('*').eq('project_id', id).eq('completed', false).order('due_date', { ascending: true })
        ])
        
        if (projectResult.error) throw projectResult.error
        if (filesResult.error) throw filesResult.error
        if (phasesResult.error) throw phasesResult.error
        if (tasksResult.error) throw tasksResult.error
        
        if (!cancelled) {
          setProject(projectResult.data)
          setFiles(filesResult.data || [])
          setPhases(phasesResult.data || [])
          setTasks(tasksResult.data || [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatTaskDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'planning':
        return 'bg-blue-100 text-blue-800'
      case 'in progress':
        return 'bg-green-100 text-green-800'
      case 'on hold':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4">
        <LoadingSpinner size="lg" text="Loading project details..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-800">
            <p className="font-semibold">Error loading project</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Project not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 pb-16">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {project.name}
            </h2>
            {project.address && (
              <p className="text-sm text-gray-600">{project.address}</p>
            )}
          </div>
          {project.status && (
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          )}
        </div>
      </div>

      {/* Main Layout: Action Items (main) + Sidebar (Photos & Milestones) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content: Action Items */}
        <div className="lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-800">Action Items</h3>
            <p className="text-sm text-gray-600 mt-1">Tasks and items that need attention</p>
          </div>
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 font-medium">No action items at this time.</p>
              <p className="text-sm text-gray-500 mt-1">All tasks are complete!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-500 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-800 mb-1">{t.text || 'Untitled Task'}</h4>
                      {t.description && (
                        <p className="text-sm text-gray-600 mt-2">{t.description}</p>
                      )}
                    </div>
                    {t.due_date && (
                      <div className="ml-4 text-right flex-shrink-0">
                        <p className="text-xs text-gray-400 font-semibold">DUE DATE</p>
                        <p className="text-sm font-medium text-gray-800 mt-1">{formatTaskDate(t.due_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Photos & Milestones */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photos Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Photos</h3>
            {files.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500">No photos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {files.slice(0, 4).map(f => (
                  <a
                    key={f.id}
                    href={f.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-gray-200 hover:border-blue-500 transition-all group"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {f.file_url ? (
                        <img
                          src={f.file_url}
                          alt={f.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className="hidden w-full h-full items-center justify-center bg-gray-100">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {files.length > 4 && (
              <p className="text-xs text-gray-500 text-center mt-2">+{files.length - 4} more</p>
            )}
          </div>

          {/* Milestones Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Milestones</h3>
            {phases.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-xs text-gray-500">No milestones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {phases.map(p => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-semibold text-gray-800 truncate">{p.name}</h4>
                      <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">{p.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


export default function App() {
  const { session, loading } = UseSession()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Handle OAuth callback
  React.useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/')
      }
    }
    handleAuthCallback()
  }, [navigate])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors" to="/">
              SiteWeave
            </Link>
            <div className="flex items-center space-x-6">
          {session ? (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive('/') && !isActive('/messages') && !isActive('/projects')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    Projects
                  </Link>
                  <Link
                    to="/messages"
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive('/messages')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    Messages
                  </Link>
                  <span className="text-sm text-gray-600">
                    {session.user.email}
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={session ? <Home /> : <Login />} />
        <Route path="/messages" element={session ? <Messages /> : <Login />} />
        <Route path="/projects/:id" element={session ? <ProjectDetails /> : <Login />} />
      </Routes>
    </div>
  )
}
