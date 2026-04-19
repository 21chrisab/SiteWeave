import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import ProjectDetailsView from './ProjectDetailsView'

export default function ProjectWorkspaceView({ routeTab = 'tasks' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()

  React.useEffect(() => {
    if (!id) return
    if (String(state.selectedProjectId) !== String(id)) {
      dispatch({ type: 'SET_PROJECT', payload: id })
    }
    if (state.activeView !== 'Projects') {
      dispatch({ type: 'SET_VIEW', payload: 'Projects' })
    }
  }, [id, state.selectedProjectId, state.activeView, dispatch])

  return (
    <ProjectDetailsView
      routeTab={routeTab}
      onTabChange={(nextTab) => navigate(`/projects/${id}/${nextTab}`)}
    />
  )
}
