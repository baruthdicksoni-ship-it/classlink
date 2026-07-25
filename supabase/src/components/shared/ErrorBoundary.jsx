import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ClassLink] Hitilafu:', error, info?.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  hardReload = () => {
    // Futa cache ya session kisha pakia upya — hutatua matatizo ya cache
    try { window.localStorage.removeItem('classlink.auth') } catch (e) { /* noop */ }
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Kuna kitu hakikwenda sawa</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sehemu hii imeshindwa kupakia. Jaribu tena au pakia ukurasa upya.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-red-300">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}

          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300
                         bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Jaribu tena
            </button>
            <button
              onClick={this.hardReload}
              className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm
                         font-medium text-white hover:bg-brand-700"
            >
              Pakia upya
            </button>
          </div>
        </div>
      </div>
    )
  }
}
