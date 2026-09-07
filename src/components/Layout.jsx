import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './Layout.css'

export default function Layout({ utente, onEsci }) {
  return (
    <div className="app-shell">
      <Sidebar utente={utente} onEsci={onEsci} />
      <div className="app-main">
        <Topbar utente={utente} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
