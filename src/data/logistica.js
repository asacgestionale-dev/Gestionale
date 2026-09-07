// Calcolo di distanza e tempo di viaggio dalla base operativa al luogo del lavoro.
// Geocodifica con Nominatim (OpenStreetMap) e percorso stradale con OSRM.
// I risultati sono messi in cache per non ripetere le chiamate a ogni render.

export const BASE = {
  indirizzo: 'Via della Vite 41, Cisterna di Latina',
  lat: 41.6233647,
  lon: 12.8131991,
}

const CACHE_KEY = 'gestionale-logistica'

function leggiCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function scriviCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // storage pieno o non disponibile: si ricalcola alla prossima apertura
  }
}

export async function geocodifica(indirizzo) {
  const query = indirizzo.trim()
  if (!query) return null

  const cache = leggiCache()
  const chiave = 'geo:' + query.toLowerCase()
  if (cache[chiave]) return cache[chiave]

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=' +
      encodeURIComponent(query)
    const risposta = await fetch(url)
    const righe = await risposta.json()
    if (!righe.length) return null
    const punto = { lat: Number(righe[0].lat), lon: Number(righe[0].lon) }
    cache[chiave] = punto
    scriviCache(cache)
    return punto
  } catch {
    return null
  }
}

// Distanza in linea d'aria: usata come stima se il servizio di routing non risponde.
function distanzaAerea(a, b) {
  const R = 6371
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export async function calcolaTragitto(destinazione, origine = BASE) {
  if (!destinazione || !origine) return null

  const cache = leggiCache()
  const chiave =
    `via:${origine.lat.toFixed(5)},${origine.lon.toFixed(5)}` +
    `>${destinazione.lat.toFixed(5)},${destinazione.lon.toFixed(5)}`
  if (cache[chiave]) return cache[chiave]

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origine.lon},${origine.lat};${destinazione.lon},${destinazione.lat}?overview=false`
    const risposta = await fetch(url)
    const dati = await risposta.json()
    const percorso = dati.routes?.[0]
    if (!percorso) throw new Error('nessun percorso')
    const esito = {
      km: percorso.distance / 1000,
      minuti: Math.round(percorso.duration / 60),
      stimato: false,
    }
    cache[chiave] = esito
    scriviCache(cache)
    return esito
  } catch {
    // fallback offline: linea d'aria maggiorata del 30% e velocità media di 60 km/h
    const km = distanzaAerea(origine, destinazione) * 1.3
    return { km, minuti: Math.round((km / 60) * 60), stimato: true }
  }
}

// Coordinate di un lavoro: GPS se presente, altrimenti geocodifica dell'indirizzo.
export async function puntoDelLavoro(lavoro) {
  return lavoro.posizione || (lavoro.indirizzo ? await geocodifica(lavoro.indirizzo) : null)
}

// Sosta tecnica fra un cantiere e il successivo (carico/scarico, spostamento mezzi).
export const MINUTI_SOSTA = 10

// Tragitto a partire da un lavoro: dalla base, o dal cantiere precedente se indicato.
export async function tragittoPerLavoro(lavoro, lavoroPrecedente = null) {
  const punto = await puntoDelLavoro(lavoro)
  if (!punto) return null

  if (!lavoroPrecedente) return calcolaTragitto(punto)

  const origine = await puntoDelLavoro(lavoroPrecedente)
  if (!origine) return calcolaTragitto(punto)

  const tratta = await calcolaTragitto(punto, origine)
  if (!tratta) return null
  // dal secondo lavoro in poi si aggiungono i minuti di sosta fra un cantiere e l'altro
  return {
    ...tratta,
    minuti: tratta.minuti + MINUTI_SOSTA,
    daLavoro: lavoroPrecedente.titolo,
  }
}

export function formattaTragitto(t) {
  if (!t) return null
  const km = t.km < 10 ? t.km.toFixed(1) : Math.round(t.km)
  return `${km} km · ${t.minuti} min${t.stimato ? ' (stima)' : ''}`
}
