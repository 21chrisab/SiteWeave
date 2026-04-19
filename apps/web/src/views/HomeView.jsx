import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import { buildProjectRoute } from '../utils/deepLinking'

function statusClass(status) {
  const value = status?.toLowerCase()
  if (value === 'planning') return 'bg-blue-100 text-blue-800'
  if (value === 'in progress') return 'bg-green-100 text-green-800'
  if (value === 'on hold') return 'bg-orange-100 text-orange-800'
  if (value === 'completed') return 'bg-gray-200 text-gray-700'
  return 'bg-gray-100 text-gray-700'
}

export default function HomeView() {
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
          supabase.from('tasks').select('*').eq('completed', false).order('due_date', { ascending: true }),
        ])
        if (projectsResult.error) throw projectsResult.error
        if (tasksResult.error) throw tasksResult.error
        if (!cancelled) {
          const projectRows = projectsResult.data || []
          setProjects(projectRows)
          setTasks((tasksResult.data || []).map((task) => ({ ...task, project: projectRows.find((p) => p.id === task.project_id) })))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="mt-16"><LoadingSpinner size="lg" text="Loading projects..." /></div>
  if (error) return <div className="mx-auto mt-10 max-w-5xl px-4 text-red-700">{error}</div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">What needs attention across your organization.</p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">View all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} to={buildProjectRoute(project.id)} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-500">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(project.status)}`}>{project.status || 'Active'}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{project.address || 'No address set'}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">My Pending Tasks</h2>
        <div className="space-y-2">
          {tasks.slice(0, 12).map((task) => (
            <Link key={task.id} to={buildProjectRoute(task.project_id)} className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-500">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{task.text || 'Untitled Task'}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.project?.name || 'Unknown Project'}</p>
                </div>
                <p className="text-xs text-gray-500">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</p>
              </div>
            </Link>
          ))}
          {tasks.length === 0 ? <p className="text-sm text-gray-500">No pending tasks.</p> : null}
        </div>
      </section>
    </div>
  )
}
