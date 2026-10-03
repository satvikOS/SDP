import { createScenarioPdfBlob } from './report-export';
import type { ScenarioResult } from './scenario-schema';

const DATABASE = 'sdp-documents';
const STORE = 'reports';
const VERSION = 1;

export async function persistScenarioPdf(result: ScenarioResult) {
  try {
    const blob = await createScenarioPdfBlob(result);
    const database = await openDatabase();
    await transactionComplete(database, 'readwrite', (store) => store.put(blob, result.id));
    database.close();
    return blob;
  } catch {
    return null;
  }
}

export async function loadScenarioPdf(id: string): Promise<Blob | null> {
  try {
    const database = await openDatabase();
    const blob = await transactionComplete<Blob | undefined>(database, 'readonly', (store) => store.get(id));
    database.close();
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteScenarioPdf(id: string) {
  try {
    const database = await openDatabase();
    await transactionComplete(database, 'readwrite', (store) => store.delete(id));
    database.close();
  } catch {
    // Local result deletion still succeeds if the browser has disabled IndexedDB.
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete<T = undefined>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<IDBValidKey>,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
