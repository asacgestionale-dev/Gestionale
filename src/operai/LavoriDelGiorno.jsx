import { useEffect, useState } from 'react'
import { caricaLavori, aggiornaLavoro, orarioDaMinuti } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { caricaComposizione, SQUADRE_BASE, oggiISO, domaniISO } from '../data/squadre'
import { consuntivoVuoto } from '../data/consuntivi'

// Il lavoro assegnato alla squadra dell'operaio, per la giornata scelta.
function miaSquadra(composizione, nome) {
  const cercato = nome.trim().toLowerCase()
  const trovata = SQUADRE_BASE.find((s) =>
    (composizione[s.id] || []).some((m) => m.trim().toLowerCase() === cercato),
  )
  return trovata || null
}

function statoDelLavoro(lavoro) {
  if (lavoro.chiuso) return { testo: 'Chiuso dall’ufficio', classe: 'chiuso' }
  if (lavoro.consuntivo?.rifiutato) return { testo: 'Da correggere', classe: 'correggere' }
  if (lavoro.consuntivo) return { testo: 'Rapportino inviato', classe: 'inviato' }
  return { testo: 'Da fare', classe: 'da-fare' }
}

function linkMappa(lavoro) {
  if (lavoro.posizione?.lat) {
    return `https://www.google.com/maps/search/?api=1&query=${lavoro.posizione.lat},${lavoro.posizione.lon}`
  }
  if (lavoro.indirizzo) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lavoro.indirizzo)
  }
  return null
}

export default function LavoriDelGiorno({ dipendente, onNumeroLavori }) {
  const [giorno, setGiorno] = useState(oggiISO())
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [squadra, setSquadra] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [apertoId, setApertoId] = useState(null)
  const [form, setForm] = useState(null)
  const [avviso, setAvviso] = useState(null)

  useEffect(() => {
    caricaClienti().then(setClienti)
  }, [])

  useEffect(() => {
    let annullato = false
    setCaricamento(true)

    Promise.all([caricaLavori(), caricaComposizione(giorno)]).then(([l, comp]) => {
      if (annullato) return
      setLavori(l)
      setSquadra(miaSquadra(comp, dipendente))
      setCaricamento(false)
    })

    return () => {
      annullato = true
    }
  }, [dipendente, giorno])

  const miei = squadra
    ? lavori
        .filter((l) => l.assegnato?.teamId === squadra.id && l.assegnato?.data === giorno)
        .sort((a, b) => (a.assegnato.minuti || 0) - (b.assegnato.minuti || 0))
    : []

  // la barra in basso mostra quanti lavori restano da chiudere oggi
  useEffect(() => {
    if (giorno !== oggiISO()) return
    onNumeroLavori?.(miei.filter((l) => !l.consuntivo && !l.chiuso).length)
  }, [miei, giorno, onNumeroLavori])

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || ''

  function apriRapportino(lavoro) {
    if (apertoId === lavoro.id) {
      setApertoId(null)
      return
    }
    const base = lavoro.consuntivo || consuntivoVuoto(lavoro, [dipendente])
    setApertoId(lavoro.id)
    setAvviso(null)
    setForm({
      oreEffettive: base.oreEffettive ?? lavoro.durata,
      materialiUsati: base.materialiUsati || [],
      materialeAggiunto: '',
      noteOperaio: base.noteOperaio || '',
    })
  }

  function commutaMateriale(nome) {
    setForm((f) => ({
      ...f,
      materialiUsati: f.materialiUsati.includes(nome)
        ? f.materialiUsati.filter((m) => m !== nome)
        : [...f.materialiUsati, nome],
    }))
  }

  async function inviaRapportino(lavoro) {
    const ore = Number(form.oreEffettive)
    if (!ore || ore <= 0) {
      setAvviso({ errore: 'Indica quante ore ci hai messo.' })
      return
    }

    // il materiale scritto a mano si aggiunge a quelli spuntati
    const aggiunto = form.materialeAggiunto.trim()
    const materialiUsati = aggiunto
      ? [...form.materialiUsati, ...aggiunto.split(',').map((m) => m.trim()).filter(Boolean)]
      : form.materialiUsati

    const consuntivo = {
      ...consuntivoVuoto(lavoro, [dipendente]),
      oreEffettive: ore,
      materialiUsati,
      noteOperaio: form.noteOperaio.trim(),
      compilatoDa: dipendente,
      compilatoIl: new Date().toISOString(),
      rifiutato: false,
      motivoRifiuto: '',
    }

    await aggiornaLavoro(lavoro.id, { consuntivo, completato: true })
    setLavori((prev) =>
      prev.map((l) => (l.id === lavoro.id ? { ...l, consuntivo, completato: true } : l)),
    )
    setApertoId(null)
    setAvviso({ ok: 'Rapportino inviato: lo controlla l’ufficio.' })
  }

  return (
    <>
      <div className="op-giorni">
        <button
          type="button"
          className={giorno === oggiISO() ? 'scelto' : ''}
          onClick={() => setGiorno(oggiISO())}
        >
          Oggi
        </button>
        <button
          type="button"
          className={giorno === domaniISO() ? 'scelto' : ''}
          onClick={() => setGiorno(domaniISO())}
        >
          Domani
        </button>
      </div>

      {avviso?.ok && <p className="op-avviso ok">{avviso.ok}</p>}

      {caricamento ? (
        <div className="op-card">
          <p className="op-vuoto">Caricamento…</p>
        </div>
      ) : !squadra ? (
        <div className="op-card">
          <p className="op-vuoto">
            Non risulti in nessuna squadra per questa giornata.
            <br />
            Se è un errore, avvisa l’ufficio.
          </p>
        </div>
      ) : miei.length === 0 ? (
        <div className="op-card">
          <p className="op-vuoto">
            {squadra.nome}: nessun lavoro assegnato
            {giorno === oggiISO() ? ' per oggi' : ' per domani'}.
          </p>
        </div>
      ) : (
        <>
          <p className="op-titolo-sezione">
            {squadra.nome} · {miei.length} {miei.length === 1 ? 'lavoro' : 'lavori'}
          </p>

          {miei.map((lavoro) => {
            const stato = statoDelLavoro(lavoro)
            const inizio = lavoro.assegnato.minuti || 0
            const fine = inizio + (Number(lavoro.durata) || 1) * 60
            const mappa = linkMappa(lavoro)
            const aperto = apertoId === lavoro.id

            return (
              <div className="op-lavoro" key={lavoro.id}>
                <div className="op-lavoro-testa">
                  <div className="op-lavoro-ora">
                    {orarioDaMinuti(inizio)}
                    <small>{orarioDaMinuti(fine)}</small>
                  </div>
                  <div className="op-lavoro-corpo">
                    <div className="op-lavoro-titolo">{lavoro.titolo}</div>
                    <div className="op-lavoro-cliente">
                      {nomeCliente(lavoro.clienteId)}
                      {lavoro.indirizzo ? ` · ${lavoro.indirizzo}` : ''}
                    </div>
                    {lavoro.note && <p className="op-lavoro-note">{lavoro.note}</p>}
                    {lavoro.materiali?.length > 0 && (
                      <ul className="op-materiali">
                        {lavoro.materiali.map((m, i) => (
                          <li key={m + i}>{m}</li>
                        ))}
                      </ul>
                    )}
                    <span className={'op-stato ' + stato.classe}>{stato.testo}</span>
                    {lavoro.consuntivo?.rifiutato && lavoro.consuntivo.motivoRifiuto && (
                      <p className="op-lavoro-note">
                        Ufficio: {lavoro.consuntivo.motivoRifiuto}
                      </p>
                    )}
                  </div>
                </div>

                <div className="op-azioni">
                  {mappa && (
                    <a href={mappa} target="_blank" rel="noreferrer">
                      Naviga
                    </a>
                  )}
                  {!lavoro.chiuso && (
                    <button
                      type="button"
                      className={aperto ? '' : 'principale'}
                      onClick={() => apriRapportino(lavoro)}
                    >
                      {aperto ? 'Chiudi' : lavoro.consuntivo ? 'Correggi' : 'Rapportino'}
                    </button>
                  )}
                </div>

                {aperto && form && (
                  <div className="op-rapportino">
                    <div className="op-campo">
                      <label>Ore impiegate</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        inputMode="decimal"
                        value={form.oreEffettive}
                        onChange={(e) => setForm({ ...form, oreEffettive: e.target.value })}
                      />
                    </div>

                    {lavoro.materiali?.length > 0 && (
                      <div className="op-campo">
                        <label>Materiali usati</label>
                        <div className="op-scelte">
                          {lavoro.materiali.map((m, i) => (
                            <label className="op-scelta" key={m + i}>
                              <input
                                type="checkbox"
                                checked={form.materialiUsati.includes(m)}
                                onChange={() => commutaMateriale(m)}
                              />
                              {m}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="op-campo">
                      <label>Altro materiale usato</label>
                      <input
                        type="text"
                        placeholder="Separa con la virgola"
                        value={form.materialeAggiunto}
                        onChange={(e) => setForm({ ...form, materialeAggiunto: e.target.value })}
                      />
                    </div>

                    <div className="op-campo">
                      <label>Note per l’ufficio</label>
                      <textarea
                        rows={4}
                        placeholder="Cosa hai fatto, problemi trovati..."
                        value={form.noteOperaio}
                        onChange={(e) => setForm({ ...form, noteOperaio: e.target.value })}
                      />
                    </div>

                    {avviso?.errore && <p className="op-avviso">{avviso.errore}</p>}

                    <button
                      type="button"
                      className="op-invia"
                      onClick={() => inviaRapportino(lavoro)}
                    >
                      Invia rapportino
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}
