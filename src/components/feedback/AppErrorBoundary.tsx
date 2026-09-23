import { Component, type ErrorInfo, type ReactNode } from 'react'
import { getErrorMessage } from '../../lib/errors/app-error'

type State = { error: string | null }

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: getErrorMessage(error) }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Reserve external error reporting for a future privacy-reviewed integration.
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-svh place-items-center p-4">
          <section
            role="alert"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm"
          >
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-600">{this.state.error}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-6 min-h-11 rounded-xl bg-brand-600 px-4 font-semibold text-white"
            >
              Try again
            </button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
