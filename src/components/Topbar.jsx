import { IconSearch, IconBell } from './icons'
import './Topbar.css'

export default function Topbar({ utente }) {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <IconSearch className="topbar-search-icon" />
        <input type="text" placeholder="Cerca..." />
      </div>
      <div className="topbar-actions">
        <button type="button" className="topbar-icon-btn" aria-label="Notifiche">
          <IconBell />
          <span className="topbar-dot" />
        </button>
        <div className="topbar-avatar" title={utente?.email}>
          {(utente?.nome || 'A').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
