import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.ts'
import App from './App.jsx'
import { installDebugTools } from './db/debugTools'
import { initDB } from './db/indexedDbService'
import { initializePhase2Migration } from './db/migrationService'

async function bootstrapDatabase() {
  try {
    await initDB()
    const migrationStatus = await initializePhase2Migration()

    if (typeof window !== 'undefined') {
      window.__brushbeatsMigrationStatus = migrationStatus
      window.dispatchEvent(new CustomEvent('brushbeats:migration-status', { detail: migrationStatus }))
    }
  } catch (error) {
    console.warn('[BrushBeats DB] IndexedDB initialization failed; current cookie/localStorage flows remain active.', error)

    if (typeof window !== 'undefined') {
      const migrationStatus = { kind: 'migration-failed', error: error?.message || 'Failed to initialize local database.' }
      window.__brushbeatsMigrationStatus = migrationStatus
      window.dispatchEvent(new CustomEvent('brushbeats:migration-status', { detail: migrationStatus }))
    }
  }
}

void bootstrapDatabase()

if (import.meta.env.DEV) {
  installDebugTools()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
