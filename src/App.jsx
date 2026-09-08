import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { utenteCorrente } from './data/auth'
import Accesso from './pages/Accesso'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Impostazioni from './pages/Impostazioni'
import Utenti from './pages/Utenti'
import Clienti from './pages/Clienti'
import SchedaCliente from './pages/SchedaCliente'
import Materiali from './pages/Materiali'
import Personale from './pages/Personale'
import SchedaDipendente from './pages/SchedaDipendente'
import AssegnazioneLavori from './pages/AssegnazioneLavori'
import NuovoLavoro from './pages/NuovoLavoro'
import ArchivioLavori from './pages/ArchivioLavori'
import Consuntivazione from './pages/Consuntivazione'
import Economico from './pages/Economico'
import SchedaLavoro from './pages/SchedaLavoro'
import Presenze from './pages/Presenze'
import Squadre from './pages/Squadre'
import Dpi from './pages/Dpi'
import Autoparco from './pages/Autoparco'

function App() {
  const [utente, setUtente] = useState(null)
  const [verifica, setVerifica] = useState(true)

  // la sessione si recupera dal server: finché non si sa, non si mostra nulla
  useEffect(() => {
    utenteCorrente().then((u) => {
      setUtente(u)
      setVerifica(false)
    })
  }, [])

  if (verifica) return <div className="caricamento-iniziale">Caricamento…</div>

  // senza sessione attiva si passa dalla schermata di accesso/registrazione
  if (!utente) return <Accesso onAccesso={setUtente} />

  return (
    <Routes>
      <Route path="/" element={<Layout utente={utente} onEsci={() => setUtente(null)} />}>
        <Route index element={<Dashboard />} />
        <Route path="clienti" element={<Clienti />} />
        <Route path="clienti/:id" element={<SchedaCliente />} />
        <Route path="materiali" element={<Materiali />} />
        <Route path="personale" element={<Personale />} />
        <Route path="personale/:id" element={<SchedaDipendente />} />
        <Route path="squadre" element={<Squadre />} />
        <Route path="dpi" element={<Dpi />} />
        <Route path="autoparco" element={<Autoparco />} />
        <Route path="nuovo-lavoro" element={<NuovoLavoro />} />
        <Route path="consuntivazione" element={<Consuntivazione />} />
        <Route path="economico" element={<Economico />} />
        <Route path="lavori" element={<ArchivioLavori />} />
        <Route path="lavori/:id" element={<SchedaLavoro />} />
        <Route path="assegnazione-lavori" element={<AssegnazioneLavori />} />
        <Route path="presenze" element={<Presenze />} />
        <Route path="utenti" element={<Utenti utente={utente} />} />
        <Route path="impostazioni" element={<Impostazioni />} />
      </Route>
    </Routes>
  )
}

export default App
