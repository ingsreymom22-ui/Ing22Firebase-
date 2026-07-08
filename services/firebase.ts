import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, writeBatch, limit, deleteField } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage as localIndexedDB } from './storage';
import config from '../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(config) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const fStorage = getStorage(app);

// Global connection state
let lastSyncStatus = false;
let isSyncing = false;
let cachedAccessToken: string | null = null;

export const getAccessToken = () => cachedAccessToken;

export const checkFirebaseConnection = async () => {
    return typeof window !== 'undefined' && window.navigator.onLine;
};

// Mock Auth object to keep App.tsx working seamlessly
export const authService = {
  auth: {
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) cachedAccessToken = null;
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
    signInWithOAuth: async ({ provider, scopes }: { provider: string, scopes?: string[] }) => {
        let authProvider: any;
        const { GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } = await import('firebase/auth');
        
        if (provider === 'google') {
            authProvider = new GoogleAuthProvider();
            if (scopes) {
              scopes.forEach(s => authProvider.addScope(s));
            }
        } else if (provider === 'facebook') {
            authProvider = new FacebookAuthProvider();
        } else {
            return { data: null, error: new Error("Unsupported provider") };
        }
        try {
            const result = await signInWithPopup(auth, authProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              cachedAccessToken = credential.accessToken;
            }
            return { data: { session: { user: result.user }, credential }, error: null };
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
    },
    resetPassword: async (email: string) => {
      try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
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

export const getFirebaseProjectId = () => config.projectId;
export const getFirebaseAuthProvidersUrl = () => `https://console.firebase.google.com/project/${config.projectId}/authentication/providers`;
export const isFirebaseConfigured = () => true;

export const logOut = async () => {
  await firebaseSignOut(auth);
};

// Architecture constants
const MAX_FIRESTORE_SIZE = 400000; // ~400KB chunk size (chars) to be safe for 1MB Firestore limit

// Standalone helper for chunk fetching
export const fetchAutoChunked = async (collectionPath: string, docId: string, dataKey: string = 'data', existingDocSnap?: any) => {
  try {
    const docRef = doc(db, collectionPath, docId);
    const docSnap = existingDocSnap || (await getDoc(docRef));
    if (!docSnap.exists()) return null;
    
    const payload = docSnap.data();
    if (!payload) return null;
    
    let result: any = null;

    if (payload.isChunked && payload.numChunks > 0) {
      const chunkPromises = [];
      for (let i = 0; i < payload.numChunks; i++) {
        chunkPromises.push(getDoc(doc(db, `${collectionPath}/${docId}/chunks`, i.toString())));
      }
      const chunkSnaps = await Promise.all(chunkPromises);
      let fullString = '';
      for (let i = 0; i < chunkSnaps.length; i++) {
        const snap = chunkSnaps[i];
        if (snap.exists()) {
          const chunkData = snap.data();
          if (chunkData && chunkData.data) fullString += chunkData.data;
        } else {
          // Fallback to legacy chunk path if new one doesn't exist
          const legacySnap = await getDoc(doc(db, collectionPath, `${docId}_chunk_${i}`));
          if (legacySnap.exists()) {
            const legacyData = legacySnap.data();
            if (legacyData && legacyData.data) fullString += legacyData.data;
          }
        }
      }
      
      try {
        result = fullString ? JSON.parse(fullString) : null;
      } catch (parseError) {
        console.error(`JSON parse error in fetchAutoChunked for ${collectionPath}/${docId}`, parseError);
        // If it was supposed to be chunked but parsing failed, we can't trust the data
        return null;
      }
    } else {
      // Check primary key first
      const primaryValue = payload[dataKey];
      if (primaryValue !== undefined && primaryValue !== null) {
         if (typeof primaryValue === 'string' && (primaryValue.startsWith('{') || primaryValue.startsWith('['))) {
           try {
             result = JSON.parse(primaryValue);
           } catch (e) {
             result = primaryValue;
           }
         } else {
           result = primaryValue;
         }
      } else {
        // Fallbacks for legacy/varied structures
        const fallback = payload.data || payload.payload || payload.dataStr;
        if (fallback !== undefined && fallback !== null) {
           if (typeof fallback === 'string' && (fallback.startsWith('{') || fallback.startsWith('['))) {
             try {
               result = JSON.parse(fallback);
             } catch (e) {
               result = fallback;
             }
           } else {
             result = fallback;
           }
        } else {
          result = payload;
        }
      }
    }
    
    // Ensure metadata from the parent doc is preserved in the returned object
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return { 
        ...result, 
        updatedAt: payload.updatedAt || result.updatedAt,
        folderId: payload.folderId || result.folderId,
        version: payload.version || result.version
      };
    }
    
    return result;
  } catch (e) {
    console.error(`Error fetching chunks for ${collectionPath}/${docId}`, e);
    return null;
  }
};

/**
 * Generic utility to save data to Firestore with automatic chunking for large payloads (>1MB)
 */
export const saveAutoChunked = async (
  collectionPath: string, 
  docId: string, 
  data: any, 
  extraMeta: any = {}, 
  dataKey: string = 'data',
  merge: boolean = true
) => {
  try {
    const dataStr = JSON.stringify(data);
    const size = dataStr.length;
    const docRef = doc(db, collectionPath, docId);
    
    if (size > MAX_FIRESTORE_SIZE) {
      const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
      const batch = writeBatch(db);
      
      for (let i = 0; i < numChunks; i++) {
        const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
        batch.set(doc(db, `${collectionPath}/${docId}/chunks`, i.toString()), { data: chunkStr });
      }
      
      const metaPayload = {
        ...extraMeta,
        isChunked: true,
        numChunks,
        [dataKey]: deleteField(),
        data: deleteField(),
        payload: deleteField(),
        dataStr: deleteField(),
        content: deleteField(),
        notes: deleteField()
      };

      batch.set(docRef, metaPayload, { merge });
      await batch.commit();
      return true;
    } else {
      const payload = {
        ...extraMeta,
        [dataKey]: data,
        isChunked: false,
        numChunks: 0
      };
      await setDoc(docRef, payload, { merge });
      return true;
    }
  } catch (error) {
    console.error(`Error in saveAutoChunked for ${collectionPath}/${docId}:`, error);
    throw error;
  }
};

// Helper to build tree from flat topics
const buildTopicTree = (flatTopics: any[]) => {
  const map = new Map<string, any>();
  const roots: any[] = [];
  const orphans: any[] = [];

  // Initialize map with clones and ensure children starts fresh
  flatTopics.forEach(t => {
    const { children, ...rest } = t;
    map.set(t.id, { ...rest, children: [] });
  });

  // Build tree
  flatTopics.forEach(t => {
    const node = map.get(t.id);
    if (t.parentId && map.has(t.parentId)) {
      const parent = map.get(t.parentId);
      if (!parent.children.some((c: any) => c.id === t.id)) {
        parent.children.push(node);
      }
    } else if (!t.parentId) {
      roots.push(node);
    } else {
      // ParentId exists but parent not in map - it's an orphan
      orphans.push(node);
    }
  });

  // To prevent data loss, we append orphans to the roots if they are not already nested
  // This ensures they are at least visible somewhere if the parent is missing.
  orphans.forEach(orphan => {
    // Check if this orphan is already a descendant of some other node that IS in the tree
    // (This is a simplified check - if it's an orphan of an orphan, it'll still show up)
    roots.push(orphan);
  });

  return roots;
};

export const subscribeToData = (userId: string, onUpdate: (data: any) => void, onError?: () => void) => {
  let mainDoc: any = null;
  const studentsMap = new Map<string, any>();
  const topicsMap = new Map<string, any>();
  const dailyNotesMap = new Map<string, string>();
  const journalMap = new Map<string, any>();
  const expensesMap = new Map<string, any>();
  
  let isMainLoaded = false;
  let isStudentsLoaded = false;
  let isTopicsLoaded = false;
  let isDailyNotesLoaded = false;
  let isJournalLoaded = false;
  let isExpensesLoaded = false;

  const mergeAndEmit = () => {
    // Only emit when ALL initial snapshots have successfully loaded
    if (!isMainLoaded || !isStudentsLoaded || !isTopicsLoaded || !isDailyNotesLoaded || !isJournalLoaded || !isExpensesLoaded) return;
    if (!mainDoc) return;
    
    const combined = { ...mainDoc };
    
    // Merge Students: Collection data takes precedence
    combined.students = Array.from(studentsMap.values()).sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '') || (a.id || '').localeCompare(b.id || '');
    });
    
    // Reconstruct the tree from flat topicsMap
    const allFlatTopics = Array.from(topicsMap.values());
    const reconstructedTree = buildTopicTree(allFlatTopics);
    
    // Merge Topics: Collection data takes precedence
    combined.dpssTopics = reconstructedTree.filter(t => t.category === 'dpss');
    combined.selfLearningTopics = reconstructedTree.filter(t => t.category === 'selfLearning');

    // Merge Daily Notes
    combined.dailyNotes = { ...combined.dailyNotes };
    dailyNotesMap.forEach((content, date) => {
      combined.dailyNotes[date] = content;
    });

    // Merge Journal
    combined.journalEntries = { ...combined.journalEntries };
    journalMap.forEach((entry, date) => {
      combined.journalEntries[date] = entry;
    });

    // Merge Expenses
    combined.expenses = Array.from(expensesMap.values());
    
    onUpdate(combined);
  };

  // 1. Listen to the monolith document
  const unsubMain = onSnapshot(doc(db, 'dps_data', userId), async (docSnap) => {
    if (docSnap.exists()) {
      const data = await fetchAutoChunked('dps_data', userId, 'dataStr', docSnap);
      
      if (data) {
        mainDoc = data;
        isMainLoaded = true;
        mergeAndEmit();
      } else {
        mainDoc = { students: [], dpssTopics: [], selfLearningTopics: [] };
        isMainLoaded = true;
        mergeAndEmit();
      }
    } else {
      mainDoc = { students: [], dpssTopics: [], selfLearningTopics: [] };
      isMainLoaded = true;
      mergeAndEmit();
    }
  }, (err) => {
    console.error("Main doc subscribe error:", err);
    isMainLoaded = true;
    if (!mainDoc) mainDoc = { students: [], dpssTopics: [], selfLearningTopics: [] };
    mergeAndEmit();
    if (onError) onError();
  });

  // 2. Listen to granular students collection
  const unsubStudents = onSnapshot(query(collection(db, 'dps_students'), where('owner_id', '==', userId)), (snap) => {
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'removed') {
        studentsMap.delete(change.doc.id);
      } else {
        studentsMap.set(change.doc.id, { ...data, id: change.doc.id });
      }
    });
    isStudentsLoaded = true;
    mergeAndEmit();
  }, (err) => {
    console.error("Students collection subscribe error:", err);
    isStudentsLoaded = true;
    mergeAndEmit();
  });

  // 3. Listen to granular topics collection
  const unsubTopics = onSnapshot(query(collection(db, 'dps_topics'), where('owner_id', '==', userId)), async (snap) => {
    const chunkPromises: Promise<void>[] = [];
    
    for (const change of snap.docChanges()) {
      const data = change.doc.data();
      if (change.type === 'removed') {
        topicsMap.delete(change.doc.id);
      } else {
        // Set basic data immediately to avoid parent-child race conditions while chunks load
        topicsMap.set(change.doc.id, { ...data, id: change.doc.id });

        if (data.isChunked && data.numChunks > 0) {
          const p = fetchAutoChunked('dps_topics', change.doc.id, 'data', change.doc).then(reconstructed => {
            if (reconstructed) {
              const current = topicsMap.get(change.doc.id) || data;
              topicsMap.set(change.doc.id, { ...reconstructed, ...current, id: change.doc.id });
            }
            mergeAndEmit();
          });
          chunkPromises.push(p);
        }
      }
    }
    
    isTopicsLoaded = true;
    mergeAndEmit();
  }, (err) => {
    console.error("Topics collection subscribe error:", err);
    isTopicsLoaded = true;
    mergeAndEmit();
  });

  // 4. Listen to daily notes
  const unsubDailyNotes = onSnapshot(query(collection(db, 'dps_daily_notes'), where('owner_id', '==', userId)), (snap) => {
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'removed') {
        dailyNotesMap.delete(data.date);
      } else {
        dailyNotesMap.set(data.date, data.content);
      }
    });
    isDailyNotesLoaded = true;
    mergeAndEmit();
  }, (err) => {
    isDailyNotesLoaded = true;
    mergeAndEmit();
  });

  // 5. Listen to journal entries
  const unsubJournal = onSnapshot(query(collection(db, 'dps_journal'), where('owner_id', '==', userId)), (snap) => {
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'removed') {
        journalMap.delete(data.date);
      } else {
        const { owner_id, updated_at, ...entry } = data;
        journalMap.set(data.date, entry);
      }
    });
    isJournalLoaded = true;
    mergeAndEmit();
  }, (err) => {
    isJournalLoaded = true;
    mergeAndEmit();
  });

  // 6. Listen to expenses
  const unsubExpenses = onSnapshot(query(collection(db, 'dps_expenses'), where('owner_id', '==', userId)), (snap) => {
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'removed') {
        expensesMap.delete(change.doc.id);
      } else {
        expensesMap.set(change.doc.id, { ...data, id: change.doc.id });
      }
    });
    isExpensesLoaded = true;
    mergeAndEmit();
  }, (err) => {
    isExpensesLoaded = true;
    mergeAndEmit();
  });

  return () => {
    unsubMain();
    unsubStudents();
    unsubTopics();
    unsubDailyNotes();
    unsubJournal();
    unsubExpenses();
  };
};

export const fetchData = async (userId: string) => {
  try {
    return await fetchAutoChunked('dps_data', userId, 'dataStr');
  } catch (error) { 
      console.error("Fetch data error:", error);
      return null; 
  }
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let latestDataState: any = null;


export const saveData = async (userId: string, dataState: any, instant: boolean = false) => {
  if (!userId || userId === 'unknown') return;
  if (isSyncing && !instant) return; 
  
  latestDataState = dataState;
  
  const performSave = async () => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      console.log("Device offline. Queuing data for sync.");
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
      return;
    }

    try {
      isSyncing = true;
      // We save the FULL state to the monolith (chunked if needed) 
      // as the primary source of truth, while granular collections 
      // provide real-time updates for specific fields.
      const updatedAt = latestDataState.updatedAt || Date.now();
      const extraMeta = {
        folderId: userId,
        updatedAt: updatedAt,
        version: latestDataState.version || 1
      };

      await saveAutoChunked('dps_data', userId, latestDataState, extraMeta, 'dataStr');
      lastSyncStatus = true;
    } catch (error) {
      console.error("Firebase exception during save:", error);
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
    } finally {
      isSyncing = false;
    }
  };

  await performSave();
};

// Process the sync queue
export const processSyncQueue = async () => {
  if (isSyncing || (typeof window !== 'undefined' && !window.navigator.onLine)) return;
  
  const queue = await localIndexedDB.getSyncQueue();
  if (queue.length === 0) return;
  
  isSyncing = true;
  console.log(`Processing ${queue.length} queued items...`);
  
  const idsToRemove: number[] = [];
  
  try {
    // Process in parallel for speed
    const syncPromises = queue.map(async (item) => {
      try {
        const extraMeta = {
          folderId: item.userId,
          updatedAt: item.timestamp,
          version: item.data.version || 1
        };
        
        await saveAutoChunked('dps_data', item.userId, item.data, extraMeta, 'dataStr');
        idsToRemove.push(item.id);
      } catch (e) {
        console.error("Error processing sync queue item:", e);
      }
    });

    await Promise.all(syncPromises);
    
    if (idsToRemove.length > 0) {
      await localIndexedDB.clearSyncQueue(idsToRemove);
      console.log(`Successfully synced ${idsToRemove.length} items.`);
      lastSyncStatus = true;
    }
  } finally {
    isSyncing = false;
  }
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

export const saveTopic = async (userId: string, topic: any, category: string = 'dpss') => {
  if (!auth.currentUser) return;
  
  const allOps: any[] = [];
  
  const collectNodes = (node: any, parentId?: string) => {
    const { children, ...topicData } = node;
    const tid = node.id;
    
    const payload: any = {
      ...topicData,
      category,
      owner_id: auth.currentUser!.uid,
      updated_at: new Date().toISOString(),
      parentId: parentId || node.parentId || null
    };

    allOps.push({ id: tid, payload, children: children || [] });
    
    if (children && children.length > 0) {
      children.forEach((c: any) => collectNodes(c, tid));
    }
  };

  collectNodes(topic);

  // Process all collected nodes
  for (const op of allOps) {
    try {
      const { id, payload } = op;
      await saveAutoChunked('dps_topics', id, payload, {}, 'data');
    } catch (e) {
      console.error("Error saving topic node", op.id, e);
    }
  }
};

export const deleteStudent = async (userId: string, studentId: string, category: string = 'dpss') => {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'dps_students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dps_students/${studentId}`);
  }
};

export const saveStudent = async (userId: string, student: any, category: string = 'dpss') => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'dps_students', student.id), {
      ...student,
      category,
      owner_id: auth.currentUser.uid,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dps_students/${student.id}`);
  }
};

export const deleteTopic = async (userId: string, topicId: string, category: string = 'dpss') => {
  if (!auth.currentUser) return;
  try {
    const docRef = doc(db, 'dps_topics', topicId);
    
    // Find all children to delete recursively
    const q = query(collection(db, 'dps_topics'), where('owner_id', '==', auth.currentUser.uid), where('parentId', '==', topicId));
    const childrenSnap = await getDocs(q);
    const deletePromises = childrenSnap.docs.map(childDoc => deleteTopic(userId, childDoc.id, category));
    await Promise.all(deletePromises);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.isChunked && data.numChunks > 0) {
        const batch = writeBatch(db);
        for (let i = 0; i < data.numChunks; i++) {
          batch.delete(doc(db, `dps_topics/${topicId}/chunks`, i.toString()));
        }
        await batch.commit();
      }
    }
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dps_topics/${topicId}`);
  }
};

export const saveAttendance = async (userId: string, attendance: any) => {
  if (!auth.currentUser) return;
  try {
    // Attendance is often a deep object, we might save it as a monolith for now or split by month
    await setDoc(doc(db, 'dps_attendance', userId), { 
      data: attendance, 
      owner_id: userId,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Save attendance error:", error);
  }
};

export const saveDailyNote = async (userId: string, date: string, content: any) => {
  if (!auth.currentUser) return;
  try {
    const noteId = `${userId}_${date}`;
    await setDoc(doc(db, 'dps_daily_notes', noteId), {
      content,
      date,
      owner_id: userId,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Save daily note error:", error);
  }
};

export const saveJournalEntry = async (userId: string, date: string, entry: any) => {
  if (!auth.currentUser) return;
  try {
    const entryId = `${userId}_${date}`;
    await setDoc(doc(db, 'dps_journal', entryId), {
      ...entry,
      date,
      owner_id: userId,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Save journal entry error:", error);
  }
};

export const saveExpense = async (userId: string, expense: any, isDelete: boolean = false) => {
  if (!auth.currentUser) return;
  try {
    if (isDelete) {
      await deleteDoc(doc(db, 'dps_expenses', expense.id));
    } else {
      await setDoc(doc(db, 'dps_expenses', expense.id), {
        ...expense,
        owner_id: userId,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Save expense error:", error);
  }
};

export const saveTopicsBulk = async (userId: string, topicsToSave: { topic: any, category: string }[], topicIdsToDelete: { id: string, category: string }[]) => {
  if (!auth.currentUser) return;
  try {
    // Note: for very large bulk saves with chunked topics, we process them individually 
    // to handle potential chunk sub-collections correctly.
    for (const { topic, category } of topicsToSave) {
      await saveTopic(userId, topic, category);
    }

    const batch = writeBatch(db);
    topicIdsToDelete.forEach(({ id }) => {
      const d = doc(db, 'dps_topics', id);
      batch.delete(d);
    });

    if (topicIdsToDelete.length > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dps_topics_bulk');
  }
};

export const saveHabitCompletionBulk = async (userId: string, date: string, completions: any) => {
  return Promise.resolve();
};

export const saveHabitList = async (userId: string, habits: any[]) => {
  return Promise.resolve();
};

export const deleteHabit = async (userId: string, habitId: string) => {
  return Promise.resolve();
};

export const saveHabitCompletion = async (userId: string, habitId: string, date: string, completed: boolean) => {
  return Promise.resolve();
};

export const getSharedNote = async (shareId: string) => {
  try {
    const payload = await fetchAutoChunked('dps_shares', shareId, 'payload');
    if (!payload) return null;
    
    // Compatibility check for older structure
    if (payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)) {
      return payload;
    }
    return { payload };
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
  const extraMeta = {
    id, 
    owner_id: userId, 
    owner_name: ownerName, 
    type, 
    title, 
    created_at: new Date().toISOString()
  };

  try {
    await saveAutoChunked('dps_shares', id, payload, extraMeta, 'payload', false);
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

export const createCloudBackup = async (userId: string, data: any, type: 'Manual' | 'Auto' = 'Manual') => {
  try {
    const backupId = uuidv4(); 
    const extraMeta = {
      id: backupId,
      owner_id: userId,
      type,
      timestamp: new Date().toISOString()
    };

    await saveAutoChunked('dps_backups', backupId, data, extraMeta, 'data', false);
  } catch (err) {
    console.error("Backup failed", err);
    throw err;
  }
};

export const fetchBackupPayload = async (backupDoc: any) => {
  try {
    return await fetchAutoChunked('dps_backups', backupDoc.id, 'data');
  } catch (error) {
    console.error("Error fetching backup payload:", error);
    return null;
  }
};

export const getSyncStatus = () => lastSyncStatus;

export const getLastAutoBackupTimestamp = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'dps_backups'), 
      where('owner_id', '==', userId), 
      where('type', '==', 'Auto'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return snaps.docs[0].data().timestamp;
  } catch (err) {
    console.error("Error fetching last auto backup", err);
    return null;
  }
};


