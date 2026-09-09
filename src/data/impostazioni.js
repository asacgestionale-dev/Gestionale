import { supabase } from '../supabaseClient'

// Impostazioni condivise: stanno sul server, così valgono per tutti i
// dispositivi e non solo per il browser di chi le ha scritte.

export const CHIAVE_ZONE = 'zone_timbratura'

export const ZONE_VUOTE = {
  attivo: false,
  raggio: 200,
  punti: [],
}

export async function caricaImpostazione(chiave, predefinito = {}) {
  const { data } = await supabase
    .from('impostazioni')
    .select('valore')
    .eq('chiave', chiave)
    .maybeSingle()
  return { ...predefinito, ...(data?.valore || {}) }
}

export async function salvaImpostazione(chiave, valore) {
  const { error } = await supabase
    .from('impostazioni')
    .upsert(
      { chiave, valore, aggiornata_il: new Date().toISOString() },
      { onConflict: 'chiave' },
    )
  if (error) return { errore: error.message }
  return { ok: true }
}

export const caricaZone = () => caricaImpostazione(CHIAVE_ZONE, ZONE_VUOTE)
export const salvaZone = (zone) => salvaImpostazione(CHIAVE_ZONE, zone)

// Distanza in metri fra due punti sulla superficie terrestre.
export function distanzaMetri(a, b) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}

// Verifica una timbratura contro le zone consentite.
// Senza zone attive va sempre bene; senza posizione la timbratura resta
// registrata ma non è valida, perché non si può dimostrare dove è avvenuta.
export function verificaZona(zone, posizione) {
  if (!zone?.attivo || (zone.punti || []).length === 0) {
    return { valida: true, distanza: null, zona: null }
  }
  if (!posizione) {
    return { valida: false, distanza: null, zona: null, motivo: 'posizione mancante' }
  }

  let migliore = null
  for (const punto of zone.punti) {
    const distanza = distanzaMetri(posizione, punto)
    if (!migliore || distanza < migliore.distanza) migliore = { punto, distanza }
  }

  const raggio = Number(zone.raggio) || ZONE_VUOTE.raggio
  return {
    valida: migliore.distanza <= raggio,
    distanza: migliore.distanza,
    zona: migliore.punto,
    motivo: migliore.distanza <= raggio ? null : 'fuori zona',
  }
}

export function formattaDistanza(metri) {
  if (metri == null) return '—'
  if (metri < 1000) return metri + ' m'
  return (metri / 1000).toFixed(1).replace('.', ',') + ' km'
}
