import { useEffect, useState } from 'react'
import { caricaDipendenti } from '../data/dipendenti'
import {
  TIPI_MEZZO,
  CARBURANTI,
  TIPI_INTERVENTO,
  SCADENZE,
  caricaMezzi,
  aggiungiMezzo,
  aggiornaMezzo,
  eliminaMezzo as eliminaMezzoDaDb,
  caricaInterventi,
  aggiungiIntervento,
  eliminaIntervento as eliminaInterventoDaDb,
  statoScadenza,
  statoMezzo,
  formattaKm,
} from '../data/autoparco'
import { formattaEuro } from '../data/lavori'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'
import './Dpi.css'
import './Autoparco.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

const MEZZO_VUOTO = {
  targa: '',
  tipo: TIPI_MEZZO[0],
  marca: '',
  modello: '',
  anno: '',
  carburante: CARBURANTI[0],
  km: 0,
  assegnatoA: '',
  assicurazione: '',
  revisione: '',
  bollo: '',
  tagliando: '',
  inServizio: true,
  note: '',
}

const INTERVENTO_VUOTO = {
  tipo: TIPI_INTERVENTO[0],
  data: oggiISO(),
  km: '',
  costo: '',
  officina: '',
  note: '',
}

export default function Autoparco() {
  const [mezzi, setMezzi] = useState([])
  const [interventi, setInterventi] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [form, setForm] = useState(MEZZO_VUOTO)
  const [errore, setErrore] = useState('')
  const [apertoId, setApertoId] = useState(null)
  const [formIntervento, setFormIntervento] = useState(INTERVENTO_VUOTO)
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('Tutti')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [m, i] = await Promise.all([caricaMezzi(), caricaInterventi()])
    setMezzi(m)
    setInterventi(i)
  }

  useEffect(() => {
    ricarica()
    caricaDipendenti().then(setDipendenti)
  }, [])

  async function salvaMezzo(e) {
    e.preventDefault()
    if (!form.targa.trim()) {
      setErrore('La targa è obbligatoria: identifica il mezzo.')
      return
    }
    const risposta = await aggiungiMezzo(form)
    if (risposta.errore) {
      setErrore(
        risposta.errore.includes('duplicate')
          ? 'Esiste già un mezzo con questa targa.'
          : risposta.errore,
      )
      return
    }
    setErrore('')
    setForm(MEZZO_VUOTO)
    await ricarica()
  }

  function eliminaMezzo(mezzo) {
    chiedi({
      titolo: 'Eliminare il mezzo?',
      messaggio: `"${mezzo.targa}" e tutti i suoi interventi verranno rimossi dall'autoparco.`,
      onConferma: async () => {
        await eliminaMezzoDaDb(mezzo.id)
        if (apertoId === mezzo.id) setApertoId(null)
        await ricarica()
      },
    })
  }

  // le modifiche alla scheda del mezzo si salvano subito sul server
  async function modificaMezzo(mezzo, patch) {
    const aggiornato = { ...mezzo, ...patch }
    setMezzi((prev) => prev.map((m) => (m.id === mezzo.id ? aggiornato : m)))
    await aggiornaMezzo(mezzo.id, aggiornato)
  }

  async function registraIntervento(e, mezzo) {
    e.preventDefault()
    await aggiungiIntervento({ ...formIntervento, mezzoId: mezzo.id })

    // un tagliando o una revisione aggiornano anche il chilometraggio del mezzo
    const km = Number(formIntervento.km) || 0
    if (km > (mezzo.km || 0)) await modificaMezzo(mezzo, { km })

    setFormIntervento({ ...INTERVENTO_VUOTO, data: formIntervento.data })
    setInterventi(await caricaInterventi())
  }

  function eliminaIntervento(intervento) {
    chiedi({
      titolo: "Eliminare l'intervento?",
      messaggio: `${intervento.tipo} del ${formattaData(intervento.data)} verrà rimosso dallo storico.`,
      onConferma: async () => {
        await eliminaInterventoDaDb(intervento.id)
        setInterventi(await caricaInterventi())
      },
    })
  }

  const q = ricerca.trim().toLowerCase()
  const righe = mezzi
    .map((m) => ({ ...m, stato: statoMezzo(m) }))
    .filter((m) => {
      if (filtro === 'In servizio' && !m.inServizio) return false
      if (filtro === 'Fuori servizio' && m.inServizio) return false
      if (filtro === 'Con scadenze' && m.stato.classe === 'badge-completato') return false
      if (!q) return true
      return [m.targa, m.marca, m.modello, m.tipo, m.assegnatoA]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    })

  const conteggi = mezzi.reduce(
    (acc, m) => {
      const s = statoMezzo(m)
      if (!m.inServizio) acc.fermi += 1
      else if (s.classe === 'badge-malattia') acc.scaduti += 1
      else if (s.classe === 'badge-permesso') acc.inScadenza += 1
      else acc.regolari += 1
      return acc
    },
    { regolari: 0, inScadenza: 0, scaduti: 0, fermi: 0 },
  )

  const annoCorrente = String(new Date().getFullYear())
  const speseAnno = interventi
    .filter((i) => (i.data || '').startsWith(annoCorrente))
    .reduce((t, i) => t + i.costo, 0)

  return (
    <>
      <h1 className="page-title">Autoparco</h1>
      <p className="page-subtitle">
        Mezzi aziendali: assegnazione agli operai, scadenze di legge e interventi di officina.
      </p>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{mezzi.length}</span>
          <span className="stat-label">Mezzi in autoparco</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-ambra">{conteggi.inScadenza}</span>
          <span className="stat-label">In scadenza (30 gg)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{conteggi.scaduti + conteggi.fermi}</span>
          <span className="stat-label">Scaduti o fermi</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formattaEuro(speseAnno)}</span>
          <span className="stat-label">Spese officina {annoCorrente}</span>
        </div>
      </div>

      <form className="job-form nuovo-lavoro-form" onSubmit={salvaMezzo}>
        <label className="job-form-label">Nuovo mezzo</label>
        <div className="dpi-riga-form">
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Targa</label>
            <input
              type="text"
              placeholder="AA123BB"
              value={form.targa}
              onChange={(e) => setForm({ ...form, targa: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPI_MEZZO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Marca</label>
            <input
              type="text"
              placeholder="Es. Fiat"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
            />
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Modello</label>
            <input
              type="text"
              placeholder="Es. Ducato"
              value={form.modello}
              onChange={(e) => setForm({ ...form, modello: e.target.value })}
            />
          </div>
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Anno</label>
            <input
              type="number"
              min="1980"
              max="2100"
              placeholder="2019"
              value={form.anno}
              onChange={(e) => setForm({ ...form, anno: e.target.value })}
            />
          </div>
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Km</label>
            <input
              type="number"
              min="0"
              value={form.km}
              onChange={(e) => setForm({ ...form, km: e.target.value })}
            />
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">In uso a</label>
            <select
              value={form.assegnatoA}
              onChange={(e) => setForm({ ...form, assegnatoA: e.target.value })}
            >
              <option value="">— non assegnato —</option>
              {dipendenti.map((d) => (
                <option key={d.id} value={d.nome}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Aggiungi mezzo</button>
        </div>

        <div className="dpi-riga-form autoparco-scadenze-form">
          {SCADENZE.map((s) => (
            <div className="dpi-campo" key={s.campo}>
              <label className="job-form-label">{s.etichetta} — scade il</label>
              <input
                type="date"
                value={form[s.campo]}
                onChange={(e) => setForm({ ...form, [s.campo]: e.target.value })}
              />
            </div>
          ))}
        </div>
        {errore && <p className="messaggio-errore">{errore}</p>}
      </form>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">Mezzi ({righe.length})</span>
          <div className="upload-riga">
            <select
              className="campo-ricerca"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option>Tutti</option>
              <option>In servizio</option>
              <option>Con scadenze</option>
              <option>Fuori servizio</option>
            </select>
            <input
              type="search"
              className="campo-ricerca"
              placeholder="Cerca targa, modello o operaio..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        </div>

        {righe.length === 0 ? (
          <p className="job-list-empty">
            Nessun mezzo in autoparco: aggiungi il primo dal riquadro qui sopra.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Targa</th>
                <th>Mezzo</th>
                <th>Km</th>
                <th>In uso a</th>
                {SCADENZE.map((s) => (
                  <th key={s.campo}>{s.etichetta}</th>
                ))}
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {righe.map((m) => (
                <tr key={m.id}>
                  <td className="cliente-nome-link targa-cella">{m.targa}</td>
                  <td>
                    {m.marca} {m.modello}
                    <span className="riga-sub">
                      {m.tipo}
                      {m.anno ? ` · ${m.anno}` : ''}
                    </span>
                  </td>
                  <td>{formattaKm(m.km)}</td>
                  <td>{m.assegnatoA || '—'}</td>
                  {SCADENZE.map((s) => {
                    const stato = statoScadenza(m[s.campo])
                    return (
                      <td key={s.campo}>
                        <span className={'scadenza-data ' + stato.classe}>
                          {formattaData(m[s.campo])}
                        </span>
                      </td>
                    )
                  })}
                  <td>
                    <span className={'badge ' + m.stato.classe}>{m.stato.testo}</span>
                  </td>
                  <td className="autoparco-azioni">
                    <button
                      type="button"
                      className="btn-apri"
                      onClick={() => {
                        setApertoId(apertoId === m.id ? null : m.id)
                        setFormIntervento({ ...INTERVENTO_VUOTO, km: m.km })
                      }}
                    >
                      {apertoId === m.id ? 'Chiudi' : 'Scheda'}
                    </button>
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => eliminaMezzo(m)}
                      aria-label="Elimina mezzo"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {apertoId &&
        (() => {
          const mezzo = mezzi.find((m) => m.id === apertoId)
          if (!mezzo) return null
          const storico = interventi.filter((i) => i.mezzoId === mezzo.id)
          const spesaTotale = storico.reduce((t, i) => t + i.costo, 0)

          return (
            <div className="card sezione dettaglio-consuntivo">
              <div className="lista-head">
                <span className="job-list-label">
                  {mezzo.targa} · {mezzo.marca} {mezzo.modello} · officina {formattaEuro(spesaTotale)}
                </span>
                <label className="check-riga">
                  <input
                    type="checkbox"
                    checked={mezzo.inServizio}
                    onChange={(e) => modificaMezzo(mezzo, { inServizio: e.target.checked })}
                  />
                  Mezzo in servizio
                </label>
              </div>

              <div className="dpi-riga-form">
                {SCADENZE.map((s) => {
                  const stato = statoScadenza(mezzo[s.campo])
                  return (
                    <div className="dpi-campo" key={s.campo}>
                      <label className="job-form-label">{s.etichetta}</label>
                      <input
                        type="date"
                        value={mezzo[s.campo] || ''}
                        onChange={(e) => modificaMezzo(mezzo, { [s.campo]: e.target.value })}
                      />
                      <span className={'badge ' + stato.classe}>
                        {stato.testo}
                        {stato.giorni != null &&
                          stato.testo !== 'In regola' &&
                          (stato.giorni < 0
                            ? ` da ${Math.abs(stato.giorni)} gg`
                            : ` fra ${stato.giorni} gg`)}
                      </span>
                    </div>
                  )
                })}
                <div className="dpi-campo">
                  <label className="job-form-label">In uso a</label>
                  <select
                    value={mezzo.assegnatoA}
                    onChange={(e) => modificaMezzo(mezzo, { assegnatoA: e.target.value })}
                  >
                    <option value="">— non assegnato —</option>
                    {dipendenti.map((d) => (
                      <option key={d.id} value={d.nome}>
                        {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dpi-campo dpi-campo-stretto">
                  <label className="job-form-label">Carburante</label>
                  <select
                    value={mezzo.carburante}
                    onChange={(e) => modificaMezzo(mezzo, { carburante: e.target.value })}
                  >
                    <option value="">—</option>
                    {CARBURANTI.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form className="dpi-riga-form" onSubmit={(e) => registraIntervento(e, mezzo)}>
                <div className="dpi-campo">
                  <label className="job-form-label">Intervento</label>
                  <select
                    value={formIntervento.tipo}
                    onChange={(e) => setFormIntervento({ ...formIntervento, tipo: e.target.value })}
                  >
                    {TIPI_INTERVENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dpi-campo">
                  <label className="job-form-label">Data</label>
                  <input
                    type="date"
                    value={formIntervento.data}
                    onChange={(e) => setFormIntervento({ ...formIntervento, data: e.target.value })}
                  />
                </div>
                <div className="dpi-campo dpi-campo-stretto">
                  <label className="job-form-label">Km</label>
                  <input
                    type="number"
                    min="0"
                    value={formIntervento.km}
                    onChange={(e) => setFormIntervento({ ...formIntervento, km: e.target.value })}
                  />
                </div>
                <div className="dpi-campo dpi-campo-stretto">
                  <label className="job-form-label">Costo (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formIntervento.costo}
                    onChange={(e) => setFormIntervento({ ...formIntervento, costo: e.target.value })}
                  />
                </div>
                <div className="dpi-campo">
                  <label className="job-form-label">Officina</label>
                  <input
                    type="text"
                    placeholder="Nome officina"
                    value={formIntervento.officina}
                    onChange={(e) =>
                      setFormIntervento({ ...formIntervento, officina: e.target.value })
                    }
                  />
                </div>
                <div className="dpi-campo">
                  <label className="job-form-label">Note</label>
                  <input
                    type="text"
                    placeholder="Cosa è stato fatto"
                    value={formIntervento.note}
                    onChange={(e) => setFormIntervento({ ...formIntervento, note: e.target.value })}
                  />
                </div>
                <button type="submit">Registra</button>
              </form>

              {storico.length === 0 ? (
                <p className="job-list-empty">Nessun intervento registrato su questo mezzo.</p>
              ) : (
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Data</th>
                      <th>Km</th>
                      <th>Costo</th>
                      <th>Officina</th>
                      <th>Note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {storico.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <span className="badge badge-in-corso">{i.tipo}</span>
                        </td>
                        <td>{formattaData(i.data)}</td>
                        <td>{i.km ? formattaKm(i.km) : '—'}</td>
                        <td>{formattaEuro(i.costo)}</td>
                        <td>{i.officina || '—'}</td>
                        <td>{i.note || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="riga-elimina"
                            onClick={() => eliminaIntervento(i)}
                            aria-label="Elimina intervento"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })()}

      {dialogo}
    </>
  )
}
