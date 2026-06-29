import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage as localIndexedDB } from './storage';
import config from '../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(config) : getApp();
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);
const fStorage = getStorage(app);

// Global connection state
let lastSyncStatus = false;
let isSyncingQueue = false;

export const checkSupabaseConnection = async () => {
    return typeof window !== 'undefined' && window.navigator.onLine;
};

// Mock Supabase Auth object to keep App.tsx working seamlessly
export const supabase = {
  auth: {
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const session = user ? { 
            user: { 
                id: user.uid, 
                email: user.email, 
                user_metadata: { full_name: user.displayName || user.email?.split('@')[0] || 'User' } 
            } 
        } : null;
        callback('SIGNED_IN', session);
      });
      return { data: { subscription: { unsubscribe } } };
    },
    getSession: async () => {
      await auth.authStateReady();
      const user = auth.currentUser;
      const session = user ? { 
          user: { 
              id: user.uid, 
              email: user.email, 
              user_metadata: { full_name: user.displayName || user.email?.split('@')[0] || 'User' } 
          } 
      } : null;
      return { data: { session } };
    },
    signUp: async ({ email, password, options }: any) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (options?.data?.full_name) {
          await updateProfile(cred.user, { displayName: options.data.full_name });
        }
        return { data: { user: cred.user }, error: null };
      } catch(e: any) {
        return { data: null, error: e };
      }
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { data: { session: { user: cred.user } }, error: null };
      } catch(e: any) {
        return { data: null, error: e };
      }
    },
    signInWithOAuth: async ({ provider }: { provider: string }) => {
        let authProvider;
        if (provider === 'google') {
            const { GoogleAuthProvider } = await import('firebase/auth');
            authProvider = new GoogleAuthProvider();
        } else if (provider === 'facebook') {
            const { FacebookAuthProvider } = await import('firebase/auth');
            authProvider = new FacebookAuthProvider();
        } else {
            return { data: null, error: new Error("Unsupported provider") };
        }
        try {
            const { signInWithPopup } = await import('firebase/auth');
            const cred = await signInWithPopup(auth, authProvider);
            return { data: { session: { user: cred.user } }, error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    },
    signInWithPhoneNumber: async (phone: string, appVerifier: any) => {
        try {
            const { signInWithPhoneNumber } = await import('firebase/auth');
            const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
            return { data: confirmationResult, error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    },
    signOut: async () => {
      await firebaseSignOut(auth);
    }
  },
  storage: {
      from: () => ({
          upload: () => {},
          remove: () => {},
          getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
  }
};

export const getSupabaseProjectId = () => config.projectId;
export const getSupabaseAuthProvidersUrl = () => `https://console.firebase.google.com/project/${config.projectId}/authentication/providers`;
export const isSupabaseConfigured = () => true;

export const logOut = async () => {
  await firebaseSignOut(auth);
};

// Architecture constants
const MAX_FIRESTORE_SIZE = 500000; // ~500KB chunk size to be safe for 1MB Firestore limit

export const subscribeToData = (userId: string, onUpdate: (data: any) => void, onError?: () => void) => {
  let isInitial = true;
  
  const unsubscribe = onSnapshot(doc(db, 'dps_data', userId), async (docSnap) => {
    if (docSnap.exists()) {
      const payload = docSnap.data();
      if (payload.isChunked && payload.numChunks > 0) {
         try {
           let fullString = '';
           for (let i = 0; i < payload.numChunks; i++) {
             const chunkSnap = await getDoc(doc(db, `dps_data/${userId}/chunks`, i.toString()));
             if (chunkSnap.exists()) {
               fullString += chunkSnap.data().data;
             }
           }
           const data = JSON.parse(fullString);
           onUpdate(data);
         } catch(e) {
           console.error("Error fetching chunked data from Firestore", e);
           if (onError) onError();
         }
      } else if (payload.dataStr) {
         onUpdate(JSON.parse(payload.dataStr));
      } else if (payload.data) {
         onUpdate(payload.data);
      }
    } else if (isInitial && onError) {
      onError(); // not found on first load
    }
    isInitial = false;
  }, (err) => {
    console.error("Snapshot error:", err);
    if (onError) onError();
  });

  return () => {
    unsubscribe();
  };
};

export const fetchData = async (userId: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'dps_data', userId));
    if (docSnap.exists()) {
      const payload = docSnap.data();
      lastSyncStatus = true;
      if (payload.isChunked && payload.numChunks > 0) {
         let fullString = '';
         for (let i = 0; i < payload.numChunks; i++) {
           const chunkSnap = await getDoc(doc(db, `dps_data/${userId}/chunks`, i.toString()));
           if (chunkSnap.exists()) {
             fullString += chunkSnap.data().data;
           }
         }
         return JSON.parse(fullString);
      }
      if (payload.dataStr) {
         return JSON.parse(payload.dataStr);
      }
      return payload.data;
    }
    return null;
  } catch (error) { 
      console.error("Fetch data error:", error);
      return null; 
  }
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let latestDataState: any = null;

export const saveData = async (userId: string, dataState: any, instant: boolean = false) => {
  latestDataState = dataState;
  
  if (saveTimeout) clearTimeout(saveTimeout);
  
  const performSave = async () => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      console.log("Device offline. Queuing data for sync.");
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
      return;
    }

    try {
      const dataStr = JSON.stringify(latestDataState);
      const size = dataStr.length;
      
      let payload = {};
      if (size > MAX_FIRESTORE_SIZE) {
        // Store large payload in chunks in Firestore
        console.log(`Payload size (${size} chars) exceeds chunk threshold. Chunking in Firestore.`);
        const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
        
        for (let i = 0; i < numChunks; i++) {
           const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
           await setDoc(doc(db, `dps_data/${userId}/chunks`, i.toString()), { data: chunkStr });
        }

        payload = {
           folderId: userId,
           updatedAt: new Date().getTime(),
           version: latestDataState.version || 1,
           numChunks: numChunks,
           isChunked: true
        };
      } else {
        // Store normally in Firestore but AS A STRING to preserve key order
        payload = {
           folderId: userId,
           updatedAt: new Date().getTime(),
           version: latestDataState.version || 1,
           dataStr: dataStr,
           isChunked: false
        };
      }
      
      // Add a timeout so it doesn't hang the UI forever if network drops silently
      await Promise.race([
          setDoc(doc(db, 'dps_data', userId), payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
      ]);
      
      lastSyncStatus = true;
      console.log("Firebase sync successful at", new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Firebase exception during save:", error);
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
    }
  };

  if (instant) {
    await performSave();
  } else {
    // Implement 4-second debounce as requested
    saveTimeout = setTimeout(performSave, 4000);
  }
};

// Process the sync queue
export const processSyncQueue = async () => {
  if (isSyncingQueue || (typeof window !== 'undefined' && !window.navigator.onLine)) return;
  
  const queue = await localIndexedDB.getSyncQueue();
  if (queue.length === 0) return;
  
  isSyncingQueue = true;
  console.log(`Processing ${queue.length} queued items...`);
  
  const idsToRemove: number[] = [];
  
  for (const item of queue) {
    try {
      const dataStr = JSON.stringify(item.data);
      const size = dataStr.length;
      
      let payload: any = {};
      if (size > MAX_FIRESTORE_SIZE) {
        const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
        for (let i = 0; i < numChunks; i++) {
           const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
           await setDoc(doc(db, `dps_data/${item.userId}/chunks`, i.toString()), { data: chunkStr });
        }
        payload = {
           folderId: item.userId,
           updatedAt: item.timestamp,
           version: item.data.version || 1,
           numChunks: numChunks,
           isChunked: true
        };
      } else {
        payload = {
           folderId: item.userId,
           updatedAt: item.timestamp,
           version: item.data.version || 1,
           dataStr: dataStr,
           isChunked: false
        };
      }
      
      await setDoc(doc(db, 'dps_data', item.userId), payload);
      idsToRemove.push(item.id);
    } catch (e) {
      console.error("Error processing sync queue item:", e);
      break;
    }
  }
  
  if (idsToRemove.length > 0) {
    await localIndexedDB.clearSyncQueue(idsToRemove);
    console.log(`Successfully synced ${idsToRemove.length} items.`);
    lastSyncStatus = true;
  }
  
  isSyncingQueue = false;
};

// Start background sync interval
if (typeof window !== 'undefined') {
  setInterval(processSyncQueue, 30000); // Every 30 seconds
  window.addEventListener('online', processSyncQueue);
}

export const uploadFile = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `attachments/${userId}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const fileRef = ref(fStorage, fileName);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (err) { 
      console.error(err);
      return null; 
  }
};

export const deleteFile = async (path: string) => {
  try {
      const fileRef = ref(fStorage, path);
      await deleteObject(fileRef);
  } catch (err) {
      console.warn("Could not delete file:", err);
  }
};

export const saveTopic = async (...args: any[]) => {};
export const deleteStudent = async (...args: any[]) => {};
export const saveStudent = async (...args: any[]) => {};
export const deleteTopic = async (...args: any[]) => {};
export const saveTopicsBulk = async (...args: any[]) => {};
export const saveAttendance = async (...args: any[]) => {};
export const saveDailyNote = async (...args: any[]) => {};
export const saveHabitCompletionBulk = async (...args: any[]) => {};
export const saveHabitList = async (...args: any[]) => {};
export const deleteHabit = async (...args: any[]) => {};
export const saveHabitCompletion = async (...args: any[]) => {};
export const saveJournalEntry = async (...args: any[]) => {};
export const saveExpense = async (...args: any[]) => {};

export const getSharedNote = async (shareId: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'dps_shares', shareId));
    if (!docSnap.exists()) return null;
    
    const payload = docSnap.data();
    if (payload.isChunked && payload.numChunks > 0) {
      let fullString = '';
      for (let i = 0; i < payload.numChunks; i++) {
        const chunkSnap = await getDoc(doc(db, `dps_shares/${shareId}/chunks`, i.toString()));
        if (chunkSnap.exists()) {
          fullString += chunkSnap.data().data;
        }
      }
      return { ...payload, payload: JSON.parse(fullString) };
    }
    return payload;
  } catch (error) { 
      console.error("Error fetching shared note:", error);
      return null; 
  }
};

export const createSharedNote = async (userId: string, ownerName: string, type: string, title: string, payload: any) => {
  const id = Math.random().toString(36).substring(2, 12);
  const payloadStr = JSON.stringify(payload);
  const size = payloadStr.length;
  
  let shareDoc: any = {
    id, 
    owner_id: userId, 
    owner_name: ownerName, 
    type, 
    title, 
    created_at: new Date().toISOString()
  };

  if (size > MAX_FIRESTORE_SIZE) {
    const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
    for (let i = 0; i < numChunks; i++) {
       const chunkStr = payloadStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
       await setDoc(doc(db, `dps_shares/${id}/chunks`, i.toString()), { data: chunkStr });
    }
    shareDoc.isChunked = true;
    shareDoc.numChunks = numChunks;
  } else {
    shareDoc.payload = payload;
    shareDoc.isChunked = false;
  }

  await setDoc(doc(db, 'dps_shares', id), shareDoc);
  return id;
};

export const getCloudBackups = async (userId: string) => {
  try {
    const q = query(collection(db, 'dps_backups'), where('owner_id', '==', userId), orderBy('timestamp', 'desc'));
    const snaps = await getDocs(q);
    return snaps.docs.map(d => d.data());
  } catch (err) {
    return [];
  }
};

export const createCloudBackup = async (userId: string, data: any) => {
  try {
    const dataStr = JSON.stringify(data);
    const size = dataStr.length;
    const backupId = uuidv4(); // We need a stable ID for chunks sub-collection
    
    let backupDoc: any = {
      id: backupId,
      owner_id: userId,
      type: 'Manual',
      timestamp: new Date().toISOString()
    };

    if (size > MAX_FIRESTORE_SIZE) {
       const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
       for (let i = 0; i < numChunks; i++) {
          const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
          await setDoc(doc(db, `dps_backups/${backupId}/chunks`, i.toString()), { data: chunkStr });
       }
       backupDoc.isChunked = true;
       backupDoc.numChunks = numChunks;
    } else {
       backupDoc.data = data;
       backupDoc.isChunked = false;
    }
    
    await setDoc(doc(db, 'dps_backups', backupId), backupDoc);
  } catch (err) {
    console.error("Backup failed", err);
    throw err;
  }
};

export const fetchBackupPayload = async (backupDoc: any) => {
  try {
    if (!backupDoc.isChunked) return backupDoc.data;
    
    let fullString = '';
    for (let i = 0; i < backupDoc.numChunks; i++) {
      const chunkSnap = await getDoc(doc(db, `dps_backups/${backupDoc.id}/chunks`, i.toString()));
      if (chunkSnap.exists()) {
        fullString += chunkSnap.data().data;
      }
    }
    return JSON.parse(fullString);
  } catch (error) {
    console.error("Error fetching backup payload:", error);
    return null;
  }
};

export const getSyncStatus = () => lastSyncStatus;


