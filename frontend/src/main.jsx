import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.ts'
import App from './App.jsx'
import { installDebugTools } from './db/debugTools'
import { initDB } from './db/indexedDbService'

void initDB().catch((error) => {
  console.warn('[BrushBeats DB] IndexedDB initialization failed; current cookie/localStorage flows remain active.', error)
})

if (import.meta.env.DEV) {
  installDebugTools()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
