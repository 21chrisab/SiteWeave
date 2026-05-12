import React from 'react'
import { useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const fnBase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL is not set')
  return `${url.replace(/\/$/, '')}/functions/v1/guest-task-share`
}

function parseDateOnly(iso) {
  if (!iso) return null
  const s = String(iso).slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(Date.UTC(y, m - 1, d))
}

/** Whole calendar days from today (local) until startDate (date-only), inclusive of start day as "0" when today === start */
function daysUntilOnSite(startDate) {
  const start = parseDateOnly(startDate)
  if (!start) return null
  const now = new Date()
  const utcToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const utcStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  return Math.round((utcStart - utcToday) / (24 * 60 * 60 * 1000))
}

/**
 * @returns {{ severity: 'critical' | 'warning' | 'info', message: string } | null}
 */
function getOnSiteNotice(task) {
  if (task.completed) return null
  if (!task.start_date) return null
  const days = daysUntilOnSite(task.start_date)
  if (days === null) return null
  if (days < 0) {
    return {
      severity: 'critical',
      message: 'This on-site date has passed. Contact your PM if that is unexpected.',
    }
  }
  if (days === 0) {
    return {
      severity: 'critical',
      message: 'You need to be on site today.',
    }
  }
  if (days === 1) {
    return {
      severity: 'critical',
      message: '1 day until you need to be on site.',
    }
  }
  if (days === 2) {
    return {
      severity: 'critical',
      message: '2 days until you need to be on site.',
    }
  }
  if (days <= 7) {
    return {
      severity: 'warning',
      message: `${days} days until you need to be on site.`,
    }
  }
  return {
    severity: 'info',
    message: `${days} days until you need to be on site.`,
  }
}

function noticeClass(severity) {
  if (severity === 'critical') {
    return 'bg-red-600 text-white border-b-4 border-red-900 shadow-md'
  }
  if (severity === 'warning') {
    return 'bg-amber-500 text-amber-950 border-b-4 border-amber-700 shadow-md'
  }
  return 'bg-sky-100 text-sky-950 border-b border-sky-200'
}

function cardBorderClass(task, notice) {
  if (task.completed) return 'border border-gray-200'
  if (!notice) {
    return task.start_date ? 'border-2 border-amber-400/80' : 'border border-amber-200'
  }
  if (notice.severity === 'critical') return 'border-2 border-red-700 ring-1 ring-red-300/60'
  if (notice.severity === 'warning') return 'border-2 border-amber-600'
  return 'border-2 border-sky-300'
}

export default function GuestTaskShareView() {
  const { token } = useParams()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [payload, setPayload] = React.useState(null)
  const [uploadingTaskId, setUploadingTaskId] = React.useState(null)
  const [uploadError, setUploadError] = React.useState(null)
  const fileInputs = React.useRef({})

  const rawToken = React.useMemo(() => {
    if (!token) return ''
    try {
      return decodeURIComponent(token)
    } catch {
      return token
    }
  }, [token])

  const load = React.useCallback(async () => {
    if (!rawToken) {
      setError('Invalid link')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(fnBase(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${rawToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || 'This link is invalid or has expired.')
        setPayload(null)
        return
      }
      setPayload(body)
    } catch (e) {
      setError(e?.message || 'Could not load this page.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [rawToken])

  React.useEffect(() => {
    load()
  }, [load])

  const handlePickFile = (taskId) => {
    setUploadError(null)
    fileInputs.current[taskId]?.click()
  }

  const handleFileChange = async (taskId, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !rawToken) return

    setUploadingTaskId(taskId)
    setUploadError(null)
    try {
      const form = new FormData()
      form.set('task_id', taskId)
      form.set('file', file)

      const res = await fetch(fnBase(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rawToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: form,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadError(body?.error || 'Upload failed')
        return
      }
      const photo = body?.photo
      if (photo) {
        setPayload((prev) => {
          if (!prev?.tasks) return prev
          return {
            ...prev,
            tasks: prev.tasks.map((t) => {
              if (t.id !== taskId) return t
              const photos = [...(t.photos || []), photo]
              return { ...t, photos }
            }),
          }
        })
      } else {
        await load()
      }
    } catch (e) {
      setUploadError(e?.message || 'Upload failed')
    } finally {
      setUploadingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" text="Loading tasks…" />
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Unable to open link</h1>
        <p className="text-gray-600 max-w-md">{error || 'Something went wrong.'}</p>
      </div>
    )
  }

  const { project, tasks } = payload

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">SiteWeave · View only</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{project?.name || 'Project'}</h1>
          {project?.address ? (
            <p className="text-sm text-gray-600 mt-1">{project.address}</p>
          ) : null}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <p className="text-sm text-gray-600">
          Your tasks are below. On-site reminders use each task&apos;s start date. You can add photos; the full project
          app is not shown here.
        </p>

        {uploadError ? (
          <div className="rounded-md bg-red-50 text-red-800 text-sm px-3 py-2">{uploadError}</div>
        ) : null}

        <ul className="space-y-3">
          {(tasks || []).map((task) => {
            const notice = getOnSiteNotice(task)
            return (
              <li
                key={task.id}
                className={`rounded-lg bg-white shadow-sm overflow-hidden ${cardBorderClass(task, notice)}`}
              >
                {notice ? (
                  <div
                    className={`px-3 py-3 sm:px-4 text-center text-sm sm:text-base font-bold tracking-tight ${noticeClass(notice.severity)}`}
                    role="status"
                  >
                    {notice.message}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 min-h-[48px]">
                  {task.completed ? (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 uppercase">
                      Completed
                    </span>
                  ) : null}
                  <span
                    className={`flex-1 min-w-0 text-sm sm:text-base leading-snug truncate ${task.completed ? 'text-gray-500 line-through' : 'font-medium text-gray-900'}`}
                  >
                    {task.text || 'Task'}
                  </span>
                  {!task.completed && !task.start_date ? (
                    <span className="shrink-0 text-xs text-amber-800 font-medium whitespace-nowrap">No on-site date</span>
                  ) : null}
                  {!task.completed ? (
                    <>
                      <input
                        ref={(el) => {
                          fileInputs.current[task.id] = el
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileChange(task.id, e)}
                      />
                      <button
                        type="button"
                        onClick={() => handlePickFile(task.id)}
                        disabled={uploadingTaskId === task.id}
                        className="shrink-0 inline-flex items-center rounded-md bg-gray-900 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {uploadingTaskId === task.id ? '…' : 'Photo'}
                      </button>
                    </>
                  ) : null}
                </div>

                {task.photos?.length ? (
                  <div className="px-3 pb-3 sm:px-4 grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {task.photos.map((p) => (
                      <a
                        key={p.id}
                        href={p.full_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        {p.thumbnail_url || p.full_url ? (
                          <img
                            src={p.thumbnail_url || p.full_url}
                            alt={p.caption || 'Task photo'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                            Photo
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
