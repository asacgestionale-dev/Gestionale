import { useEffect, useState } from 'react'
import { caricaDipendenti } from '../data/dipendenti'
import {
  TIPI_RICHIESTA,
  IN_ATTESA,
  APPROVATA,
  RIFIUTATA,
  FERIE_ANNUE_PREDEFINITE,
  situazioneFerie,
  inviaRichiesta,
  eliminaRichiesta,
  giorniRichiesti,
} from '../data/ferie'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function classeStato(stato) {
  if (stato === APPROVATA) return 'inviato'
  if (stato === RIFIUTATA) return 'correggere'
  return 'da-fare'
}

export default function Ferie({ dipendente }) {
  const [situazione, setSituazione] = useState(null)
  const [ferieAnnue, setFerieAnnue] = useState(FERIE_ANNUE_PREDEFINITE)
  const [form, setForm] = useState({
    tipo: 'Ferie',
    dataInizio: oggiISO(),
    dataFine: oggiISO(),
    note: '',
  })
  const [avviso, setAvviso] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  async function ricarica(annue = ferieAnnue) {
    setSituazione(await situazioneFerie(dipendente, annue))
  }

  useEffect(() => {
    let annullato = false
    caricaDipendenti().then(async (lista) => {
      const mio = lista.find(
        (d) => d.nome.trim().toLowerCase() === dipendente.trim().toLowerCase(),
      )
      const annue = mio?.ferie_annue ?? FERIE_ANNUE_PREDEFINITE
      if (annullato) return
      setFerieAnnue(annue)
      setSituazione(await situazioneFerie(dipendente, annue))
    })
    return () => {
      annullato = true
    }
  }, [dipendente])

  async function invia(e) {
    e.preventDefault()
    if (form.dataFine < form.dataInizio) {
      setAvviso({ errore: 'La data di fine viene prima di quella di inizio.' })
      return
    }

    setInCorso(true)
    const risposta = await inviaRichiesta({ ...form, dipendente })
    setInCorso(false)

    if (risposta.errore) {
      setAvviso({ errore: 'Richiesta non inviata: ' + risposta.errore })
      return
    }
    setAvviso({ ok: 'Richiesta inviata: la vedrà l’ufficio e ti dirà se va bene.' })
    setForm({ tipo: 'Ferie', dataInizio: oggiISO(), dataFine: oggiISO(), note: '' })
    await ricarica()
  }

  async function annulla(richiesta) {
    await eliminaRichiesta(richiesta.id)
    setAvviso(null)
    await ricarica()
  }

  if (!situazione) {
    return (
      <div className="op-card">
        <p className="op-vuoto">Caricamento…</p>
      </div>
    )
  }

  const giorniForm =
    Math.round((new Date(form.dataFine) - new Date(form.dataInizio)) / 86400000) + 1

  return (
    <>
      <div className="op-riepilogo">
        <div>
          <strong className={situazione.residue < 0 ? 'op-rosso' : ''}>{situazione.residue}</strong>
          <span>Ferie residue</span>
        </div>
        <div>
          <strong>{situazione.godute}</strong>
          <span>Godute</span>
        </div>
        <div>
          <strong>{situazione.spettanti}</strong>
          <span>Spettanti</span>
        </div>
      </div>

      <p className="op-timbra-nota">
        {situazione.inAttesa > 0
          ? `${situazione.inAttesa} ${situazione.inAttesa === 1 ? 'giorno' : 'giorni'} sono già impegnati in richieste in attesa di risposta.`
          : `Hai usato ${situazione.godute} giorni su ${situazione.spettanti} di quest’anno.`}
        {situazione.permessi > 0 && ` Permessi presi: ${situazione.permessi}.`}
      </p>

      <p className="op-titolo-sezione">Chiedi ferie o permesso</p>
      <form className="op-card op-form-ferie" onSubmit={invia}>
        <div className="op-campo">
          <label>Tipo</label>
          <div className="op-giorni">
            {TIPI_RICHIESTA.map((t) => (
              <button
                type="button"
                key={t}
                className={form.tipo === t ? 'scelto' : ''}
                onClick={() => setForm({ ...form, tipo: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="op-campo">
          <label>Dal</label>
          <input
            type="date"
            value={form.dataInizio}
            onChange={(e) => {
              const dataInizio = e.target.value
              setForm((f) => ({
                ...f,
                dataInizio,
                dataFine: f.dataFine < dataInizio ? dataInizio : f.dataFine,
              }))
            }}
          />
        </div>

        <div className="op-campo">
          <label>Al</label>
          <input
            type="date"
            min={form.dataInizio}
            value={form.dataFine}
            onChange={(e) => setForm({ ...form, dataFine: e.target.value })}
          />
        </div>

        <div className="op-campo">
          <label>Motivo (facoltativo)</label>
          <input
            type="text"
            placeholder="Es. visita medica"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        {giorniForm > 0 && (
          <p className="op-timbra-nota">
            Stai chiedendo {giorniForm} {giorniForm === 1 ? 'giorno' : 'giorni'}.
          </p>
        )}

        {avviso?.errore && <p className="op-avviso">{avviso.errore}</p>}
        {avviso?.ok && <p className="op-avviso ok">{avviso.ok}</p>}

        <button type="submit" className="op-invia" disabled={inCorso}>
          {inCorso ? 'Invio…' : 'Invia richiesta'}
        </button>
      </form>

      <p className="op-titolo-sezione">Le tue richieste ({situazione.richieste.length})</p>
      {situazione.richieste.length === 0 ? (
        <div className="op-card">
          <p className="op-vuoto">Non hai ancora chiesto ferie o permessi.</p>
        </div>
      ) : (
        situazione.richieste.map((r) => (
          <div className="op-giornata" key={r.id}>
            <div className="op-giornata-testa">
              <span className="op-giornata-nome">
                {r.tipo} · {formattaData(r.dataInizio)}
                {r.dataFine !== r.dataInizio && ` → ${formattaData(r.dataFine)}`}
              </span>
              <span className="op-giornata-ore">
                {giorniRichiesti(r)} {giorniRichiesti(r) === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>
            <div className="op-giornata-righe">
              <span className={'op-stato ' + classeStato(r.stato)}>{r.stato}</span>
              {r.note && <span className="op-nota-piccola">{r.note}</span>}
            </div>
            {r.stato === RIFIUTATA && r.motivoRifiuto && (
              <p className="op-lavoro-note">Ufficio: {r.motivoRifiuto}</p>
            )}
            {r.stato === IN_ATTESA && (
              <button type="button" className="op-cambia" onClick={() => annulla(r)}>
                Annulla la richiesta
              </button>
            )}
          </div>
        ))
      )}
    </>
  )
}
