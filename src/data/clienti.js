import { supabase } from '../supabaseClient'

export async function caricaClienti() {
  const { data } = await supabase.from('clienti').select('*').order('nome')
  return data || []
}

export async function aggiungiCliente(cliente) {
  const { data } = await supabase
    .from('clienti')
    .insert({
      nome: cliente.nome.trim(),
      indirizzo: cliente.indirizzo || '',
      referente: cliente.referente || '',
      telefono: cliente.telefono || '',
    })
    .select()
    .single()
  return data
}

export async function eliminaCliente(id) {
  await supabase.from('clienti').delete().eq('id', id)
}
