import React from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

function UseSession() {
  const [session, setSession] = React.useState(null)
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl border p-6">
      <h1 className="mb-4 text-xl font-semibold">Client Portal Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded-md border p-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full rounded-md bg-blue-600 p-2 text-white">Sign In</button>
      </form>
    </div>
  )
}

function Home() {
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
        if (error) throw error
        if (!cancelled) setProjects(data || [])
      } catch (_e) {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="mx-auto mt-16 max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">Your Projects</h1>
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-md border p-4 text-gray-600">No projects available.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map(p => (
            <li key={p.id} className="rounded-md border p-4">
              <div className="mb-2 text-lg font-semibold">{p.name}</div>
              <div className="mb-3 text-sm text-gray-600">{p.address}</div>
              <Link className="text-sm text-blue-600" to={`/projects/${p.id}`}>Open</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProjectLayout({ children }) {
  const { id } = useParams()
  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <h2 className="mb-4 text-xl font-semibold">Project {id}</h2>
      <div className="mb-4 flex gap-4 text-sm">
        <Link to={`/projects/${id}`}>Overview</Link>
        <Link to={`/projects/${id}/photos`}>Photos</Link>
        <Link to={`/projects/${id}/daily-logs`}>Daily Logs</Link>
        <Link to={`/projects/${id}/milestones`}>Milestones</Link>
        <Link to={`/projects/${id}/action-items`}>Action Items</Link>
      </div>
      {children}
    </div>
  )
}

const Overview = () => {
  const { id } = useParams()
  const [project, setProject] = React.useState(null)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
      if (!cancelled) setProject(data)
    })()
    return () => { cancelled = true }
  }, [id])
  return (
    <div className="rounded-md border p-4">
      {project ? (
        <div className="space-y-2">
          <div className="font-semibold">{project.name}</div>
          <div className="text-sm text-gray-600">{project.address}</div>
          <div className="text-sm">Status: {project.status}</div>
          <div className="text-sm">Due: {project.due_date || '—'}</div>
        </div>
      ) : (
        <div className="text-gray-600">Loading…</div>
      )}
    </div>
  )
}

const Photos = () => {
  const { id } = useParams()
  const [files, setFiles] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('project_id', id)
          .order('modified_at', { ascending: false })
        if (error) throw error
        if (!cancelled) setFiles(data || [])
      } catch (_e) {
        if (!cancelled) setFiles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])
  return (
    <div className="rounded-md border p-4">
      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : files.length === 0 ? (
        <div className="text-gray-600">No photos yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {files.map(f => (
            <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
              <div className="aspect-video bg-gray-100" />
              <div className="p-2 text-xs text-gray-700">{f.name}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
const DailyLogs = () => {
  const { id } = useParams()
  return (
    <div className="rounded-md border p-4">
      <div className="text-gray-600">Daily logs will appear here.</div>
    </div>
  )
}

const Milestones = () => {
  const { id } = useParams()
  const [phases, setPhases] = React.useState([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('project_phases').select('*').eq('project_id', id).order('order', { ascending: true })
      if (!cancelled) setPhases(data || [])
    })()
    return () => { cancelled = true }
  }, [id])
  return (
    <div className="rounded-md border p-4">
      {phases.length === 0 ? (
        <div className="text-gray-600">No milestones yet.</div>
      ) : (
        <ul className="space-y-2">
          {phases.map(p => (
            <li key={p.id} className="text-sm">{p.name} - {p.progress}%</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ActionItems = () => {
  const { id } = useParams()
  const [tasks, setTasks] = React.useState([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('tasks').select('*').eq('project_id', id).eq('completed', false).order('due_date', { ascending: true })
      if (!cancelled) setTasks(data || [])
    })()
    return () => { cancelled = true }
  }, [id])
  return (
    <div className="rounded-md border p-4">
      {tasks.length === 0 ? (
        <div className="text-gray-600">No action items.</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="text-sm">{t.title}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function App() {
  const session = UseSession()
  return (
    <div>
      <nav className="flex items-center justify-between border-b p-4">
        <Link className="font-semibold" to="/">SiteWeave Client</Link>
        <div className="space-x-4">
          {session ? (
            <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={session ? <Home /> : <Login />} />
        <Route path="/projects/:id" element={<ProjectLayout><Overview /></ProjectLayout>} />
        <Route path="/projects/:id/photos" element={<ProjectLayout><Photos /></ProjectLayout>} />
        <Route path="/projects/:id/daily-logs" element={<ProjectLayout><DailyLogs /></ProjectLayout>} />
        <Route path="/projects/:id/milestones" element={<ProjectLayout><Milestones /></ProjectLayout>} />
        <Route path="/projects/:id/action-items" element={<ProjectLayout><ActionItems /></ProjectLayout>} />
      </Routes>
    </div>
  )
}


