import { supabase } from '../supabaseClient'

// Timbrature di entrata e uscita: le registrano gli operai dal telefono,
// l'ufficio le rilegge nella pagina Timbrature e Presenze.

export const ENTRATA = 'Entrata'
export const USCITA = 'Uscita'

function daDb(t) {
  return {
    id: t.id,
    dipendente: t.dipendente,
    giorno: t.giorno,
    tipo: t.tipo,
    ora: t.ora,
    lat: t.lat,
    lon: t.lon,
    lavoroId: t.lavoro_id,
    note: t.note || '',
    valida: t.valida !== false,
    distanza: t.distanza,
  }
}

export async function timbratureDi(dipendente, giorno) {
  const { data } = await supabase
    .from('timbrature')
    .select('*')
    .eq('dipendente', dipendente)
    .eq('giorno', giorno)
    .order('ora')
  return (data || []).map(daDb)
}

// Storico delle ultime giornate, per la scheda dell'operaio.
export async function timbratureDal(dipendente, dalGiorno) {
  const { data } = await supabase
    .from('timbrature')
    .select('*')
    .eq('dipendente', dipendente)
    .gte('giorno', dalGiorno)
    .order('ora')
  return (data || []).map(daDb)
}

// Raggruppa le timbrature per giornata, dalla più recente.
export function perGiornata(timbrature) {
  const per = {}
  for (const t of timbrature) {
    per[t.giorno] = [...(per[t.giorno] || []), t]
  }
  return Object.entries(per)
    .map(([giorno, righe]) => ({
      giorno,
      timbrature: righe,
      minuti: minutiLavorati(righe),
      fuoriZona: righe.some((t) => !t.valida),
    }))
    .sort((a, b) => b.giorno.localeCompare(a.giorno))
}

export async function timbratureDelGiorno(giorno) {
  const { data } = await supabase.from('timbrature').select('*').eq('giorno', giorno).order('ora')
  return (data || []).map(daDb)
}

export async function timbra({
  dipendente,
  giorno,
  tipo,
  posizione,
  lavoroId,
  valida = true,
  distanza = null,
}) {
  const { data, error } = await supabase
    .from('timbrature')
    .insert({
      dipendente,
      giorno,
      tipo,
      ora: new Date().toISOString(),
      lat: posizione?.lat ?? null,
      lon: posizione?.lon ?? null,
      lavoro_id: lavoroId || null,
      valida,
      distanza,
    })
    .select()
    .single()

  if (error) return { errore: error.message }
  return { timbratura: daDb(data) }
}

export async function eliminaTimbratura(id) {
  await supabase.from('timbrature').delete().eq('id', id)
}

// La prossima timbratura è l'opposto dell'ultima: si entra, poi si esce.
export function prossimoTipo(timbrature) {
  const ultima = timbrature[timbrature.length - 1]
  return ultima?.tipo === ENTRATA ? USCITA : ENTRATA
}

export function oraDi(timbratura) {
  return new Date(timbratura.ora).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Somma le coppie entrata/uscita: un'entrata ancora aperta conta fino ad adesso.
export function minutiLavorati(timbrature) {
  let totale = 0
  let inizio = null

  for (const t of timbrature) {
    if (t.tipo === ENTRATA) {
      inizio = new Date(t.ora)
    } else if (inizio) {
      totale += (new Date(t.ora) - inizio) / 60000
      inizio = null
    }
  }
  if (inizio) totale += (Date.now() - inizio) / 60000

  return Math.max(0, Math.round(totale))
}

export function formattaDurata(minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  if (h === 0) return `${m} min`
  return `${h}h ${String(m).padStart(2, '0')}`
}
