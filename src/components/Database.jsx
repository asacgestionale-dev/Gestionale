import './Database.css'

// Mattoncini comuni alle pagine del Database (personale, clienti, mezzi,
// DPI, materiali): stessa testata, stessi riquadri, stessa barra di ricerca.

export function TestataDb({ titolo, sottotitolo, azioni = [] }) {
  return (
    <div className="db-testata">
      <div>
        <h1 className="page-title">{titolo}</h1>
        {sottotitolo && <p className="page-subtitle db-sottotitolo">{sottotitolo}</p>}
      </div>
      {azioni.length > 0 && (
        <div className="db-testata-azioni">
          {azioni.map((a) => (
            <button
              key={a.testo}
              type="button"
              className={'db-btn' + (a.secondaria ? ' db-btn-secondario' : '')}
              onClick={a.onClick}
              aria-expanded={a.aperto}
            >
              {a.aperto ? 'Chiudi' : a.testo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// voci: [{ valore, etichetta, tono: 'verde' | 'ambra' | 'rosso', nota }]
export function Riepilogo({ voci }) {
  return (
    <div className="db-riepilogo">
      {voci.map((v) => (
        <div className={'db-tile' + (v.tono ? ' db-tile-' + v.tono : '')} key={v.etichetta}>
          <span className="db-tile-valore">{v.valore}</span>
          <span className="db-tile-etichetta">{v.etichetta}</span>
          {v.nota && <span className="db-tile-nota">{v.nota}</span>}
        </div>
      ))}
    </div>
  )
}

export function PannelloNuovo({ aperto, titolo, onSubmit, testoInvio, errore, children }) {
  if (!aperto) return null
  return (
    <form className="card db-pannello" onSubmit={onSubmit}>
      <span className="db-pannello-titolo">{titolo}</span>
      <div className="db-form">{children}</div>
      {errore && <p className="messaggio-errore">{errore}</p>}
      <div className="db-form-azioni">
        <button type="submit" className="db-btn">
          {testoInvio}
        </button>
      </div>
    </form>
  )
}

export function Campo({ etichetta, largo = false, children }) {
  return (
    <div className={'db-campo' + (largo ? ' db-campo-largo' : '')}>
      <label className="db-campo-etichetta">{etichetta}</label>
      {children}
    </div>
  )
}

// La barra sopra ogni tabella: titolo con conteggio, filtri e ricerca.
export function Strumenti({ titolo, mostrati, totali, ricerca, onRicerca, segnaposto, children }) {
  return (
    <div className="db-strumenti">
      <span className="db-strumenti-titolo">
        {titolo} ({mostrati}
        {totali != null && totali !== mostrati && ` di ${totali}`})
      </span>
      <div className="db-strumenti-filtri">
        {children}
        {onRicerca && (
          <input
            type="search"
            className="db-ricerca"
            placeholder={segnaposto || 'Cerca...'}
            value={ricerca}
            onChange={(e) => onRicerca(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}

export function Vuoto({ children }) {
  return <p className="db-vuoto">{children}</p>
}

// La barra della giornata, uguale in Squadre, Presenze e Assegnazione:
// frecce, calendario, scorciatoie (Oggi, Domani) e il nome del giorno.
export function BarraGiorno({ data, onCambia, scorciatoie = [] }) {
  function sposta(passo) {
    const d = new Date(data)
    d.setDate(d.getDate() + passo)
    onCambia(d.toISOString().slice(0, 10))
  }

  return (
    <div className="card db-giorno">
      <button
        type="button"
        className="db-giorno-nav"
        onClick={() => sposta(-1)}
        aria-label="Giorno precedente"
      >
        ‹
      </button>
      <input
        type="date"
        value={data}
        onChange={(e) => e.target.value && onCambia(e.target.value)}
        aria-label="Giornata"
      />
      <button
        type="button"
        className="db-giorno-nav"
        onClick={() => sposta(1)}
        aria-label="Giorno successivo"
      >
        ›
      </button>
      {scorciatoie.map((s) => (
        <button
          key={s.etichetta}
          type="button"
          className="db-giorno-scorciatoia"
          onClick={() => onCambia(s.data)}
          disabled={data === s.data}
        >
          {s.etichetta}
        </button>
      ))}
      <span className="db-giorno-nome">
        {new Date(data).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </span>
    </div>
  )
}
