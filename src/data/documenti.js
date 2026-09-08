import { supabase } from '../supabaseClient'

// Archivio documenti su Supabase Storage: i file sono raggiungibili da tutti
// i dispositivi e visibili solo agli account approvati (policy sul bucket).

const BUCKET = 'documenti'

export const CATEGORIE = ['Fattura', 'Certificazione', 'Documento', 'Preventivo']

// La categoria viaggia nel nome del file: lo Storage non ha campi propri.
function componiNome(categoria, nomeFile) {
  const pulito = nomeFile.replace(/[^\w.\-]+/g, '_')
  return `${Date.now()}__${categoria}__${pulito}`
}

function scomponiNome(percorso) {
  const file = percorso.split('/').pop()
  const parti = file.split('__')
  if (parti.length < 3) return { categoria: 'Documento', nome: file }
  return { categoria: parti[1], nome: parti.slice(2).join('__') }
}

export async function salvaDocumento(proprietarioId, file, categoria) {
  const percorso = `${proprietarioId}/${componiNome(categoria, file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(percorso, file)
  if (error) return null
  return { id: percorso, nome: file.name, categoria, dimensione: file.size }
}

export async function caricaDocumenti(proprietarioId) {
  const { data } = await supabase.storage.from(BUCKET).list(proprietarioId, {
    sortBy: { column: 'created_at', order: 'desc' },
  })

  return (data || []).map((f) => {
    const { categoria, nome } = scomponiNome(f.name)
    return {
      id: `${proprietarioId}/${f.name}`,
      nome,
      categoria,
      dimensione: f.metadata?.size || 0,
      tipo: f.metadata?.mimetype || '',
      caricatoIl: f.created_at,
    }
  })
}

export async function eliminaDocumento(id) {
  await supabase.storage.from(BUCKET).remove([id])
}

// Collegamento temporaneo per aprire il file: il bucket non è pubblico.
export async function urlDocumento(id) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(id, 300)
  return data?.signedUrl || null
}
