import { supabase } from '../supabaseClient'

// Accesso al gestionale tramite Supabase Auth. Le password sono gestite dal
// server: qui non transitano mai in chiaro né vengono memorizzate.

export const RUOLI_UTENTE = ['Amministratore', 'Responsabile', 'Operaio']

export async function registra({ nome, email, password, ruolo }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { nome: nome.trim(), ruolo } },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { errore: 'Esiste già un account con questa email.' }
    }
    return { errore: error.message }
  }

  // se il progetto richiede la verifica dell'indirizzo, la registrazione non apre sessione
  if (!data.session) return { inAttesa: true, confermaEmail: true }

  // il profilo viene creato dal database: il primo iscritto è amministratore approvato
  const profilo = await profiloDi(data.user?.id)
  if (profilo?.approvato) return { utente: profilo }

  // gli altri restano in attesa: la sessione aperta dalla registrazione va chiusa
  await supabase.auth.signOut()
  return { utente: profilo, inAttesa: true }
}

export async function accedi(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login')) {
      return { errore: 'Email o password non corretti.' }
    }
    return { errore: error.message }
  }

  const profilo = await profiloDi(data.user.id)
  if (!profilo?.approvato) {
    await supabase.auth.signOut()
    return {
      errore:
        "Registrazione in attesa: l'amministratore deve approvare il tuo account prima del primo accesso.",
    }
  }

  return { utente: profilo }
}

export async function esci() {
  await supabase.auth.signOut()
}

async function profiloDi(id) {
  if (!id) return null
  const { data } = await supabase.from('profili').select('*').eq('id', id).maybeSingle()
  return data
}

// Utente della sessione in corso, se il suo account è ancora approvato.
export async function utenteCorrente() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  const profilo = await profiloDi(data.session.user.id)
  return profilo?.approvato ? profilo : null
}

// ---- gestione degli account, riservata all'amministratore ----

export async function caricaUtenti() {
  const { data } = await supabase.from('profili').select('*').order('creato_il')
  return data || []
}

export async function approvaUtente(id) {
  await supabase.from('profili').update({ approvato: true }).eq('id', id)
}

export async function revocaUtente(id) {
  await supabase.from('profili').update({ approvato: false }).eq('id', id)
}

export async function cambiaRuolo(id, ruolo) {
  await supabase.from('profili').update({ ruolo }).eq('id', id)
}

// Rimuove il profilo: l'utente perde l'accesso ai dati anche se l'account
// di autenticazione resta (eliminabile solo dal pannello Supabase).
export async function eliminaUtente(id) {
  await supabase.from('profili').delete().eq('id', id)
}

// Cambio della password dell'utente collegato: la vecchia viene richiesta di
// nuovo al server come controllo, poi Supabase sostituisce quella salvata.
export async function cambiaPassword(vecchia, nuova) {
  const { data } = await supabase.auth.getSession()
  const email = data.session?.user?.email
  if (!email) return { errore: 'Sessione scaduta: rifai l\'accesso.' }

  const verifica = await supabase.auth.signInWithPassword({ email, password: vecchia })
  if (verifica.error) return { errore: 'La password attuale non è corretta.' }

  const { error } = await supabase.auth.updateUser({ password: nuova })
  if (error) return { errore: error.message }
  return { ok: true }
}
