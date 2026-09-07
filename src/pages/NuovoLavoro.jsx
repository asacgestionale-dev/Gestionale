import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { caricaLavori, salvaLavori, nuovoLavoro, minutiDaOrario } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import InputIndirizzo from '../components/InputIndirizzo'
import SelezioneCliente from '../components/SelezioneCliente'
import { salvaDocumento } from '../data/documenti'
import './AssegnazioneLavori.css'
import './NuovoLavoro.css'

export default function NuovoLavoro() {
  const navigate = useNavigate()
  const [clienti, setClienti] = useState(caricaClienti)
  const [jobs, setJobs] = useState(caricaLavori)

  // nessun cliente preselezionato: si sceglie cercandolo
  const [clienteId, setClienteId] = useState('')
  const [dataAppuntamento, setDataAppuntamento] = useState('')
  const [oraAppuntamento, setOraAppuntamento] = useState('08:00')
  const [titolo, setTitolo] = useState('')
  const [note, setNote] = useState('')
  const [durata, setDurata] = useState(1)
  const [importo, setImporto] = useState('')
  // preventivo allegato al lavoro: finisce nei documenti del cliente
  const [preventivo, setPreventivo] = useState(null)
  const [materiali, setMateriali] = useState([])
  const [materiale, setMateriale] = useState('')

  const [indirizzoSede, setIndirizzoSede] = useState(true)
  const [indirizzoAltro, setIndirizzoAltro] = useState('')

  const [posizione, setPosizione] = useState(null)
  const [statoGps, setStatoGps] = useState('')
  const [conferma, setConferma] = useState('')
  // campi obbligatori mancanti, evidenziati dopo un tentativo di salvataggio
  const [errori, setErrori] = useState([])

  const cliente = clienti.find((c) => c.id === clienteId)
  const indirizzoIntervento = indirizzoSede ? cliente?.indirizzo || '' : indirizzoAltro

  function rilevaPosizione() {
    if (!navigator.geolocation) {
      setStatoGps('Geolocalizzazione non supportata dal browser.')
      return
    }
    setStatoGps('Rilevamento in corso...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosizione({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStatoGps('')
      },
      (err) => setStatoGps('Impossibile rilevare la posizione: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function aggiungiMateriale(e) {
    e.preventDefault()
    if (!materiale.trim()) return
    setMateriali((prev) => [...prev, materiale.trim()])
    setMateriale('')
  }

  function rimuoviMateriale(indice) {
    setMateriali((prev) => prev.filter((_, i) => i !== indice))
  }

  function handleSubmit(e, vaiAllAssegnazione = false) {
    e.preventDefault()

    const mancanti = []
    if (!clienteId) mancanti.push('cliente')
    if (!titolo.trim()) mancanti.push('titolo')
    if (!indirizzoSede && !indirizzoAltro.trim()) mancanti.push('indirizzo')
    if (mancanti.length > 0) {
      setErrori(mancanti)
      setConferma('')
      return
    }
    setErrori([])

    const appuntamento = dataAppuntamento
      ? { data: dataAppuntamento, minuti: minutiDaOrario(oraAppuntamento) }
      : null
    const next = [
      ...jobs,
      nuovoLavoro(jobs, {
        titolo,
        durata,
        clienteId,
        note,
        materiali,
        indirizzo: indirizzoIntervento,
        posizione,
        importo,
        appuntamento,
      }),
    ]
    setJobs(next)
    salvaLavori(next)

    // il preventivo viene archiviato fra i documenti del cliente
    if (preventivo) salvaDocumento(clienteId, preventivo, 'Preventivo')

    if (vaiAllAssegnazione || appuntamento) {
      navigate('/assegnazione-lavori')
      return
    }

    setConferma(`"${titolo.trim()}" aggiunto ai lavori da assegnare.`)
    setTitolo('')
    setNote('')
    setDurata(1)
    setImporto('')
    setPreventivo(null)
    setMateriali([])
    setIndirizzoAltro('')
    setIndirizzoSede(true)
    setPosizione(null)
    setStatoGps('')
    setDataAppuntamento('')
    setOraAppuntamento('08:00')
  }

  return (
    <>
      <div className="pagina-head">
        <div>
          <h1 className="page-title">Nuovo Lavoro</h1>
          <p className="page-subtitle">
            Crea un lavoro: comparirà tra i "da assegnare" nella pagina Assegnazione Lavori.
          </p>
        </div>
        <Link to="/assegnazione-lavori" className="vai-assegnazione">
          Vai ad Assegnazione Lavori →
        </Link>
      </div>

      <form className="job-form nuovo-lavoro-form" onSubmit={handleSubmit}>
        <div className="form-griglia">
          <div className="form-colonna">
            <label className={'job-form-label' + (errori.includes('cliente') ? ' label-errore' : '')}>
              Cliente {errori.includes('cliente') && '— obbligatorio'}
            </label>
            <div className={errori.includes('cliente') ? 'campo-errore' : undefined}>
              <SelezioneCliente
                clienti={clienti}
                clienteId={clienteId}
                onCambia={setClienteId}
                onClientiAggiornati={setClienti}
              />
            </div>

            <label className={'job-form-label' + (errori.includes('titolo') ? ' label-errore' : '')}>
              Descrizione del lavoro {errori.includes('titolo') && '— titolo obbligatorio'}
            </label>
            <input
              type="text"
              placeholder="Titolo"
              className={errori.includes('titolo') ? 'campo-errore' : undefined}
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
            />
            <textarea
              rows={7}
              placeholder="Note: cosa bisogna fare"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <label className="job-form-label">Durata</label>
            <select value={durata} onChange={(e) => setDurata(e.target.value)}>
              <option value={1}>1 ora</option>
              <option value={2}>2 ore</option>
              <option value={3}>3 ore</option>
              <option value={4}>4 ore</option>
              <option value={6}>6 ore</option>
            </select>

            <label className="job-form-label">Importo concordato (€)</label>
            <div className="importo-riga">
              <input
                type="number"
                min="0"
                step="10"
                placeholder="0"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
              />
              {preventivo ? (
                <span className="preventivo-allegato" title={preventivo.name}>
                  📄 {preventivo.name.length > 18 ? preventivo.name.slice(0, 16) + '…' : preventivo.name}
                  <button
                    type="button"
                    onClick={() => setPreventivo(null)}
                    aria-label="Togli il preventivo"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <label className="preventivo-carica">
                  Allega preventivo
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    hidden
                    onChange={(e) => setPreventivo(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="form-colonna">
            <label className="job-form-label">Materiali</label>
            <div className="materiale-riga">
              <input
                type="text"
                placeholder="Aggiungi materiale"
                value={materiale}
                onChange={(e) => setMateriale(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiMateriale(e)}
              />
              <button type="button" className="materiale-add" onClick={aggiungiMateriale}>
                +
              </button>
            </div>
            {materiali.length > 0 && (
              <ul className="materiale-lista">
                {materiali.map((m, i) => (
                  <li key={m + i}>
                    <span>{m}</span>
                    <button type="button" onClick={() => rimuoviMateriale(i)} aria-label="Rimuovi">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label
              className={'job-form-label' + (errori.includes('indirizzo') ? ' label-errore' : '')}
            >
              Luogo dell'intervento {errori.includes('indirizzo') && '— obbligatorio'}
            </label>
            <label className="check-riga">
              <input
                type="checkbox"
                checked={indirizzoSede}
                onChange={(e) => setIndirizzoSede(e.target.checked)}
              />
              L'indirizzo è quello in anagrafica
            </label>
            {indirizzoSede ? (
              <p className="indirizzo-anagrafica">{cliente?.indirizzo || '—'}</p>
            ) : (
              <div className={errori.includes('indirizzo') ? 'campo-errore' : undefined}>
                <InputIndirizzo
                  placeholder="Indirizzo intervento"
                  value={indirizzoAltro}
                  onChange={setIndirizzoAltro}
                  onSelezione={(punto) => setPosizione(punto)}
                  posizione={posizione}
                />
              </div>
            )}

            <button type="button" className="gps-btn" onClick={rilevaPosizione}>
              Usa la mia posizione attuale
            </button>
            {statoGps && <p className="gps-stato">{statoGps}</p>}
            {posizione && (
              <p className="gps-stato gps-ok">
                Geolocalizzato: {posizione.lat.toFixed(5)}, {posizione.lon.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        <div className="appuntamento-box">
          <label className="job-form-label">Appuntamento per il</label>
          <div className="appuntamento-riga">
            <input
              type="date"
              value={dataAppuntamento}
              onChange={(e) => setDataAppuntamento(e.target.value)}
            />
            <input
              type="time"
              step="1800"
              value={oraAppuntamento}
              onChange={(e) => setOraAppuntamento(e.target.value)}
              disabled={!dataAppuntamento}
            />
            {dataAppuntamento && (
              <button
                type="button"
                className="appuntamento-annulla"
                onClick={() => setDataAppuntamento('')}
              >
                Togli appuntamento
              </button>
            )}
          </div>
          <p className="appuntamento-nota">
            {dataAppuntamento
              ? 'Il lavoro va direttamente in Assegnazione Lavori: se le squadre non sono ancora pronte resta nella riga "Da assegnare a squadra".'
              : 'Senza data il lavoro resta fra quelli da assegnare.'}
          </p>
        </div>

        <button type="submit">
          {dataAppuntamento ? 'Aggiungi e pianifica' : 'Aggiungi lavoro'}
        </button>
        {errori.length > 0 && (
          <p className="messaggio-errore">
            Compila i campi evidenziati in rosso: {errori.join(', ')}.
          </p>
        )}
        {conferma && <p className="gps-stato gps-ok">{conferma}</p>}
      </form>
    </>
  )
}
