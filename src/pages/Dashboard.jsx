import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight } from '../components/icons'
import { SEZIONI, caricaTileAttivi } from '../data/menu'

export default function Dashboard() {
  const [tileAttivi, setTileAttivi] = useState(caricaTileAttivi)

  // la barra laterale segnala quando si accende o spegne un tile
  useEffect(() => {
    function aggiorna() {
      setTileAttivi(caricaTileAttivi())
    }
    window.addEventListener('tile-dashboard-cambiati', aggiorna)
    return () => window.removeEventListener('tile-dashboard-cambiati', aggiorna)
  }, [])

  const sezioniVisibili = SEZIONI.map((s) => ({
    ...s,
    voci: s.voci.filter((v) => tileAttivi.includes(v.to)),
  })).filter((s) => s.voci.length > 0)

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        Seleziona un'area per accedere · Aggiungi o togli i riquadri con gli interruttori nel menu
        a sinistra
      </p>

      {sezioniVisibili.length === 0 && (
        <div className="card">
          <p className="job-list-empty">
            Nessun riquadro in dashboard. Apri una sezione nel menu a sinistra e accendi
            l'interruttore accanto alle voci che vuoi vedere qui.
          </p>
        </div>
      )}

      {sezioniVisibili.map((sezione) => (
        <section className="dashboard-section" key={sezione.nome}>
          <h2 className="dashboard-section-title">{sezione.nome}</h2>
          <div className="task-grid">
            {sezione.voci.map((t) => {
              const Icon = t.icon
              return (
                <Link key={t.to} to={t.to} className="task-tile">
                  <IconChevronRight className="task-tile-arrow" />
                  <div className="task-tile-icon-wrap">
                    <Icon />
                  </div>
                  <div className="task-tile-body">
                    <span className="task-tile-label">{t.titolo}</span>
                    <span className="task-tile-desc">{t.desc}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
