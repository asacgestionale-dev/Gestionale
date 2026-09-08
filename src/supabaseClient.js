import { createClient } from '@supabase/supabase-js'

// Le credenziali stanno in .env.local (escluso da git). La chiave "anon" è pubblica
// per progettazione: la protezione dei dati sta nelle policy RLS del database.
const url = import.meta.env.VITE_SUPABASE_URL
const chiave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, chiave)

// Vero quando il progetto è configurato: permette di lavorare anche senza,
// finché la migrazione dei dati non è completata.
export const supabaseAttivo = Boolean(url && chiave)
