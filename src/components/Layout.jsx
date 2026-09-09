import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useSchermoStretto } from './useSchermoStretto'
import './Layout.css'

export default function Layout({ utente, onEsci }) {
  const stretto = useSchermoStretto()
  const [menuAperto, setMenuAperto] = useState(false)
  const { pathname } = useLocation()

  // cambiando pagina il menu a scomparsa si richiude da solo
  useEffect(() => setMenuAperto(false), [pathname])

  // tornando a schermo largo il menu resta sempre visibile
  useEffect(() => {
    if (!stretto) setMenuAperto(false)
  }, [stretto])

  return (
    <div className="app-shell">
      <Sidebar utente={utente} onEsci={onEsci} stretto={stretto} aperto={menuAperto} />

      {stretto && menuAperto && (
        <button
          type="button"
          className="sidebar-velo"
          onClick={() => setMenuAperto(false)}
          aria-label="Chiudi il menu"
        />
      )}

      <div className="app-main">
        <Topbar
          utente={utente}
          stretto={stretto}
          menuAperto={menuAperto}
          onApriMenu={() => setMenuAperto((v) => !v)}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
