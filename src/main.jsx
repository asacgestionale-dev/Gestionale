import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { caricaTema, applicaTema } from './data/tema'

// il tema scelto va applicato prima del primo disegno, per evitare uno sfarfallio
applicaTema(caricaTema())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
