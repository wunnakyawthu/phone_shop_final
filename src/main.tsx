import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import { App } from './app/App'
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary'
import { AuthProvider } from './features/auth/AuthProvider'
import { ToastProvider } from './components/feedback/ToastProvider'
import { StoreBrandingProvider } from './features/settings/storeBranding'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ToastProvider>
        <StoreBrandingProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </StoreBrandingProvider>
      </ToastProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
