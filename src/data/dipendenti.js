import { supabase } from '../supabaseClient'

export const RUOLI = ['Operaio', 'Tecnico', 'Preposto', 'Capocantiere', 'Impiegato']

export async function caricaDipendenti() {
  const { data } = await supabase.from('dipendenti').select('*').order('nome')
  return data || []
}

export async function aggiungiDipendente(d) {
  const { data } = await supabase
    .from('dipendenti')
    .insert({
      nome: d.nome.trim(),
      ruolo: d.ruolo || 'Operaio',
      telefono: d.telefono || '',
      email: d.email || '',
      assunzione: d.assunzione || null,
      qualifiche: [],
      note: '',
    })
    .select()
    .single()
  return data
}

export async function aggiornaDipendente(id, patch) {
  await supabase.from('dipendenti').update(patch).eq('id', id)
}

export async function eliminaDipendente(id) {
  await supabase.from('dipendenti').delete().eq('id', id)
}

// Presenze e squadre identificano le persone per nome: qui la sola lista dei nomi.
export async function nomiDipendenti() {
  const lista = await caricaDipendenti()
  return lista.map((d) => d.nome)
}
