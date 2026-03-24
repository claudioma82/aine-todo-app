export function LoadingState() {
  return (
    <div className="loading-state" aria-busy="true">
      <span className="loading-state__spinner" aria-hidden="true" />
      <p>Loading your todos…</p>
    </div>
  )
}
