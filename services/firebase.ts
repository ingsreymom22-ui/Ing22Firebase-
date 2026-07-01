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

export const checkFirebaseConnection = async () => {
    return typeof window !== 'undefined' && window.navigator.onLine;
};

// Mock Auth object to keep App.tsx working seamlessly
export const authService = {
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
const fetchDocChunksStandalone = async (collectionPath: string, docId: string, numChunks: number) => {
  try {
    const chunkPromises = [];
    for (let i = 0; i < numChunks; i++) {
      chunkPromises.push(getDoc(doc(db, `${collectionPath}/${docId}/chunks`, i.toString())));
    }
    const chunkSnaps = await Promise.all(chunkPromises);
    let fullString = '';
    for (const snap of chunkSnaps) {
      if (snap.exists()) fullString += snap.data().data;
    }
    return fullString ? JSON.parse(fullString) : null;
  } catch (e) {
    console.error(`Error fetching chunks for ${collectionPath}/${docId}`, e);
    return null;
  }
};

// Helper to build tree from flat topics
const buildTopicTree = (flatTopics: any[]) => {
  const map = new Map<string, any>();
  const roots: any[] = [];

  // Initialize map with clones and ensure children starts fresh
  flatTopics.forEach(t => {
    // We strip existing children to rebuild the tree from scratch using parentId links
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
      // ONLY push to roots if it definitely has no parent.
      // If it has a parentId but the parent is missing from the map, 
      // we treat it as an orphan for now (it won't show at the root level).
      roots.push(node);
    }
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
      const payload = docSnap.data();
      let data = null;
      if (payload.isChunked && payload.numChunks > 0) {
         data = await fetchDocChunksStandalone('dps_data', userId, payload.numChunks);
      } else if (payload.dataStr) {
         data = JSON.parse(payload.dataStr);
      } else {
         data = payload.data || payload;
      }
      
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
          const p = fetchDocChunksStandalone('dps_topics', change.doc.id, data.numChunks).then(reconstructed => {
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
    const docSnap = await getDoc(doc(db, 'dps_data', userId));
    if (docSnap.exists()) {
      const payload = docSnap.data();
      lastSyncStatus = true;
      if (payload.isChunked && payload.numChunks > 0) {
         // Use the helper we defined in the closure scope of subscribeToData? 
         // No, it's not exported. Let's define a standalone helper.
         return await fetchDocChunksStandalone('dps_data', userId, payload.numChunks);
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
  if (!userId || userId === 'unknown') return;
  latestDataState = dataState;
  
  const performSave = async () => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      console.log("Device offline. Queuing data for sync.");
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
      return;
    }

    try {
      // To improve sync speed and real-time reliability, we exclude large arrays 
      // from the monolith document and let granular collections handle them.
      const { students, dpssTopics, selfLearningTopics, ...metaOnly } = latestDataState;
      
      const dataStr = JSON.stringify(metaOnly);
      const size = dataStr.length;
      const updatedAt = latestDataState.updatedAt || Date.now();
      
      let payload = {};
      if (size > MAX_FIRESTORE_SIZE) {
        const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
        const batch = writeBatch(db);
        for (let i = 0; i < numChunks; i++) {
           const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
           batch.set(doc(db, `dps_data/${userId}/chunks`, i.toString()), { data: chunkStr });
        }
        payload = {
           folderId: userId,
           updatedAt: updatedAt,
           version: latestDataState.version || 1,
           numChunks: numChunks,
           isChunked: true
        };
        await batch.commit();
      } else {
        payload = {
           folderId: userId,
           updatedAt: updatedAt,
           version: latestDataState.version || 1,
           dataStr: dataStr,
           isChunked: false
        };
      }
      
      await setDoc(doc(db, 'dps_data', userId), payload);
      lastSyncStatus = true;
    } catch (error) {
      console.error("Firebase exception during save:", error);
      await localIndexedDB.queueSync(userId, latestDataState);
      lastSyncStatus = false;
    }
  };

  await performSave();
};

// Process the sync queue
export const processSyncQueue = async () => {
  if (isSyncingQueue || (typeof window !== 'undefined' && !window.navigator.onLine)) return;
  
  const queue = await localIndexedDB.getSyncQueue();
  if (queue.length === 0) return;
  
  isSyncingQueue = true;
  console.log(`Processing ${queue.length} queued items...`);
  
  const idsToRemove: number[] = [];
  
  // Process in parallel for speed
  const syncPromises = queue.map(async (item) => {
    try {
      const dataStr = JSON.stringify(item.data);
      const size = dataStr.length;
      
      let payload: any = {};
      if (size > MAX_FIRESTORE_SIZE) {
        const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
        const batch = writeBatch(db);
        for (let i = 0; i < numChunks; i++) {
           const chunkStr = dataStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
           batch.set(doc(db, `dps_data/${item.userId}/chunks`, i.toString()), { data: chunkStr });
        }
        payload = {
           folderId: item.userId,
           updatedAt: item.timestamp,
           version: item.data.version || 1,
           numChunks: numChunks,
           isChunked: true
        };
        await batch.commit();
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
    }
  });

  await Promise.all(syncPromises);
  
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

export const saveTopic = async (userId: string, topic: any, category: string = 'dpss') => {
  if (!auth.currentUser) return;
  
  const saveNode = async (node: any, parentId?: string) => {
    try {
      const { children, ...topicData } = node;
      const topicId = node.id;
      
      // Prepare payload (flat structure)
      let payload: any = {
        ...topicData,
        category,
        owner_id: auth.currentUser!.uid,
        updated_at: new Date().toISOString(),
        parentId: parentId || node.parentId || null
      };

      const topicStr = JSON.stringify(payload);
      const size = topicStr.length;

      if (size > MAX_FIRESTORE_SIZE) {
         const numChunks = Math.ceil(size / MAX_FIRESTORE_SIZE);
         const batch = writeBatch(db);
         for (let i = 0; i < numChunks; i++) {
            const chunkStr = topicStr.substring(i * MAX_FIRESTORE_SIZE, (i + 1) * MAX_FIRESTORE_SIZE);
            batch.set(doc(db, `dps_topics/${topicId}/chunks`, i.toString()), { data: chunkStr });
         }
         payload.isChunked = true;
         payload.numChunks = numChunks;
         // Strip the data fields from the main doc to save space
         delete payload.content;
         delete payload.notes;
         await batch.commit();
      } else {
         payload.isChunked = false;
      }

      await setDoc(doc(db, 'dps_topics', topicId), payload, { merge: true });

      // Recursively save children
      if (children && children.length > 0) {
        for (const child of children) {
          await saveNode(child, topicId);
        }
      }
    } catch (e) {
      console.error("Error saving node", node.id, e);
      throw e;
    }
  };

  try {
    await saveNode(topic);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dps_topics/${topic.id}`);
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
    const docSnap = await getDoc(doc(db, 'dps_shares', shareId));
    if (!docSnap.exists()) return null;
    
    const payload = docSnap.data();
    if (payload.isChunked && payload.numChunks > 0) {
      const reconstructed = await fetchDocChunksStandalone('dps_shares', shareId, payload.numChunks);
      return { ...payload, payload: reconstructed };
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


