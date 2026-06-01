// ============================================================
// 报告 PDF 附件 · 本地存储 (IndexedDB)
// ------------------------------------------------------------
// 浏览器无法写 public/reports/, 故本地用 IndexedDB 存 PDF blob(可存大文件)。
// 报告对象的 fileUrl 用 `idb://<reportId>` 作标记; 下载时取 blob 生成对象 URL。
// 上云时: savePdf 改为上传对象存储并把 fileUrl 写成云端 URL, 其余链路不变。
// ============================================================

const DB_NAME = 'yiyu_report_pdf';
const STORE = 'pdfs';
const VERSION = 1;

export const IDB_PDF_PREFIX = 'idb://';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('当前环境不支持 IndexedDB')); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB 打开失败'));
  });
}

export async function savePdf(reportId: string, file: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, reportId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('写入 PDF 失败'));
  });
  db.close();
}

export async function getPdf(reportId: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(reportId);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error || new Error('读取 PDF 失败'));
  });
  db.close();
  return blob;
}

export async function deletePdf(reportId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(reportId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('删除 PDF 失败'));
  });
  db.close();
}

/** fileUrl 是否指向本地 IndexedDB 里的 PDF */
export function isIdbPdf(fileUrl?: string): boolean {
  return !!fileUrl && fileUrl.startsWith(IDB_PDF_PREFIX);
}

export function idbPdfId(fileUrl: string): string {
  return fileUrl.slice(IDB_PDF_PREFIX.length);
}
