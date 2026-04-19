import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'
import { buildProjectRoute } from '../utils/deepLinking'

export default function ProjectsDirectoryView() {
  const [loading, setLoading] = React.useState(true)
  const [projects, setProjects] = React.useState([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
      if (!cancelled) {
        setProjects(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="mt-16"><LoadingSpinner size="lg" text="Loading project directory..." /></div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Projects Directory</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} to={buildProjectRoute(project.id)} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-500">
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{project.address || 'No address set'}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
