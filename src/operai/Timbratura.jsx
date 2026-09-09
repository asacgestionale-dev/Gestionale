import { useEffect, useState } from 'react'
import {
  ENTRATA,
  timbratureDi,
  timbratureDal,
  perGiornata,
  timbra,
  prossimoTipo,
  oraDi,
  minutiLavorati,
  formattaDurata,
} from '../data/timbrature'
import { caricaZone, verificaZona, formattaDistanza } from '../data/impostazioni'

const GIORNI_STORICO = 14

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function giorniFa(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function etichettaGiorno(iso) {
  if (iso === oggiISO()) return 'Oggi'
  if (iso === giorniFa(1)) return 'Ieri'
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// L'orologio in cima serve a far vedere l'ora che verrà registrata.
function useOrologio() {
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setAdesso(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return adesso
}

export default function Timbratura({ dipendente }) {
  const adesso = useOrologio()
  const [timbrature, setTimbrature] = useState([])
  const [storico, setStorico] = useState([])
  const [zone, setZone] = useState(null)
  const [inCorso, setInCorso] = useState(false)
  const [avviso, setAvviso] = useState(null)

  const giorno = oggiISO()

  async function ricarica() {
    const [oggi, ultimi] = await Promise.all([
      timbratureDi(dipendente, giorno),
      timbratureDal(dipendente, giorniFa(GIORNI_STORICO)),
    ])
    setTimbrature(oggi)
    setStorico(perGiornata(ultimi))
  }

  useEffect(() => {
    ricarica()
    caricaZone().then(setZone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dipendente, giorno])

  const tipo = prossimoTipo(timbrature)

  // La posizione serve a dire se la timbratura è avvenuta in una zona valida.
  function posizioneAttuale() {
    return new Promise((risolvi) => {
      if (!navigator.geolocation) return risolvi(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => risolvi({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => risolvi(null),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    })
  }

  async function registra() {
    setInCorso(true)
    setAvviso(null)

    const posizione = await posizioneAttuale()
    const esito = verificaZona(zone, posizione)

    const risposta = await timbra({
      dipendente,
      giorno,
      tipo,
      posizione,
      valida: esito.valida,
      distanza: esito.distanza,
    })
    setInCorso(false)

    if (risposta.errore) {
      setAvviso({ errore: 'Timbratura non registrata: ' + risposta.errore })
      return
    }

    await ricarica()

    if (esito.valida) {
      setAvviso({ ok: `${tipo} registrata alle ${oraDi(risposta.timbratura)}.` })
    } else if (esito.motivo === 'posizione mancante') {
      setAvviso({
        attenzione: `${tipo} registrata alle ${oraDi(risposta.timbratura)}, ma senza posizione: risulta da verificare. Attiva la localizzazione e avvisa l’ufficio.`,
      })
    } else {
      setAvviso({
        attenzione: `${tipo} registrata alle ${oraDi(risposta.timbratura)}, ma sei a ${formattaDistanza(esito.distanza)} da ${esito.zona?.nome || 'la zona di lavoro'}: risulta fuori zona e la controllerà l’ufficio.`,
      })
    }
  }

  const minuti = minutiLavorati(timbrature)
  const alLavoro = timbrature[timbrature.length - 1]?.tipo === ENTRATA
  const zoneAttive = zone?.attivo && (zone.punti || []).length > 0

  // le ore della settimana in corso, per sapere a che punto si è
  const inizioSettimana = (() => {
    const d = new Date()
    const giornoSettimana = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - giornoSettimana)
    return d.toISOString().slice(0, 10)
  })()
  const minutiSettimana = storico
    .filter((g) => g.giorno >= inizioSettimana)
    .reduce((t, g) => t + g.minuti, 0)

  return (
    <>
      <div className="op-card">
        <div className="op-orologio">
          <div className="op-orologio-ora">
            {adesso.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="op-orologio-data">
            {adesso.toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={'op-timbra' + (tipo === ENTRATA ? '' : ' uscita')}
        onClick={registra}
        disabled={inCorso}
      >
        {inCorso ? 'Registrazione...' : tipo === ENTRATA ? 'TIMBRA ENTRATA' : 'TIMBRA USCITA'}
      </button>

      {avviso?.errore && <p className="op-avviso">{avviso.errore}</p>}
      {avviso?.attenzione && <p className="op-avviso attenzione">{avviso.attenzione}</p>}
      {avviso?.ok && <p className="op-avviso ok">{avviso.ok}</p>}

      <p className="op-timbra-nota">
        {alLavoro
          ? 'Sei al lavoro: timbra l’uscita quando hai finito.'
          : 'Timbra l’entrata quando inizi la giornata.'}
        {zoneAttive && ' La timbratura vale solo dalle zone di lavoro impostate dall’ufficio.'}
      </p>

      <div className="op-riepilogo">
        <div>
          <strong>{formattaDurata(minuti)}</strong>
          <span>Oggi</span>
        </div>
        <div>
          <strong>{formattaDurata(minutiSettimana)}</strong>
          <span>Questa settimana</span>
        </div>
      </div>

      <p className="op-titolo-sezione">Oggi hai timbrato</p>
      <div className="op-card">
        {timbrature.length === 0 ? (
          <p className="op-vuoto">Nessuna timbratura registrata oggi.</p>
        ) : (
          <ul className="op-lista-timbrature">
            {timbrature.map((t) => (
              <li key={t.id}>
                <span className={'op-tipo ' + t.tipo.toLowerCase()}>{t.tipo}</span>
                {!t.valida && <span className="op-fuori-zona">fuori zona</span>}
                <span className="op-ora">{oraDi(t)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="op-titolo-sezione">Ultimi giorni</p>
      {storico.length === 0 ? (
        <div className="op-card">
          <p className="op-vuoto">Nessuna timbratura negli ultimi {GIORNI_STORICO} giorni.</p>
        </div>
      ) : (
        storico.map((g) => (
          <div className="op-giornata" key={g.giorno}>
            <div className="op-giornata-testa">
              <span className="op-giornata-nome">{etichettaGiorno(g.giorno)}</span>
              <span className="op-giornata-ore">{formattaDurata(g.minuti)}</span>
            </div>
            <div className="op-giornata-righe">
              {g.timbrature.map((t) => (
                <span key={t.id} className={'op-passaggio ' + t.tipo.toLowerCase()}>
                  {t.tipo === ENTRATA ? '↓' : '↑'} {oraDi(t)}
                  {!t.valida && ' ⚠'}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
