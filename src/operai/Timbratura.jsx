import { useEffect, useState } from 'react'
import {
  ENTRATA,
  timbratureDi,
  timbra,
  prossimoTipo,
  oraDi,
  minutiLavorati,
  formattaDurata,
} from '../data/timbrature'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
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
  const [inCorso, setInCorso] = useState(false)
  const [avviso, setAvviso] = useState(null)

  const giorno = oggiISO()

  useEffect(() => {
    timbratureDi(dipendente, giorno).then(setTimbrature)
  }, [dipendente, giorno])

  const tipo = prossimoTipo(timbrature)

  // La posizione è facoltativa: se il telefono non la dà, si timbra lo stesso.
  function posizioneAttuale() {
    return new Promise((risolvi) => {
      if (!navigator.geolocation) return risolvi(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => risolvi({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => risolvi(null),
        { enableHighAccuracy: true, timeout: 6000 },
      )
    })
  }

  async function registra() {
    setInCorso(true)
    setAvviso(null)

    const posizione = await posizioneAttuale()
    const risposta = await timbra({ dipendente, giorno, tipo, posizione })
    setInCorso(false)

    if (risposta.errore) {
      setAvviso({ errore: 'Timbratura non registrata: ' + risposta.errore })
      return
    }

    setTimbrature(await timbratureDi(dipendente, giorno))
    setAvviso({
      ok: `${tipo} registrata alle ${oraDi(risposta.timbratura)}${
        posizione ? '' : ' (senza posizione)'
      }.`,
    })
  }

  const minuti = minutiLavorati(timbrature)
  const alLavoro = timbrature[timbrature.length - 1]?.tipo === ENTRATA

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
      {avviso?.ok && <p className="op-avviso ok">{avviso.ok}</p>}

      <p className="op-timbra-nota">
        {alLavoro
          ? 'Sei al lavoro: timbra l’uscita quando hai finito.'
          : 'Timbra l’entrata quando inizi la giornata.'}
      </p>

      <div className="op-riepilogo">
        <div>
          <strong>{formattaDurata(minuti)}</strong>
          <span>Oggi</span>
        </div>
        <div>
          <strong>{timbrature.length}</strong>
          <span>Timbrature</span>
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
                <span className="op-ora">{oraDi(t)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
