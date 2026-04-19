export function parseLegacyProjectQuery(search) {
  const params = new URLSearchParams(search)
  const projectId = params.get('project')
  if (!projectId) return null
  return {
    projectId,
    redirectPath: `/projects/${projectId}/tasks`,
  }
}

export function buildProjectRoute(projectId, section = 'tasks') {
  if (!projectId) return '/projects'
  return `/projects/${projectId}/${section}`
}
