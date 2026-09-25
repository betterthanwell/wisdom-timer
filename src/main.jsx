import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { audioManager } from './utils/audioManager'
import { registerServiceWorker } from './registerServiceWorker'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Set up offline use once the bells have loaded, so its downloads don't
// compete with them (init() is shared with the app, nothing loads twice)
audioManager.init().then(registerServiceWorker)
