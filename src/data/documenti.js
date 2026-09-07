// Archivio documenti dei clienti (fatture, certificazioni, scansioni).
// I file stanno in IndexedDB: localStorage non può conservare i binari.

const DB_NAME = 'gestionale-documenti'
const STORE = 'files'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('clienteId', 'clienteId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function salvaDocumento(clienteId, file, categoria) {
  try {
    const db = await openDB()
    const record = {
      id: 'd' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      clienteId,
      nome: file.name,
      tipo: file.type,
      dimensione: file.size,
      categoria,
      caricatoIl: new Date().toISOString(),
      file,
    }
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(record)
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    db.close()
    return record
  } catch {
    return null
  }
}

export async function caricaDocumenti(clienteId) {
  try {
    const db = await openDB()
    const righe = await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).index('clienteId').getAll(clienteId)
      r.onsuccess = () => res(r.result || [])
      r.onerror = () => rej(r.error)
    })
    db.close()
    return righe.sort((a, b) => b.caricatoIl.localeCompare(a.caricatoIl))
  } catch {
    return []
  }
}

export async function eliminaDocumento(id) {
  try {
    const db = await openDB()
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    db.close()
  } catch {
    /* IndexedDB non disponibile: ignora */
  }
}

export const CATEGORIE = ['Fattura', 'Certificazione', 'Documento', 'Preventivo']
