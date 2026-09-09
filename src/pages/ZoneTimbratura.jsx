import { useEffect, useState } from 'react'
import InputIndirizzo from '../components/InputIndirizzo'
import { useConferma } from '../components/useConferma'
import { caricaZone, salvaZone, ZONE_VUOTE } from '../data/impostazioni'

const PUNTO_VUOTO = { nome: '', indirizzo: '', lat: '', lon: '' }

// Zone entro cui una timbratura è considerata valida: le imposta
// l'amministratore e valgono per tutti i telefoni degli operai.
export default function ZoneTimbratura({ amministratore }) {
  const [zone, setZone] = useState(null)
  const [punto, setPunto] = useState(PUNTO_VUOTO)
  const [esito, setEsito] = useState(null)
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    caricaZone().then(setZone)
  }, [])

  async function salva(prossime) {
    setZone(prossime)
    const risposta = await salvaZone(prossime)
    setEsito(
      risposta.errore
        ? { errore: 'Non salvato: ' + risposta.errore }
        : { ok: 'Impostazione salvata: vale subito su tutti i telefoni.' },
    )
  }

  function rilevaPosizione() {
    if (!navigator.geolocation) {
      setEsito({ errore: 'Questo dispositivo non sa dire dove si trova.' })
      return
    }
    setEsito({ ok: 'Rilevamento in corso…' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto((p) => ({
          ...p,
          lat: pos.coords.latitude.toFixed(6),
          lon: pos.coords.longitude.toFixed(6),
        }))
        setEsito(null)
      },
      (err) => setEsito({ errore: 'Posizione non rilevata: ' + err.message }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function aggiungiPunto(e) {
    e.preventDefault()
    const lat = Number(punto.lat)
    const lon = Number(punto.lon)

    if (!punto.nome.trim()) return setEsito({ errore: 'Dai un nome alla zona.' })
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
      return setEsito({ errore: 'Servono le coordinate: cerca l’indirizzo o usa la posizione.' })
    }

    salva({
      ...zone,
      punti: [
        ...(zone.punti || []),
        { nome: punto.nome.trim(), indirizzo: punto.indirizzo.trim(), lat, lon },
      ],
    })
    setPunto(PUNTO_VUOTO)
  }

  function togliPunto(indice) {
    const daTogliere = zone.punti[indice]
    chiedi({
      titolo: 'Eliminare la zona?',
      messaggio: `"${daTogliere.nome}" non varrà più: le timbrature fatte lì risulteranno fuori zona.`,
      onConferma: () => salva({ ...zone, punti: zone.punti.filter((_, i) => i !== indice) }),
    })
  }

  if (!zone) return null

  const punti = zone.punti || []

  return (
    <div className="card sezione-impostazione">
      <div className="impostazione-riga">
        <div>
          <span className="impostazione-titolo">Zone valide per timbrare</span>
          <p className="impostazione-desc">
            Una timbratura vale se l’operaio si trova entro il raggio indicato da una di queste
            zone. Fuori zona resta registrata, ma segnata in rosso da controllare.
          </p>
        </div>
      </div>

      {!amministratore ? (
        <p className="job-list-empty">
          Solo l’amministratore può cambiare le zone.
          {punti.length > 0 &&
            ` Al momento ne sono impostate ${punti.length}, con raggio ${zone.raggio} metri.`}
        </p>
      ) : (
        <>
          <div className="zone-riga-controllo">
            <label className="check-riga">
              <input
                type="checkbox"
                checked={zone.attivo}
                onChange={(e) => salva({ ...zone, attivo: e.target.checked })}
              />
              Controlla dove viene fatta la timbratura
            </label>

            <div className="zone-raggio">
              <label className="job-form-label">Raggio (metri)</label>
              <input
                type="number"
                min="20"
                step="10"
                value={zone.raggio}
                onChange={(e) => setZone({ ...zone, raggio: e.target.value })}
                onBlur={() => salva({ ...zone, raggio: Number(zone.raggio) || ZONE_VUOTE.raggio })}
              />
            </div>
          </div>

          {!zone.attivo && (
            <p className="job-list-empty">
              Controllo spento: ogni timbratura è considerata valida, ovunque venga fatta.
            </p>
          )}

          <form className="zone-form" onSubmit={aggiungiPunto}>
            <div className="zone-campo">
              <label className="job-form-label">Nome della zona</label>
              <input
                type="text"
                placeholder="Es. Sede, Cantiere via Roma"
                value={punto.nome}
                onChange={(e) => setPunto({ ...punto, nome: e.target.value })}
              />
            </div>

            <div className="zone-campo zone-campo-largo">
              <label className="job-form-label">Indirizzo</label>
              <InputIndirizzo
                placeholder="Cerca l'indirizzo"
                value={punto.indirizzo}
                onChange={(v) => setPunto((p) => ({ ...p, indirizzo: v }))}
                onSelezione={(coord) =>
                  setPunto((p) => ({
                    ...p,
                    lat: coord.lat.toFixed(6),
                    lon: coord.lon.toFixed(6),
                  }))
                }
                posizione={
                  Number(punto.lat) ? { lat: Number(punto.lat), lon: Number(punto.lon) } : null
                }
              />
            </div>

            <div className="zone-campo zone-campo-stretto">
              <label className="job-form-label">Latitudine</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="41.590"
                value={punto.lat}
                onChange={(e) => setPunto({ ...punto, lat: e.target.value })}
              />
            </div>

            <div className="zone-campo zone-campo-stretto">
              <label className="job-form-label">Longitudine</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="12.826"
                value={punto.lon}
                onChange={(e) => setPunto({ ...punto, lon: e.target.value })}
              />
            </div>

            <button type="button" className="gps-btn zone-gps" onClick={rilevaPosizione}>
              Usa dove sono adesso
            </button>
            <button type="submit">Aggiungi zona</button>
          </form>

          {esito?.errore && <p className="messaggio-errore">{esito.errore}</p>}
          {esito?.ok && <p className="gps-stato gps-ok">{esito.ok}</p>}
        </>
      )}

      {punti.length > 0 && (
        <table className="task-table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Indirizzo</th>
              <th>Coordinate</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {punti.map((p, i) => (
              <tr key={p.nome + i}>
                <td className="cliente-nome-link">{p.nome}</td>
                <td>{p.indirizzo || '—'}</td>
                <td>
                  {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                  <a
                    className="zone-mappa"
                    href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    mappa
                  </a>
                </td>
                <td>
                  {amministratore && (
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => togliPunto(i)}
                      aria-label="Elimina zona"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dialogo}
    </div>
  )
}
