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
  return saveAssets(owner,[document]);
}
/** Membership and documents commit together, so reopening any sibling sees the same pages. */
export async function saveAssets(owner:string,documents:AssetDocument[]){
  const parsed=documents.map(document=>assetSchema.parse(document));
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    for(const document of parsed)tx.objectStore('assets').put({ key: `${owner}:${document.id}`, owner, document } satisfies StoredAsset);
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

/** Open only this collection; unrelated saved images should not delay the canvas. */
export async function loadAssetCollection(owner:string,id:string):Promise<AssetDocument[]>{
  const db=await openDatabase();
  const get=(ids:string[])=>new Promise<AssetDocument[]>((resolve,reject)=>{
    const store=db.transaction('assets').objectStore('assets'),found=new Map<string,AssetDocument>();
    let remaining=ids.length;
    if(!remaining){resolve([]);return;}
    for(const id of ids){
      const request=store.get(`${owner}:${id}`);
      request.onsuccess=()=>{
        const row=request.result as StoredAsset|undefined;
        if(row?.owner===owner){const parsed=assetSchema.safeParse(row.document);if(parsed.success)found.set(id,parsed.data);}
        if(!--remaining)resolve(ids.flatMap(id=>found.has(id)?[found.get(id)!]:[]));
      };
      request.onerror=()=>reject(new Error('Could not open your saved asset.'));
    }
  });
  const [current]=await get([id]);
  if(!current)return [];
  const siblings=[...new Set((current.series??[]).map(page=>page.id))].filter(pageId=>pageId!==id);
  return [current,...await get(siblings)];
}
