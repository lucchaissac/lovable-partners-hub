import { assetSchema, type AssetDocument } from './model';

type StoredAsset = { key: string; owner: string; document: AssetDocument };
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('lovable-partner-designs', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(new Error('Device storage is unavailable. Download the editable source to keep your work.')); };
  });
}
export async function saveAsset(owner: string, document: AssetDocument) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').put({ key: `${owner}:${document.id}`, owner, document: assetSchema.parse(document) } satisfies StoredAsset);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Could not save on this device. Download the editable source to keep your work.'));
  });
}
export async function listAssets(owner: string): Promise<AssetDocument[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('assets').objectStore('assets').getAll();
    request.onsuccess = () => resolve((request.result as StoredAsset[]).filter(row => row.owner === owner)
      .flatMap(row => { const result = assetSchema.safeParse(row.document); return result.success ? [result.data] : []; })
      .sort((a, b) => b.updatedAt - a.updatedAt));
    request.onerror = () => reject(new Error('Could not open your saved assets.'));
  });
}
