import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './pages/LandingPage.jsx'
import WorkspacePage from './pages/WorkspacePage.jsx'
import ShareCreatedPage from './pages/ShareCreatedPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace/:accessCode" element={<WorkspacePage />} />
        <Route path="/share-created/:accessCode" element={<ShareCreatedPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
