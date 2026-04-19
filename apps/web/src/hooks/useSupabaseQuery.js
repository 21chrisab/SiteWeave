import React from 'react'

const queryCache = new Map()

export function useSupabaseQuery(cacheKey, queryFn, options = {}) {
  const { ttlMs = 30000, enabled = true } = options
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(enabled)

  const load = React.useCallback(async (force = false) => {
    if (!enabled) return
    setLoading(true)
    setError(null)

    const now = Date.now()
    const cacheEntry = queryCache.get(cacheKey)
    if (!force && cacheEntry && now - cacheEntry.ts < ttlMs) {
      setData(cacheEntry.data)
      setLoading(false)
      return
    }

    try {
      const next = await queryFn()
      queryCache.set(cacheKey, { ts: now, data: next })
      setData(next)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, enabled, queryFn, ttlMs])

  React.useEffect(() => {
    load()
  }, [load])

  return { data, error, loading, refetch: () => load(true) }
}
