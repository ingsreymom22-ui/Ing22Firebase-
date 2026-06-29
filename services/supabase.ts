import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, writeBatch, limit } from 'firebase/firestore';
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
const MAX_FIRESTORE_SIZE = 400000; // ~400KB chunk size (chars) to be safe for 1MB Firestore limit

export const subscribeToData = (userId: string, onUpdate: (data: any) => void, onError?: () => void) => {
  let isInitial = true;
  
  const unsubscribe = onSnapshot(doc(db, 'dps_data', userId), async (docSnap) => {
    if (docSnap.metadata.hasPendingWrites) return;
    
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
let isCurrentlySaving = false;

export const saveData = async (userId: string, dataState: any, instant: boolean = false) => {
  if (!userId || userId === 'unknown') return;
  latestDataState = dataState;
  
  if (saveTimeout) clearTimeout(saveTimeout);
  
  const performSave = async () => {
    if (isCurrentlySaving) {
      // If a save is already in progress, reschedule this one
      saveTimeout = setTimeout(performSave, 500);
      return;
    }

    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      console.log("Device offline. Queuing data for sync.");
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
      return;
    }

    isCurrentlySaving = true;
    try {
      const dataStr = JSON.stringify(latestDataState);
      const size = dataStr.length;
      
      let payload = {};
      if (size > MAX_FIRESTORE_SIZE) {
        // Store large payload in chunks in Firestore
        const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
        const batch = writeBatch(db);
        
        for (let i = 0; i < numChunks; i++) {
           const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
           batch.set(doc(db, `dps_data/${userId}/chunks`, i.toString()), { data: chunkStr });
        }

        payload = {
           folderId: userId,
           updatedAt: latestDataState.updatedAt || new Date().getTime(),
           version: latestDataState.version || 1,
           numChunks: numChunks,
           isChunked: true
        };
        
        await Promise.race([
            batch.commit(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Batch Timeout")), 10000))
        ]);
      } else {
        payload = {
           folderId: userId,
           updatedAt: latestDataState.updatedAt || new Date().getTime(),
           version: latestDataState.version || 1,
           dataStr: dataStr,
           isChunked: false
        };
      }
      
      await Promise.race([
          setDoc(doc(db, 'dps_data', userId), payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Save Timeout")), 8000))
      ]);
      
      lastSyncStatus = true;
    } catch (error) {
      console.error("Firebase exception during save:", error);
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
    } finally {
      isCurrentlySaving = false;
    }
  };

  if (instant) {
    await performSave();
  } else {
    saveTimeout = setTimeout(performSave, 1000);
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

export const saveTopic = async (userId: string, topic: any) => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'dps_topics', topic.id), {
      ...topic,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dps_topics/${topic.id}`);
  }
};

export const deleteStudent = async (userId: string, studentId: string) => {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'dps_students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dps_students/${studentId}`);
  }
};

export const saveStudent = async (userId: string, student: any) => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'dps_students', student.id), {
      ...student,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dps_students/${student.id}`);
  }
};

export const deleteTopic = async (userId: string, topicId: string) => {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'dps_topics', topicId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dps_topics/${topicId}`);
  }
};

export const saveAttendance = async (userId: string, attendance: any) => {
  if (!auth.currentUser) return;
  try {
    const id = `${attendance.studentId}_${attendance.date}`;
    await setDoc(doc(db, 'dps_attendance', id), {
      ...attendance,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_attendance');
  }
};

export const saveDailyNote = async (userId: string, date: string, content: any) => {
  if (!auth.currentUser) return;
  try {
    const id = `${userId}_${date}`;
    await setDoc(doc(db, 'dps_daily_notes', id), {
      content,
      date,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_daily_notes');
  }
};

export const saveJournalEntry = async (userId: string, date: string, entry: any) => {
  if (!auth.currentUser) return;
  try {
    const id = `${userId}_${date}`;
    await setDoc(doc(db, 'dps_journals', id), {
      ...entry,
      date,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_journals');
  }
};

export const saveExpense = async (userId: string, expense: any) => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'dps_expenses', expense.id), {
      ...expense,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_expenses');
  }
};

export const saveTopicsBulk = async (userId: string, topicsToSave: { topic: any, category: string }[], topicIdsToDelete: { id: string, category: string }[]) => {
  if (!auth.currentUser) return;
  try {
    const batch = writeBatch(db);
    
    // In this app, topics are stored in a dedicated collection 'dps_topics'
    // but also synchronized as part of the full state. 
    // We update the individual docs for real-time collaboration/sharing if needed.
    
    topicsToSave.forEach(({ topic, category }) => {
      const d = doc(db, 'dps_topics', topic.id);
      batch.set(d, { 
        ...topic, 
        category,
        owner_id: auth.currentUser!.uid, 
        updated_at: new Date().toISOString() 
      }, { merge: true });
    });

    topicIdsToDelete.forEach(({ id }) => {
      const d = doc(db, 'dps_topics', id);
      batch.delete(d);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_topics_bulk');
  }
};

export const saveHabitCompletionBulk = async (userId: string, date: string, completions: any) => {
  if (!auth.currentUser) return;
  try {
    const id = `${userId}_habit_completions_${date}`;
    await setDoc(doc(db, 'dps_habit_completions', id), {
      completions,
      date,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_habit_completions');
  }
};

export const saveHabitList = async (userId: string, habits: any[]) => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'dps_habit_list', auth.currentUser.uid), {
      habits,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_habit_list');
  }
};

export const deleteHabit = async (userId: string, habitId: string) => {
  // Usually handled by saveHabitList since it's a full list update
};

export const saveHabitCompletion = async (userId: string, habitId: string, date: string, completed: boolean) => {
  // Usually handled by saveHabitCompletionBulk
};

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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createSharedNote = async (userId: string, ownerName: string, type: string, title: string, payload: any) => {
  if (!auth.currentUser) {
    throw new Error("AUTHENTICATION_REQUIRED: You must be signed in to create cloud links.");
  }
  
  if (userId === 'unknown' || !userId) {
    userId = auth.currentUser.uid;
  }

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

  try {
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
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, `dps_shares/${id}`);
  }
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


