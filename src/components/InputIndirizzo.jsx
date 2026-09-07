import { useEffect, useRef, useState } from 'react'
import './InputIndirizzo.css'

// Nominatim non gestisce bene le query libere: se non trova nulla si riprova
// con varianti progressivamente più semplici dell'indirizzo digitato.
function varianti(query) {
  const pulita = query.replace(/\s+/g, ' ').trim()
  const lista = [pulita]
  const senzaCivico = pulita.replace(/,?\s*\d+\s*$/, '').trim()
  if (senzaCivico && senzaCivico !== pulita) lista.push(senzaCivico)
  const conVirgola = senzaCivico.replace(/\s+(\S+)$/, ', $1')
  if (conVirgola !== senzaCivico) lista.push(conVirgola)
  return lista
}

async function cerca(query) {
  for (const variante of varianti(query)) {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=it&q=' +
        encodeURIComponent(variante)
      const risposta = await fetch(url)
      const righe = await risposta.json()
      if (righe.length > 0) {
        return righe.map((r) => ({
          etichetta: r.display_name,
          lat: Number(r.lat),
          lon: Number(r.lon),
        }))
      }
    } catch {
      return []
    }
  }
  return []
}

// Campo indirizzo con suggerimenti e geolocalizzazione automatica.
// onSelezione riceve le coordinate: scatta sia scegliendo un suggerimento
// sia automaticamente quando si smette di digitare.
export default function InputIndirizzo({
  value,
  onChange,
  onSelezione,
  posizione,
  placeholder = 'Indirizzo',
}) {
  const [suggerimenti, setSuggerimenti] = useState([])
  const [aperto, setAperto] = useState(false)
  const [cercando, setCercando] = useState(false)
  const contenitore = useRef(null)
  const ultimaCercata = useRef('')
  // la tendina si apre solo dopo che l'utente ha digitato, non al caricamento della scheda
  const digitato = useRef(false)

  useEffect(() => {
    function fuori(e) {
      if (contenitore.current && !contenitore.current.contains(e.target)) setAperto(false)
    }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [])

  useEffect(() => {
    const query = (value || '').trim()
    if (query.length < 4 || query === ultimaCercata.current) {
      if (query.length < 4) setSuggerimenti([])
      return
    }

    const timer = setTimeout(async () => {
      setCercando(true)
      const trovati = await cerca(query)
      ultimaCercata.current = query
      setSuggerimenti(trovati)
      setAperto(digitato.current && trovati.length > 0)
      // geolocalizzazione automatica sul risultato migliore, senza toccare il testo digitato
      if (trovati.length > 0) {
        onSelezione?.({ lat: trovati[0].lat, lon: trovati[0].lon }, query, true)
      }
      setCercando(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [value, onSelezione])

  function scegli(s) {
    ultimaCercata.current = s.etichetta
    onChange(s.etichetta)
    onSelezione?.({ lat: s.lat, lon: s.lon }, s.etichetta, false)
    setAperto(false)
    setSuggerimenti([])
  }

  const urlMappa = posizione
    ? `https://www.google.com/maps?q=${posizione.lat},${posizione.lon}`
    : `https://www.google.com/maps/search/${encodeURIComponent(value || '')}`

  return (
    <div className="indirizzo-riga">
      <div className="input-indirizzo" ref={contenitore}>
        <input
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            digitato.current = true
            onChange(e.target.value)
          }}
          onFocus={() => digitato.current && suggerimenti.length > 0 && setAperto(true)}
          autoComplete="off"
        />
        {cercando && <span className="indirizzo-spinner">…</span>}
        {aperto && suggerimenti.length > 0 && (
          <ul className="indirizzo-suggerimenti">
            {suggerimenti.map((s) => (
              <li key={s.etichetta}>
                <button type="button" onClick={() => scegli(s)}>
                  {s.etichetta}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a
        className={'btn-mappa' + (posizione ? ' btn-mappa-ok' : '')}
        href={urlMappa}
        target="_blank"
        rel="noreferrer"
        title={
          posizione
            ? `Posizione trovata: ${posizione.lat.toFixed(5)}, ${posizione.lon.toFixed(5)}`
            : 'Cerca questo indirizzo sulla mappa'
        }
      >
        Mappa
      </a>
    </div>
  )
}
