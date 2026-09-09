import { IconSearch, IconBell } from './icons'
import './Topbar.css'

export default function Topbar({ utente, stretto = false, menuAperto = false, onApriMenu }) {
  return (
    <header className="topbar">
      {stretto && (
        <button
          type="button"
          className={'topbar-menu' + (menuAperto ? ' aperto' : '')}
          onClick={onApriMenu}
          aria-label={menuAperto ? 'Chiudi il menu' : 'Apri il menu'}
          aria-expanded={menuAperto}
        >
          <span />
          <span />
          <span />
        </button>
      )}

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
