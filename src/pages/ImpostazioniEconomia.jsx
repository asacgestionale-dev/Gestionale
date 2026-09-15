import { useEffect, useState } from 'react'
import { caricaEconomia, salvaEconomia } from '../data/impostazioni'

// Costo aziendale di un'ora di lavoro, usato per il margine di ogni lavoro.
export default function ImpostazioniEconomia({ amministratore }) {
  const [economia, setEconomia] = useState(null)
  const [esito, setEsito] = useState(null)

  useEffect(() => {
    caricaEconomia().then(setEconomia)
  }, [])

  async function salva() {
    const prossima = { ...economia, costoOrario: Number(economia.costoOrario) || 0 }
    setEconomia(prossima)
    const risposta = await salvaEconomia(prossima)
    setEsito(
      risposta.errore
        ? { errore: 'Non salvato: ' + risposta.errore }
        : { ok: 'Salvato: i margini dei lavori si ricalcolano subito.' },
    )
  }

  if (!economia) return null

  return (
    <div className="card sezione-impostazione">
      <div className="impostazione-riga">
        <div>
          <span className="impostazione-titolo">Costo orario del personale</span>
          <p className="impostazione-desc">
            Serve a calcolare il margine di ogni lavoro: ore del rapportino × persone × costo
            orario. Usa il costo aziendale medio di un'ora di lavoro, cioè stipendio più contributi
            e accantonamenti, non la paga netta.
          </p>
        </div>
      </div>

      {amministratore ? (
        <div className="zone-riga-controllo">
          <div className="zone-raggio">
            <label className="job-form-label">Euro all'ora</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={economia.costoOrario}
              onChange={(e) => setEconomia({ ...economia, costoOrario: e.target.value })}
              onBlur={salva}
            />
          </div>
        </div>
      ) : (
        <p className="job-list-empty">
          Costo orario impostato: {economia.costoOrario} €/h. Solo l’amministratore può cambiarlo.
        </p>
      )}

      {esito?.errore && <p className="messaggio-errore">{esito.errore}</p>}
      {esito?.ok && <p className="gps-stato gps-ok">{esito.ok}</p>}
    </div>
  )
}
