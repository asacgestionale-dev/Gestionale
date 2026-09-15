import { Fragment, useEffect, useState } from 'react'
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
import { TestataDb, Riepilogo, PannelloNuovo, Campo, Strumenti, Vuoto } from '../components/Database'
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

const FILTRI = ['Tutti', 'In servizio', 'Con scadenze', 'Fuori servizio']

export default function Autoparco() {
  const [mezzi, setMezzi] = useState([])
  const [interventi, setInterventi] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [nuovoAperto, setNuovoAperto] = useState(false)
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
    setNuovoAperto(false)
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

  function apriScheda(mezzo) {
    setApertoId(apertoId === mezzo.id ? null : mezzo.id)
    setFormIntervento({ ...INTERVENTO_VUOTO, km: mezzo.km })
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
      return acc
    },
    { inScadenza: 0, scaduti: 0, fermi: 0 },
  )

  const annoCorrente = String(new Date().getFullYear())
  const speseAnno = interventi
    .filter((i) => (i.data || '').startsWith(annoCorrente))
    .reduce((t, i) => t + i.costo, 0)

  function dettaglio(mezzo) {
    const storico = interventi.filter((i) => i.mezzoId === mezzo.id)
    const spesaTotale = storico.reduce((t, i) => t + i.costo, 0)

    return (
      <div className="autoparco-dettaglio">
        <div className="lista-head">
          <span className="job-list-label">
            Scheda {mezzo.targa} · officina {formattaEuro(spesaTotale)}
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

        <span className="job-list-label autoparco-sottotitolo">Nuovo intervento di officina</span>
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
              onChange={(e) => setFormIntervento({ ...formIntervento, officina: e.target.value })}
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
          <Vuoto>Nessun intervento registrato su questo mezzo.</Vuoto>
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
                  <td className="db-azioni-cella">
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
  }

  return (
    <>
      <TestataDb
        titolo="Autoparco"
        sottotitolo="Mezzi aziendali: chi li usa, scadenze di legge e interventi di officina. Clicca su un mezzo per la sua scheda."
        azioni={[
          { testo: '+ Nuovo mezzo', onClick: () => setNuovoAperto((v) => !v), aperto: nuovoAperto },
        ]}
      />

      <Riepilogo
        voci={[
          { valore: mezzi.length, etichetta: 'Mezzi in autoparco' },
          {
            valore: conteggi.inScadenza,
            etichetta: 'In scadenza (30 gg)',
            tono: conteggi.inScadenza ? 'ambra' : undefined,
          },
          {
            valore: conteggi.scaduti + conteggi.fermi,
            etichetta: 'Scaduti o fermi',
            tono: conteggi.scaduti + conteggi.fermi ? 'rosso' : undefined,
          },
          { valore: formattaEuro(speseAnno), etichetta: `Spese officina ${annoCorrente}` },
        ]}
      />

      <PannelloNuovo
        aperto={nuovoAperto}
        titolo="Nuovo mezzo"
        onSubmit={salvaMezzo}
        testoInvio="Aggiungi mezzo"
        errore={errore}
      >
        <Campo etichetta="Targa">
          <input
            type="text"
            placeholder="AA123BB"
            value={form.targa}
            onChange={(e) => setForm({ ...form, targa: e.target.value.toUpperCase() })}
          />
        </Campo>
        <Campo etichetta="Tipo">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPI_MEZZO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Marca">
          <input
            type="text"
            placeholder="Es. Fiat"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Modello">
          <input
            type="text"
            placeholder="Es. Ducato"
            value={form.modello}
            onChange={(e) => setForm({ ...form, modello: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Anno">
          <input
            type="number"
            min="1980"
            max="2100"
            placeholder="2019"
            value={form.anno}
            onChange={(e) => setForm({ ...form, anno: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Km">
          <input
            type="number"
            min="0"
            value={form.km}
            onChange={(e) => setForm({ ...form, km: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Carburante">
          <select
            value={form.carburante}
            onChange={(e) => setForm({ ...form, carburante: e.target.value })}
          >
            {CARBURANTI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="In uso a">
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
        </Campo>
        {SCADENZE.map((s) => (
          <Campo etichetta={`${s.etichetta} — scade il`} key={s.campo}>
            <input
              type="date"
              value={form[s.campo]}
              onChange={(e) => setForm({ ...form, [s.campo]: e.target.value })}
            />
          </Campo>
        ))}
      </PannelloNuovo>

      <div className="card sezione">
        <Strumenti
          titolo="Mezzi"
          mostrati={righe.length}
          totali={mezzi.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca targa, modello o operaio..."
        >
          <select className="db-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTRI.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Strumenti>

        {righe.length === 0 ? (
          <Vuoto>
            {mezzi.length === 0
              ? 'Nessun mezzo in autoparco: aggiungi il primo con “+ Nuovo mezzo”.'
              : 'Nessun mezzo trovato.'}
          </Vuoto>
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
                <Fragment key={m.id}>
                  <tr
                    className={'db-riga' + (apertoId === m.id ? ' db-riga-aperta' : '')}
                    onClick={() => apriScheda(m)}
                    title="Apri la scheda del mezzo"
                  >
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
                    <td className="db-azioni-cella">
                      <button
                        type="button"
                        className="riga-elimina"
                        onClick={(e) => {
                          e.stopPropagation()
                          eliminaMezzo(m)
                        }}
                        aria-label="Elimina mezzo"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  {apertoId === m.id && (
                    <tr className="db-dettaglio">
                      <td colSpan={10}>{dettaglio(m)}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogo}
    </>
  )
}
