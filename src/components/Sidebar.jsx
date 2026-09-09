import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SEZIONI, caricaTileAttivi, salvaTileAttivi } from '../data/menu'
import { esci } from '../data/auth'
import { IconHome, IconUsers, IconSettings, IconChevronRight } from './icons'
import './Sidebar.css'

const AMMINISTRAZIONE = [
  { to: '/utenti', label: 'Utenti', icon: IconUsers },
  { to: '/impostazioni', label: 'Impostazioni', icon: IconSettings },
]

const LARGHEZZA_KEY = 'gestionale-larghezza-menu'
const LARGHEZZA_MIN = 200
const LARGHEZZA_MAX = 460

function larghezzaSalvata() {
  const valore = Number(localStorage.getItem(LARGHEZZA_KEY))
  return valore >= LARGHEZZA_MIN && valore <= LARGHEZZA_MAX ? valore : 300
}

export default function Sidebar({ utente, onEsci, stretto = false, aperto = false }) {
  const { pathname } = useLocation()
  // la sezione che contiene la pagina corrente parte aperta
  const [aperte, setAperte] = useState(() =>
    SEZIONI.filter((s) => s.voci.some((v) => pathname.startsWith(v.to))).map((s) => s.nome),
  )
  const [tileAttivi, setTileAttivi] = useState(caricaTileAttivi)
  const [larghezza, setLarghezza] = useState(larghezzaSalvata)
  const trascinamento = useRef(false)

  // ridimensionamento trascinando il bordo destro del menu
  useEffect(() => {
    function muovi(e) {
      if (!trascinamento.current) return
      const nuova = Math.min(LARGHEZZA_MAX, Math.max(LARGHEZZA_MIN, e.clientX))
      setLarghezza(nuova)
    }
    function rilascia() {
      if (!trascinamento.current) return
      trascinamento.current = false
      document.body.classList.remove('ridimensionamento-menu')
      setLarghezza((attuale) => {
        localStorage.setItem(LARGHEZZA_KEY, String(attuale))
        return attuale
      })
    }
    window.addEventListener('mousemove', muovi)
    window.addEventListener('mouseup', rilascia)
    return () => {
      window.removeEventListener('mousemove', muovi)
      window.removeEventListener('mouseup', rilascia)
    }
  }, [])

  function iniziaTrascinamento(e) {
    e.preventDefault()
    trascinamento.current = true
    document.body.classList.add('ridimensionamento-menu')
  }

  function apriChiudi(nome) {
    setAperte((prev) =>
      prev.includes(nome) ? prev.filter((n) => n !== nome) : [...prev, nome],
    )
  }

  function cambiaTile(e, to) {
    e.preventDefault()
    e.stopPropagation() // il click è sul toggle, non sulla voce di menu
    const next = tileAttivi.includes(to)
      ? tileAttivi.filter((t) => t !== to)
      : [...tileAttivi, to]
    setTileAttivi(next)
    salvaTileAttivi(next)
    // la dashboard rilegge le preferenze quando la si riapre
    window.dispatchEvent(new Event('tile-dashboard-cambiati'))
  }

  return (
    <aside
      className={'sidebar' + (stretto ? ' sidebar-scomparsa' : '') + (aperto ? ' aperta' : '')}
      // su schermo stretto la larghezza la decide il foglio di stile
      style={stretto ? undefined : { width: larghezza }}
    >
      {!stretto && (
        <div
          className="sidebar-maniglia"
          onMouseDown={iniziaTrascinamento}
          onDoubleClick={() => {
            setLarghezza(300)
            localStorage.setItem(LARGHEZZA_KEY, '300')
          }}
          title="Trascina per allargare il menu · doppio click per ripristinare"
        />
      )}
      <div className="sidebar-brand">
        <span className="sidebar-logo">G</span>
        <span className="sidebar-brand-text">Gestionale</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          <IconHome className="sidebar-icon" />
          Dashboard
        </NavLink>

        {SEZIONI.map((sezione) => {
          const aperta = aperte.includes(sezione.nome)
          return (
            <div key={sezione.nome} className="sidebar-gruppo">
              <button
                type="button"
                className={'sidebar-gruppo-testa' + (aperta ? ' aperta' : '')}
                onClick={() => apriChiudi(sezione.nome)}
              >
                <IconChevronRight className="sidebar-freccia" />
                {sezione.nome}
              </button>

              {aperta && (
                <div className="sidebar-sottovoci">
                  {sezione.voci.map((voce) => {
                    const attivo = tileAttivi.includes(voce.to)
                    const Icon = voce.icon
                    return (
                      <NavLink
                        key={voce.to}
                        to={voce.to}
                        className={({ isActive }) =>
                          'sidebar-link sidebar-sottovoce' + (isActive ? ' active' : '')
                        }
                      >
                        <Icon className="sidebar-icon" />
                        <span className="sidebar-voce-testo">{voce.titolo}</span>
                        <span
                          role="switch"
                          tabIndex={0}
                          aria-checked={attivo}
                          className={'tile-toggle' + (attivo ? ' acceso' : '')}
                          onClick={(e) => cambiaTile(e, voce.to)}
                          onKeyDown={(e) => e.key === 'Enter' && cambiaTile(e, voce.to)}
                          title={
                            attivo ? 'Togli il tile dalla dashboard' : 'Metti il tile in dashboard'
                          }
                        />
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <span className="sidebar-section-label">Amministrazione</span>
        {AMMINISTRAZIONE.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <Icon className="sidebar-icon" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{(utente?.nome || 'A').charAt(0).toUpperCase()}</div>
        <div className="sidebar-footer-text">
          <span className="sidebar-footer-name">{utente?.nome || 'Utente'}</span>
          <span className="sidebar-footer-role">{utente?.ruolo || 'Accesso'}</span>
        </div>
        <button
          type="button"
          className="sidebar-esci"
          onClick={async () => {
            await esci()
            onEsci?.()
          }}
          title="Esci dal gestionale"
        >
          Esci
        </button>
      </div>
    </aside>
  )
}
