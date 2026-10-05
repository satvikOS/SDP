import { createScenarioPdfBlob } from './report-export';
import type { ScenarioResult } from './scenario-schema';

const DATABASE = 'sdp-documents';
const STORE = 'reports';
const VERSION = 2;
const DOCUMENT_VERSION = 5;

type StoredScenarioDocument = {
  version: number;
  blob: Blob;
};

export async function persistScenarioPdf(result: ScenarioResult) {
  try {
    const blob = await createScenarioPdfBlob(result);
    const database = await openDatabase();
    const storedDocument: StoredScenarioDocument = { version: DOCUMENT_VERSION, blob };
    await transactionComplete(database, 'readwrite', (store) => store.put(storedDocument, result.id));
    database.close();
    return blob;
  } catch {
    return null;
  }
}

export async function loadScenarioPdf(id: string): Promise<Blob | null> {
  try {
    const database = await openDatabase();
    const saved = await transactionComplete<StoredScenarioDocument | Blob | undefined>(
      database,
      'readonly',
      (store) => store.get(id),
    );
    database.close();
    if (saved instanceof Blob) return null;
    return saved?.version === DOCUMENT_VERSION && saved.blob instanceof Blob ? saved.blob : null;
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

export type LibraryRecord = { id: string; result?: ScenarioResult; name?: string; createdAt?: string; deletedAt?: string };

export async function storeLibraryRecord(record: LibraryRecord) {
  const database = await openDatabase();
  await transactionComplete(database, 'readwrite', (store) => store.put(record, record.id), 'records');
  database.close();
}

export async function loadLibraryRecords() {
  const database = await openDatabase();
  const records = await transactionComplete<LibraryRecord[]>(database, 'readonly', (store) => store.getAll(), 'records');
  database.close();
  return records;
}

export async function removeLibraryRecord(id: string) {
  const database = await openDatabase();
  await transactionComplete(database, 'readwrite', (store) => store.delete(id), 'records');
  database.close();
}

export async function storeImportedPdf(file: File) {
  if (file.size > 50 * 1024 * 1024) throw new Error('Choose a PDF smaller than 50 MB.');
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') throw new Error('This file is not a valid PDF.');
  const record: LibraryRecord = { id: crypto.randomUUID(), name: file.name, createdAt: new Date().toISOString() };
  const database = await openDatabase();
  await transactionComplete(database, 'readwrite', (store) => store.put({ version: DOCUMENT_VERSION, blob: file }, record.id));
  database.close();
  await storeLibraryRecord(record);
  return record;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      if (!request.result.objectStoreNames.contains('records')) request.result.createObjectStore('records');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete<T = undefined>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<IDBValidKey>,
  name = STORE,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(name, mode);
    const request = operation(transaction.objectStore(name));
    transaction.oncomplete = () => resolve(request.result as T);
    transaction.onabort = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
