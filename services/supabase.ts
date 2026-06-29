import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage as localIndexedDB } from './storage';
import config from '../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(config) : getApp();
const db = getFirestore(app);
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
                user_metadata: { full_name: user.displayName || 'Firebase User' } 
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
              user_metadata: { full_name: user.displayName || 'Firebase User' } 
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
const MAX_FIRESTORE_SIZE = 1000000; // 1MB threshold for storage upload

export const subscribeToData = (userId: string, onUpdate: (data: any) => void, onError?: () => void) => {
  let isInitial = true;
  
  const unsubscribe = onSnapshot(doc(db, 'dps_data', userId), async (docSnap) => {
    if (docSnap.exists()) {
      const payload = docSnap.data();
      if (payload.isLarge && payload.storageUrl) {
         try {
           const res = await fetch(payload.storageUrl);
           const data = await res.json();
           onUpdate(data);
         } catch(e) {
           console.error("Error fetching large data from storage", e);
           if (onError) onError();
         }
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
      if (payload.isLarge && payload.storageUrl) {
         const res = await fetch(payload.storageUrl);
         return await res.json();
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
      const size = new Blob([dataStr]).size;
      
      let payload = {};
      if (size > MAX_FIRESTORE_SIZE) {
        // Store large payload in Storage
        console.log(`Payload size (${size} bytes) exceeds Firestore limit. Storing in Firebase Storage.`);
        const fileRef = ref(fStorage, `dps_data/${userId}/data.json`);
        await uploadString(fileRef, dataStr, 'raw');
        const url = await getDownloadURL(fileRef);
        payload = {
           folderId: userId,
           updatedAt: new Date().getTime(),
           version: latestDataState.version || 1,
           storageUrl: url,
           isLarge: true
        };
      } else {
        // Store normally in Firestore
        payload = {
           folderId: userId,
           updatedAt: new Date().getTime(),
           version: latestDataState.version || 1,
           data: latestDataState,
           isLarge: false
        };
      }
      
      await setDoc(doc(db, 'dps_data', userId), payload);
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
      const size = new Blob([dataStr]).size;
      
      let payload = {};
      if (size > MAX_FIRESTORE_SIZE) {
        const fileRef = ref(fStorage, `dps_data/${item.userId}/data.json`);
        await uploadString(fileRef, dataStr, 'raw');
        const url = await getDownloadURL(fileRef);
        payload = {
           folderId: item.userId,
           updatedAt: item.timestamp,
           version: item.data.version || 1,
           storageUrl: url,
           isLarge: true
        };
      } else {
        payload = {
           folderId: item.userId,
           updatedAt: item.timestamp,
           version: item.data.version || 1,
           data: item.data,
           isLarge: false
        };
      }
      
      await setDoc(doc(db, 'dps_data', item.userId), payload);
      idsToRemove.push(item.id);
    } catch (e) {
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
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) { 
      return null; 
  }
};

export const createSharedNote = async (userId: string, ownerName: string, type: string, title: string, payload: any) => {
  const id = Math.random().toString(36).substring(2, 12);
  await setDoc(doc(db, 'dps_shares', id), {
    id, owner_id: userId, owner_name: ownerName, type, title, payload, created_at: new Date().toISOString()
  });
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
    const size = new Blob([dataStr]).size;
    let payloadData = data;
    
    if (size > MAX_FIRESTORE_SIZE) {
       const fileRef = ref(fStorage, `dps_backups/${userId}/${Date.now()}.json`);
       await uploadString(fileRef, dataStr, 'raw');
       payloadData = { __isStorage: true, url: await getDownloadURL(fileRef) };
    }
    
    await addDoc(collection(db, 'dps_backups'), {
      owner_id: userId,
      data: payloadData,
      type: 'Manual',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Backup failed", err);
    throw err;
  }
};

export const getSyncStatus = () => lastSyncStatus;


