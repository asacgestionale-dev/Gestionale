import { supabase } from '../supabaseClient'

export const TIPI_PAGAMENTO = ['Acconto', 'SAL', 'Saldo']
export const MODALITA = ['Bonifico', 'Contanti', 'Assegno', 'Altro']

// { idLavoro: [ movimenti ] }
export async function caricaPagamenti() {
  const { data } = await supabase.from('pagamenti').select('*').order('data')
  const per = {}
  for (const p of data || []) {
    per[p.lavoro_id] = per[p.lavoro_id] || []
    per[p.lavoro_id].push(p)
  }
  return per
}

export async function aggiungiPagamento(lavoroId, movimento) {
  const { data } = await supabase
    .from('pagamenti')
    .insert({
      lavoro_id: lavoroId,
      tipo: movimento.tipo,
      importo: Number(movimento.importo) || 0,
      data: movimento.data,
      modalita: movimento.modalita,
      note: movimento.note || '',
    })
    .select()
    .single()
  return data
}

export async function eliminaPagamento(id) {
  await supabase.from('pagamenti').delete().eq('id', id)
}

export function pagamentiDelLavoro(mappa, idLavoro) {
  return mappa[idLavoro] || []
}

export function totaleIncassato(mappa, idLavoro) {
  return pagamentiDelLavoro(mappa, idLavoro).reduce((s, p) => s + (Number(p.importo) || 0), 0)
}

// Stato del pagamento rispetto all'importo concordato.
export function statoPagamento(lavoro, incassato) {
  const importo = Number(lavoro.importo) || 0
  if (importo === 0) return { testo: 'Senza importo', classe: 'badge-da-fare', percentuale: 0 }

  const percentuale = Math.min(100, Math.round((incassato / importo) * 100))
  if (incassato <= 0) return { testo: 'Da incassare', classe: 'badge-malattia', percentuale: 0 }
  if (incassato >= importo) return { testo: 'Saldato', classe: 'badge-completato', percentuale: 100 }
  return { testo: 'Parziale', classe: 'badge-permesso', percentuale }
}
