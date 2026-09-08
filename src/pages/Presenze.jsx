import { useEffect, useState } from 'react'
import { nomiDipendenti } from '../data/dipendenti'
import { oggiISO } from '../data/squadre'
import {
  STATI_PRESENZA,
  caricaPresenze,
  salvaStato,
  applicaPeriodo,
  giorniTra,
} from '../data/presenze'
import {
  caricaDocumenti,
  salvaDocumento,
  eliminaDocumento,
  urlDocumento,
} from '../data/documenti'
import {
  ENTRATA,
  USCITA,
  timbratureDelGiorno,
  oraDi,
  minutiLavorati,
  formattaDurata,
} from '../data/timbrature'
import { useConferma } from '../components/useConferma'
import './Presenze.css'

export default function Presenze() {
  const [data, setData] = useState(oggiISO)
  const [presenze, setPresenze] = useState({})
  const [DIPENDENTI, setDipendenti] = useState([])
  // dipendente per cui si sta indicando la data di fine assenza
  const [periodo, setPeriodo] = useState(null)
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    nomiDipendenti().then(setDipendenti)
  }, [])

  useEffect(() => {
    caricaPresenze(data).then(setPresenze)
  }, [data])

  function cambiaData(nuovaData) {
    setData(nuovaData)
    setPeriodo(null)
  }

  function spostaGiorno(passo) {
    const d = new Date(data)
    d.setDate(d.getDate() + passo)
    cambiaData(d.toISOString().slice(0, 10))
  }

  const etichettaGiorno = new Date(data).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function cambiaStato(nome, stato) {
    setPresenze((prev) => ({ ...prev, [nome]: stato }))
    await salvaStato(data, nome, stato)
    // per le assenze si chiede fino a quando dura
    if (stato !== 'Presente') {
      setPeriodo({ nome, stato, fine: data })
    } else {
      setPeriodo(null)
    }
  }

  async function confermaPeriodo() {
    if (!periodo || periodo.fine < data) return
    await applicaPeriodo(periodo.nome, periodo.stato, data, periodo.fine)
    setPresenze(await caricaPresenze(data))
    setPeriodo(null)
  }

  const stati = STATI_PRESENZA.map((s) => ({
    label: s === 'Presente' ? 'Presenti' : 'In ' + s.toLowerCase(),
    valore: DIPENDENTI.filter((n) => presenze[n] === s).length,
  }))

  const giorniPeriodo = periodo && periodo.fine >= data ? giorniTra(data, periodo.fine).length : 0

  // certificati di malattia della giornata, archiviati per dipendente
  const [certificati, setCertificati] = useState({})
  const chiaveCertificato = (nome) => `mal:${nome}:${data}`

  useEffect(() => {
    let annullato = false
    async function carica() {
      const trovati = {}
      for (const nome of DIPENDENTI) {
        if (presenze[nome] !== 'Malattia') continue
        const docs = await caricaDocumenti(chiaveCertificato(nome))
        if (docs.length > 0) trovati[nome] = docs[0]
      }
      if (!annullato) setCertificati(trovati)
    }
    carica()
    return () => {
      annullato = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, JSON.stringify(presenze), DIPENDENTI.length])

  async function caricaCertificato(nome, file) {
    if (!file) return
    await salvaDocumento(chiaveCertificato(nome), file, 'Certificazione')
    const docs = await caricaDocumenti(chiaveCertificato(nome))
    setCertificati((prev) => ({ ...prev, [nome]: docs[0] }))
  }

  function rimuoviCertificato(nome, doc) {
    chiedi({
      titolo: 'Eliminare il certificato?',
      messaggio: `Il certificato di malattia di ${nome} ("${doc.nome}") verrà rimosso definitivamente.`,
      onConferma: async () => {
        await eliminaDocumento(doc.id)
        setCertificati((prev) => {
          const next = { ...prev }
          delete next[nome]
          return next
        })
      },
    })
  }

  // timbrature inviate dagli operai, raggruppate per persona
  const [timbrature, setTimbrature] = useState([])

  useEffect(() => {
    timbratureDelGiorno(data).then(setTimbrature)
  }, [data])

  const righeTimbrature = Object.entries(
    timbrature.reduce((acc, t) => {
      acc[t.dipendente] = [...(acc[t.dipendente] || []), t]
      return acc
    }, {}),
  )
    .map(([nome, righe]) => ({
      nome,
      timbrature: righe,
      entrata: righe.find((t) => t.tipo === ENTRATA) ? oraDi(righe.find((t) => t.tipo === ENTRATA)) : '',
      uscita: [...righe].reverse().find((t) => t.tipo === USCITA)
        ? oraDi([...righe].reverse().find((t) => t.tipo === USCITA))
        : '',
      minuti: minutiLavorati(righe),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  async function apriCertificato(doc) {
    const url = await urlDocumento(doc.id)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <>
      <h1 className="page-title">Timbrature e Presenze</h1>
      <p className="page-subtitle">Presenze, ferie, malattie e permessi del personale</p>

      <div className="squadre-date-row">
        <label htmlFor="presenze-data">Giornata</label>
        <button
          type="button"
          className="nav-giorno"
          onClick={() => spostaGiorno(-1)}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <input
          id="presenze-data"
          type="date"
          value={data}
          onChange={(e) => cambiaData(e.target.value)}
        />
        <button
          type="button"
          className="nav-giorno"
          onClick={() => spostaGiorno(1)}
          aria-label="Giorno successivo"
        >
          ›
        </button>
        <button
          type="button"
          className="btn-oggi"
          onClick={() => cambiaData(oggiISO())}
          disabled={data === oggiISO()}
        >
          Oggi
        </button>
        <span className="etichetta-giorno">{etichettaGiorno}</span>
      </div>

      <div className="stat-grid">
        {stati.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-value">{s.valore}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <table className="task-table">
          <thead>
            <tr>
              <th className="col-dipendente">Dipendente</th>
              <th className="col-stato">Stato</th>
              <th className="col-periodo"></th>
            </tr>
          </thead>
          <tbody>
            {DIPENDENTI.map((nome) => (
              <tr key={nome}>
                <td className="col-dipendente">{nome}</td>
                <td className="col-stato">
                  <select
                    className={'badge-select badge-' + presenze[nome].toLowerCase()}
                    value={presenze[nome]}
                    onChange={(e) => cambiaStato(nome, e.target.value)}
                  >
                    {STATI_PRESENZA.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="col-periodo">
                  <div className="stato-cella">
                    {periodo?.nome === nome && (
                      <div className="periodo-box">
                        <span className="periodo-testo">
                          {periodo.stato} fino al
                        </span>
                        <input
                          type="date"
                          min={data}
                          value={periodo.fine}
                          onChange={(e) =>
                            setPeriodo((p) => ({ ...p, fine: e.target.value }))
                          }
                        />
                        <button type="button" onClick={confermaPeriodo}>
                          Applica{giorniPeriodo > 1 ? ` (${giorniPeriodo} gg)` : ''}
                        </button>
                        <button
                          type="button"
                          className="periodo-annulla"
                          onClick={() => setPeriodo(null)}
                        >
                          Solo oggi
                        </button>
                      </div>
                    )}

                    {/* alla malattia si allega il certificato medico */}
                    {presenze[nome] === 'Malattia' && (
                      <div className="certificato-box">
                        {certificati[nome] ? (
                          <>
                            <button
                              type="button"
                              className="certificato-link"
                              onClick={() => apriCertificato(certificati[nome])}
                              title={certificati[nome].nome}
                            >
                              📄 Certificato
                            </button>
                            <button
                              type="button"
                              className="certificato-elimina"
                              onClick={() => rimuoviCertificato(nome, certificati[nome])}
                              aria-label="Elimina certificato"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <label className="certificato-carica">
                            Allega certificato
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              onChange={(e) => caricaCertificato(nome, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card sezione">
        <span className="job-list-label">
          Timbrature dal telefono ({righeTimbrature.length})
        </span>
        {righeTimbrature.length === 0 ? (
          <p className="job-list-empty">
            Nessuna timbratura registrata in questa giornata: le inviano gli operai
            dall'applicazione sul telefono.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Entrata</th>
                <th>Uscita</th>
                <th>Ore</th>
                <th>Timbrature</th>
              </tr>
            </thead>
            <tbody>
              {righeTimbrature.map((r) => (
                <tr key={r.nome}>
                  <td className="cliente-nome-link">{r.nome}</td>
                  <td>{r.entrata || '—'}</td>
                  <td>{r.uscita || '—'}</td>
                  <td>{formattaDurata(r.minuti)}</td>
                  <td>
                    {r.timbrature.map((t) => `${t.tipo[0]} ${oraDi(t)}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogo}
    </>
  )
}
