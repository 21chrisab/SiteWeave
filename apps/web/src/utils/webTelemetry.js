export function markPerf(metricName, startTime) {
  const durationMs = Math.round(performance.now() - startTime)
  if (durationMs < 0) return
  console.info(`[web-telemetry] ${metricName}: ${durationMs}ms`)
}

export function trackRouteChange(pathname) {
  console.info(`[web-telemetry] route_change: ${pathname}`)
}
