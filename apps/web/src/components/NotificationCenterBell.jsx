import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function NotificationCenterBell() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  const loadNotifications = React.useCallback(async () => {
    const { data } = await supabase
      .from('user_notifications')
      .select('id,title,body,created_at,read_at,project_id,action_url')
      .order('created_at', { ascending: false })
      .limit(20)

    const list = data || []
    setItems(list)
    setUnreadCount(list.filter((item) => !item.read_at).length)
  }, [])

  React.useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleNotificationClick = async (id) => {
    setOpen(false)
    const current = items.find((item) => item.id === id)
    if (!current || current.read_at) return
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await supabase
      .from('user_notifications')
      .update({
        read_at: new Date().toISOString(),
        read_by_user_id: (await supabase.auth.getUser()).data?.user?.id || null,
      })
      .eq('id', id)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-md hover:bg-gray-100 text-gray-700"
        aria-label="Open notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 ? <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full px-1.5">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-800">Notification Center</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.action_url || (item.project_id ? `/projects/${item.project_id}/tasks` : '/')}
                className={`block px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${item.read_at ? 'bg-white' : 'bg-blue-50/40'}`}
                onClick={() => handleNotificationClick(item.id)}
              >
                <p className="text-sm font-medium text-gray-900">{item.title || 'Update'}</p>
                <p className="text-xs text-gray-600 mt-1">{item.body || 'You have a new notification'}</p>
                <p className="text-[11px] text-gray-400 mt-1">{new Date(item.created_at).toLocaleString()}</p>
              </Link>
            ))}
            {items.length === 0 ? <p className="p-3 text-sm text-gray-500">No notifications yet.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
