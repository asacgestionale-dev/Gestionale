import { useEffect, useState } from 'react'
import { DIPENDENTI } from '../data/dipendenti'
import { oggiISO } from '../data/squadre'
import {
  STATI_PRESENZA,
  caricaPresenze,
  salvaPresenze,
  applicaPeriodo,
  giorniTra,
} from '../data/presenze'
import { caricaDocumenti, salvaDocumento, eliminaDocumento } from '../data/documenti'
import { useConferma } from '../components/useConferma'
import './Presenze.css'

export default function Presenze() {
  const [data, setData] = useState(oggiISO)
  const [presenze, setPresenze] = useState(() => caricaPresenze(oggiISO()))
  // dipendente per cui si sta indicando la data di fine assenza
  const [periodo, setPeriodo] = useState(null)
  const { chiedi, dialogo } = useConferma()

  function cambiaData(nuovaData) {
    setData(nuovaData)
    setPresenze(caricaPresenze(nuovaData))
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

  function cambiaStato(nome, stato) {
    setPresenze((prev) => {
      const next = { ...prev, [nome]: stato }
      salvaPresenze(data, next)
      return next
    })
    // per le assenze si chiede fino a quando dura
    if (stato !== 'Presente') {
      setPeriodo({ nome, stato, fine: data })
    } else {
      setPeriodo(null)
    }
  }

  function confermaPeriodo() {
    if (!periodo || periodo.fine < data) return
    applicaPeriodo(periodo.nome, periodo.stato, data, periodo.fine)
    setPresenze(caricaPresenze(data))
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
  }, [data, JSON.stringify(presenze)])

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

  function apriCertificato(doc) {
    const url = URL.createObjectURL(doc.file)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
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

      {dialogo}
    </>
  )
}
