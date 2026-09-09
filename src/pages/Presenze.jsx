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
import {
  IN_ATTESA,
  caricaRichieste,
  approvaRichiesta,
  rifiutaRichiesta,
  giorniRichiesti,
} from '../data/ferie'
import { formattaDistanza } from '../data/impostazioni'
import { useConferma } from '../components/useConferma'
import './Presenze.css'

function formattaDataBreve(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function Presenze({ utente }) {
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

  // richieste di ferie e permessi arrivate dai telefoni
  const [richieste, setRichieste] = useState([])
  const [rifiuto, setRifiuto] = useState(null)

  async function ricaricaRichieste() {
    setRichieste(await caricaRichieste())
  }

  useEffect(() => {
    ricaricaRichieste()
  }, [])

  const inAttesa = richieste.filter((r) => r.stato === IN_ATTESA)
  const decise = richieste.filter((r) => r.stato !== IN_ATTESA).slice(0, 10)

  function approva(richiesta) {
    chiedi({
      titolo: 'Approvare la richiesta?',
      messaggio: `${richiesta.dipendente} risulterà in ${richiesta.tipo.toLowerCase()} dal ${formattaDataBreve(richiesta.dataInizio)} al ${formattaDataBreve(richiesta.dataFine)}: le giornate finiscono subito nelle presenze e nelle squadre.`,
      testoConferma: 'Approva',
      onConferma: async () => {
        await approvaRichiesta(richiesta, utente?.nome)
        await ricaricaRichieste()
        setPresenze(await caricaPresenze(data))
      },
    })
  }

  async function confermaRifiuto() {
    await rifiutaRichiesta(rifiuto.richiesta, utente?.nome, rifiuto.motivo)
    setRifiuto(null)
    await ricaricaRichieste()
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
      fuoriZona: righe.some((t) => !t.valida),
      dettaglioZona: righe
        .filter((t) => !t.valida)
        .map((t) => `${t.tipo} ${oraDi(t)}: ${formattaDistanza(t.distanza)} dalla zona`)
        .join(' · '),
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
        <span className="job-list-label">Richieste da approvare ({inAttesa.length})</span>
        {inAttesa.length === 0 ? (
          <p className="job-list-empty">
            Nessuna richiesta in attesa: le inviano gli operai dal telefono.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Tipo</th>
                <th>Periodo</th>
                <th>Giorni</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inAttesa.map((r) => (
                <tr key={r.id}>
                  <td className="cliente-nome-link">{r.dipendente}</td>
                  <td>
                    <span
                      className={'badge ' + (r.tipo === 'Ferie' ? 'badge-ferie' : 'badge-permesso')}
                    >
                      {r.tipo}
                    </span>
                  </td>
                  <td>
                    {formattaDataBreve(r.dataInizio)}
                    {r.dataFine !== r.dataInizio && ` → ${formattaDataBreve(r.dataFine)}`}
                  </td>
                  <td>{giorniRichiesti(r)}</td>
                  <td>{r.note || '—'}</td>
                  <td className="richiesta-azioni">
                    <button type="button" className="btn-approva" onClick={() => approva(r)}>
                      Approva
                    </button>
                    <button
                      type="button"
                      className="btn-rifiuta"
                      onClick={() => setRifiuto({ richiesta: r, motivo: '' })}
                    >
                      Rifiuta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rifiuto && (
          <div className="rifiuto-box">
            <label className="job-form-label">
              Perché rifiuti la richiesta di {rifiuto.richiesta.dipendente}?
            </label>
            <div className="rifiuto-riga">
              <input
                type="text"
                placeholder="Il motivo lo legge l'operaio sul telefono"
                value={rifiuto.motivo}
                onChange={(e) => setRifiuto({ ...rifiuto, motivo: e.target.value })}
              />
              <button type="button" className="btn-rifiuta" onClick={confermaRifiuto}>
                Conferma rifiuto
              </button>
              <button type="button" className="btn-approva" onClick={() => setRifiuto(null)}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {decise.length > 0 && (
          <>
            <span className="job-list-label richieste-decise">Ultime richieste decise</span>
            <table className="task-table">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Tipo</th>
                  <th>Periodo</th>
                  <th>Esito</th>
                  <th>Deciso da</th>
                </tr>
              </thead>
              <tbody>
                {decise.map((r) => (
                  <tr key={r.id}>
                    <td className="cliente-nome-link">{r.dipendente}</td>
                    <td>{r.tipo}</td>
                    <td>
                      {formattaDataBreve(r.dataInizio)}
                      {r.dataFine !== r.dataInizio && ` → ${formattaDataBreve(r.dataFine)}`}
                    </td>
                    <td>
                      <span
                        className={
                          'badge ' +
                          (r.stato === 'Approvata' ? 'badge-completato' : 'badge-malattia')
                        }
                      >
                        {r.stato}
                      </span>
                      {r.motivoRifiuto && <span className="riga-sub">{r.motivoRifiuto}</span>}
                    </td>
                    <td>{r.decisaDa || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
                <th>Zona</th>
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
                    {r.timbrature.map((t) => (
                      <span key={t.id} className={t.valida ? undefined : 'timbratura-sospetta'}>
                        {t.tipo[0]} {oraDi(t)}{' '}
                      </span>
                    ))}
                  </td>
                  <td>
                    {r.fuoriZona ? (
                      <span className="badge badge-malattia" title={r.dettaglioZona}>
                        Fuori zona
                      </span>
                    ) : (
                      <span className="badge badge-completato">In zona</span>
                    )}
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
