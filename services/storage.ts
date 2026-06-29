// Safe unlimited storage service using IndexedDB with fallback to localStorage
const DB_NAME = 'dps_large_storage';
const STORE_NAME = 'keyval';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bumped version to 2
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("IndexedDB getItem error, falling back to localStorage", e);
      return localStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    // 1. Save to IndexedDB as primary unlimited storage
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB setItem failed", e);
    }

    // 2. Mirror to localStorage for fast synchronous initial loading
    // Catch quota exceeded to prevent crashes under large state/backup sizes
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage quota exceeded, but data is successfully preserved in IndexedDB.", e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("IndexedDB removeItem failed", e);
    }

    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },

  async queueSync(userId: string, data: any): Promise<void> {
    try {
      const db = await getDB();
      const transaction = db.transaction('pending_sync', 'readwrite');
      const store = transaction.objectStore('pending_sync');
      await new Promise<void>((resolve, reject) => {
        const req = store.add({ userId, data, timestamp: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("Queue sync failed", e);
    }
  },

  async getSyncQueue(): Promise<any[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('pending_sync', 'readonly');
        const store = transaction.objectStore('pending_sync');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  },

  async clearSyncQueue(ids: number[]): Promise<void> {
    try {
      const db = await getDB();
      const transaction = db.transaction('pending_sync', 'readwrite');
      const store = transaction.objectStore('pending_sync');
      for (const id of ids) {
        store.delete(id);
      }
    } catch (e) {
      console.error("Clear sync queue failed", e);
    }
  }
};
