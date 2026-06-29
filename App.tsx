import React, { useState, useEffect, useMemo, useRef } from "react";
import { DailyJournal } from "./components/DailyJournal";
import { DailyPerformanceCheck } from "./components/DailyPerformanceCheck";
import { Reflections } from "./components/Reflections";
import { AdvancedHabitTracker } from "./components/AdvancedHabitTracker";
import { ExpenseTracker } from "./components/ExpenseTracker";
import ReminderTable from "./components/ReminderTable";
import { AIModal } from "./components/AIModal";
import { Sidebar } from "./components/Sidebar";
import { SettingsModal } from "./components/SettingsModal";
import { SupermanAnimation } from "./components/SupermanAnimation";
import DPSSTable from "./components/DPSSTable";
import SelfLearningTable from "./components/SelfLearningTable";
import { SharedContentFullView } from "./components/SharedContentFullView";
import { RecycleBin } from "./components/RecycleBin";
import { MaintenancePanel } from "./components/MaintenancePanel";
import { TemplatesPanel } from "./components/TemplatesPanel";
import Dashboard from "./components/Dashboard";
import { FloatingToolbar } from "./components/FloatingToolbar";
import {
  AppData,
  Student,
  CurrentUser,
  UserRole,
  ColumnConfig,
  Tab,
  ViewMode,
  AppSettings,
  PriorityLevel,
  StudentCategory,
  JournalEntry,
  ExpenseEntry,
} from "./types";
import {
  subscribeToData,
  saveData,
  logOut,
  supabase,
} from "./services/supabase";
import { decodeFromURLSafeBase64 } from "./services/sharingEncoder";
import { storage } from "./services/storage";
import { Menu, MessageSquare, X, GraduationCap, Cloud, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { v4 as uuidv4 } from "uuid";
import { addMonths, format } from "date-fns";

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "c2",
    key: "teachers",
    label: "TEACHERS",
    width: 180,
    visible: true,
    type: "text",
  },
  {
    id: "c3",
    key: "level",
    label: "LEVEL",
    width: 85,
    visible: true,
    type: "text",
  },
  {
    id: "c5",
    key: "behavior",
    label: "BEHAVIOR",
    width: 180,
    visible: true,
    type: "text",
  },
  {
    id: "c_schedule",
    key: "schedule",
    label: "SCHEDULE",
    width: 140,
    visible: true,
    type: "text",
  },
  {
    id: "c4",
    key: "time",
    label: "TIME",
    width: 110,
    visible: true,
    type: "text",
  },
  {
    id: "c6",
    key: "duration",
    label: "DURATION",
    width: 100,
    visible: true,
    type: "text",
  },
  {
    id: "c7",
    key: "startDate",
    label: "START",
    width: 100,
    visible: true,
    type: "text",
  },
  {
    id: "c8",
    key: "deadline",
    label: "DEADLINE",
    width: 100,
    visible: true,
    type: "text",
  },
  {
    id: "c9",
    key: "assistant",
    label: "ASSISTANT",
    width: 150,
    visible: true,
    type: "text",
  },
];

const DEFAULT_PRIORITIES: PriorityLevel[] = [
  { id: 'very-important', label: 'Urgent', color: '#f43f5e' },
  { id: 'important', label: 'High', color: '#f59e0b' },
  { id: 'less-important', label: 'Normal', color: '#10b981' },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const stored = localStorage.getItem("dps_user");
      return stored
        ? JSON.parse(stored)
        : { name: "Local User", role: "Admin" };
    } catch (e) {
      return { name: "Local User", role: "Admin" };
    }
  });

  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthInitializing(false);
      const user = session?.user;
      if (user) {
        const stored = localStorage.getItem("dps_user");
        const role = (stored ? JSON.parse(stored).role : "Admin") || "Admin";
        const newUser: CurrentUser = {
          name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          role,
          uid: user.id,
          email: user.email,
        };
        setCurrentUser(newUser);
        localStorage.setItem("dps_user", JSON.stringify(newUser));
      } else {
        setCurrentUser(null);
        localStorage.removeItem("dps_user");
      }
    });

    // Initial fetch if already logged in via session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setIsAuthInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [dataLocal, setInternalData] = useState<AppData>(() => {
    const stored = localStorage.getItem("dps_data");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed) {
          if (!parsed.students) {
            parsed.students = [];
          }
          if (!parsed.settings?.priorities) {
            if (!parsed.settings) parsed.settings = {};
            parsed.settings.priorities = DEFAULT_PRIORITIES;
          }
          if (!parsed.settings?.columns) {
            parsed.settings = {
              ...(parsed.settings || {
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
              }),
              columns: DEFAULT_COLUMNS,
              textFontFamily:
                parsed.settings?.textFontFamily ||
                parsed.settings?.fontFamily ||
                "'Inter', sans-serif",
              textFontSize:
                parsed.settings?.textFontSize ||
                parsed.settings?.fontSize ||
                16,
            };
          }
          return parsed;
        }
      } catch (e) {
        console.error("Local data parse error", e);
      }
    }
    return {
      students: [],
      settings: {
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
        textFontFamily: "'Inter', sans-serif",
        textFontSize: 16,
        columns: DEFAULT_COLUMNS,
        priorities: DEFAULT_PRIORITIES,
        backgroundImage: "solid-white",
        backgroundDimOpacity: 0,
        fontColor: '#0f172a',
        dateTextColor: '#f97316'
      },
      attendance: {},
    };
  });
  
  const lastLocalUpdateRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const data = dataLocal;
  const currentDataRef = useRef<AppData>(dataLocal);
  useEffect(() => {
    currentDataRef.current = dataLocal;
  }, [dataLocal]);

  const setData = (action: React.SetStateAction<AppData>) => {
    lastLocalUpdateRef.current = Date.now();
    hasUnsavedChangesRef.current = true;
    setInternalData(action);
  };


  const [history, setHistory] = useState<AppData[]>([]);
  const [redoStack, setRedoStack] = useState<AppData[]>([]);
  const [showSyncToast, setShowSyncToast] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem('dps_active_tab');
      if (saved && Object.values(Tab).includes(saved as Tab)) return saved as Tab;
    } catch {}
    return Tab.DailyPerformanceCheck;
  });

  useEffect(() => {
    localStorage.setItem('dps_active_tab', activeTab);
  }, [activeTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const stored = localStorage.getItem("dps_sidebar_open");
    if (stored !== null) return stored === "true";
    return window.innerWidth > 768;
  });

  useEffect(() => {
    localStorage.setItem("dps_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem("dps_view_mode");
      if (saved) return saved as ViewMode;
    } catch {}
    return "Default";
  });

  useEffect(() => {
    localStorage.setItem("dps_view_mode", viewMode);
  }, [viewMode]);

  const [globalScale, setGlobalScale] = useState(1);

  // Note/Folder Sharing states
  const [sharedNoteData, setSharedNoteData] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importingDate, setImportingDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [isFetchSharedLoading, setIsFetchSharedLoading] = useState(false);
  const [shareFeedbackMessage, setShareFeedbackMessage] = useState<
    string | null
  >(null);

  const [filters, setFilters] = useState<any>({
    searchQuery: "",
    teacher: "",
    assistant: "",
    time: "",
    level: "",
    behavior: "",
    deadline: "",
    showHidden: false,
    attendanceTab: "PartTime",
    attendanceClass: "",
  });

  const OFFICIAL_DAILY_TASKS = useMemo(() => [], []);

  const previousDataSyncRef = useRef<string | null>(null);
  const lastScheduledDataStrRef = useRef<string | null>(null);
  const isCloudLoadedRef = useRef(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Supabase Global Auto-Sync Hook
  useEffect(() => {
    if (currentUser?.uid && !loading && data && isCloudLoadedRef.current) {
      const dataStr = JSON.stringify(data);
      if (dataStr === lastScheduledDataStrRef.current) return;
      lastScheduledDataStrRef.current = dataStr;

      setIsSyncing(true);
      isSyncingRef.current = true;
      const timer = setTimeout(async () => {
        try {
          const { saveData } = await import("./services/supabase");
          // Instant saves the snapshot of the data state directly without extra debouncing
          await saveData(currentUser.uid!, data, true);
          previousDataSyncRef.current = dataStr;
          
          // Clear hasUnsavedChangesRef ONLY if the current local state hasn't changed since this save ran
          if (JSON.stringify(currentDataRef.current) === dataStr) {
            hasUnsavedChangesRef.current = false;
          }
          setIsSyncing(false);
          isSyncingRef.current = false;
        } catch (err) {
          console.error("Auto Sync Error:", err);
          setIsSyncing(false);
          isSyncingRef.current = false;
        }
      }, 400); // 400ms debounce
      return () => clearTimeout(timer);
    }
  }, [data, currentUser, loading]);

  // No auto-seeding of named tasks per user request for a blank/clean start
  useEffect(() => {
    // Left empty intentionally to prevent auto-seeding of named tasks
  }, [loading]);

  // Handle URL share parameters on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get("share");
    const sharedDataParam = urlParams.get("sharedData");

    if (sharedDataParam) {
      try {
        const decodedPayload = decodeFromURLSafeBase64(sharedDataParam);
        if (decodedPayload) {
          const mockSharedDoc = {
            id: "local_shared_data",
            ownerId: decodedPayload.ownerId || "unknown",
            ownerName: decodedPayload.ownerName || "Chanthy",
            type: decodedPayload.type || "note-taking",
            title: decodedPayload.title || "Shared Topic",
            payload: decodedPayload.payload || decodedPayload,
          };
          setSharedNoteData(mockSharedDoc);
          setIsImportModalOpen(true);
          if (mockSharedDoc.payload?.date) {
            setImportingDate(mockSharedDoc.payload?.date);
          }
        } else {
          alert("This shared link data is corrupted or invalid.");
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (err) {
        console.error("Error decoding sharedData", err);
        alert("This shared link data is invalid.");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else if (shareId) {
      setIsFetchSharedLoading(true);
      import("./services/supabase").then(({ getSharedNote }) => {
        getSharedNote(shareId)
          .then((sharedDoc) => {
            setIsFetchSharedLoading(false);
            if (sharedDoc) {
              setSharedNoteData(sharedDoc);
              setIsImportModalOpen(true);
              if (sharedDoc.payload?.date) {
                setImportingDate(sharedDoc.payload.date);
              }
            } else {
              alert("This shared link is invalid or has expired.");
              // Clear URL param
              window.history.replaceState(null, "", window.location.pathname);
            }
          })
          .catch((err) => {
            setIsFetchSharedLoading(false);
            console.error("Error fetching shared note", err);
            window.history.replaceState(null, "", window.location.pathname);
          });
      });
    }
  }, []);

  const handleConfirmImport = () => {
    if (!sharedNoteData) return;

    const { type, payload } = sharedNoteData;

    if (type === "self-learning" || type === "note-taking" || type === "dpss") {
      const cloneTopicWithNewIds = (topic: any): any => {
        const newId = uuidv4();
        return {
          ...topic,
          id: newId,
          children: topic.children
            ? topic.children.map(cloneTopicWithNewIds)
            : undefined,
        };
      };

      const clonedTopic = cloneTopicWithNewIds(payload);

      if (type === "dpss" || type === "note-taking") {
        const currentTopics = data.dpssTopics || [];
        const updatedTopics = [...currentTopics, clonedTopic];
        handleUpdate({ ...data, dpssTopics: updatedTopics });

        import("./services/supabase").then(({ saveTopic }) => {
          if (currentUser?.uid) {
            saveTopic(currentUser.uid, clonedTopic, "dpss");
          }
        });
        setShareFeedbackMessage(
          "Successfully imported to your Note-taking topics!",
        );
      } else {
        const currentTopics = data.selfLearningTopics || [];
        const updatedTopics = [...currentTopics, clonedTopic];
        handleUpdate({ ...data, selfLearningTopics: updatedTopics });

        import("./services/supabase").then(({ saveTopic }) => {
          if (currentUser?.uid) {
            saveTopic(currentUser.uid, clonedTopic, "selfLearning");
          }
        });
        setShareFeedbackMessage(
          "Successfully imported to your Self-learning topics!",
        );
      }
    } else if (type === "journal") {
      const entry = payload.entry || payload;
      const targetDate = importingDate;
      const newEntries = {
        ...(data.journalEntries || {}),
        [targetDate]: entry,
      };

      handleUpdate({ ...data, journalEntries: newEntries });

      import("./services/supabase").then(({ saveJournalEntry }) => {
        if (currentUser?.uid) {
          saveJournalEntry(currentUser.uid, targetDate, entry);
        }
      });

      setShareFeedbackMessage(
        `Successfully imported Journal Entry to ${targetDate}!`,
      );
    } else if (type === "daily-note") {
      const content = payload.content || payload;
      const targetDate = importingDate;
      const newNotes = { ...(data.dailyNotes || {}), [targetDate]: content };

      handleUpdate({ ...data, dailyNotes: newNotes });

      import("./services/supabase").then(({ saveDailyNote }) => {
        if (currentUser?.uid) {
          saveDailyNote(currentUser.uid, targetDate, content);
        }
      });

      setShareFeedbackMessage(
        `Successfully imported Note-taking to ${targetDate}!`,
      );
    }

    setTimeout(() => {
      setIsImportModalOpen(false);
      setSharedNoteData(null);
      setShareFeedbackMessage(null);
      window.history.replaceState(null, "", window.location.pathname);
    }, 2000);
  };

  const activeStudents = useMemo(
    () => data.students.filter((s) => !s.deletedAt),
    [data.students],
  );

  const uniqueTeachers = useMemo(() => {
    const ts = new Set<string>();
    // From students
    activeStudents.forEach((s) => {
      if (s.teachers)
        String(s.teachers)
          .split("&")
          .forEach((t) => ts.add(t.trim()));
    });
    // From staff directory (all can be teachers/assistants)
    if (data.staffDirectory) {
      Object.keys(data.staffDirectory).forEach((name) => ts.add(name.trim()));
    }
    return Array.from(ts).filter(Boolean).sort();
  }, [data.students, data.staffDirectory]);

  const uniqueAssistants = useMemo(() => {
    const asst = new Set<string>();
    // From students
    activeStudents.forEach((s) => {
      if (s.assistant)
        String(s.assistant)
          .split("&")
          .forEach((a) => asst.add(a.trim()));
    });
    // From staff directory
    if (data.staffDirectory) {
      Object.keys(data.staffDirectory).forEach((name) => asst.add(name.trim()));
    }
    return Array.from(asst).filter(Boolean).sort();
  }, [data.students, data.staffDirectory]);

  const uniqueTimes = useMemo(() => {
    const tm = new Set<string>();
    activeStudents.forEach((s) => {
      if (s.time)
        String(s.time)
          .split("&")
          .forEach((t) => tm.add(t.trim()));
    });
    return Array.from(tm).filter(Boolean).sort();
  }, [data.students]);

  const uniqueLevels = useMemo(() => {
    const lv = new Set<string>();
    activeStudents.forEach((s) => {
      if (s.level)
        String(s.level)
          .split("&")
          .forEach((l) => lv.add(l.trim()));
    });
    return Array.from(lv).filter(Boolean).sort();
  }, [data.students]);

  const uniqueBehaviors = useMemo(() => {
    const bh = new Set<string>();
    activeStudents.forEach(
      (s) => s.behavior && bh.add(String(s.behavior).trim()),
    );
    return Array.from(bh).filter(Boolean).sort();
  }, [activeStudents]);

  useEffect(() => {
    // 1. Asynchronously restore full unlimited data from IndexedDB
    storage.getItem("dps_data").then((stored) => {
      // Only set local data if cloud hasn't arrived yet
      if (stored && !isCloudLoadedRef.current) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed) {
            if (!parsed.students) {
              parsed.students = [];
            }
            setData(parsed);
          }
        } catch (e) {
          console.error("IndexedDB restore parse error", e);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthInitializing) {
      return;
    }
    
    // Reset sync markers on user connection/login to guarantee fresh pull from source of truth
    isCloudLoadedRef.current = false;
    hasUnsavedChangesRef.current = false;
    isSyncingRef.current = false;
    previousDataSyncRef.current = null;
    lastScheduledDataStrRef.current = null;

    const uid = currentUser?.uid;
    if (!uid) {
      setLoading(false);
      // If logging out, we can mark cloud as "loaded" so local changes don't try to push
      isCloudLoadedRef.current = true;
      return;
    }
    setLoading(true);
    
    // Add a safety timeout for loading
    const loadTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Cloud load timed out. Falling back to local storage.");
        setLoading(false);
        isCloudLoadedRef.current = true; // Allow local saves to cloud if cloud is unreachable
      }
    }, 3000);

    const unsubscribe = subscribeToData(
      uid,
      (newData) => {
        clearTimeout(loadTimeout);
        const isFirstLoad = !isCloudLoadedRef.current;
        isCloudLoadedRef.current = true;
        setLoading(false);
        
        if (!newData) return;

        const incomingStr = JSON.stringify(newData);
        const currentDataStr = JSON.stringify(currentDataRef.current);
        
        // 1. If incoming data is exactly what we already have locally, do nothing but keep previousDataSyncRef updated
        if (currentDataStr === incomingStr) {
          previousDataSyncRef.current = incomingStr;
          lastScheduledDataStrRef.current = incomingStr;
          return;
        }

        // 2. If incoming data matches the last state we successfully saved or fetched, ignore (echo block)
        if (previousDataSyncRef.current === incomingStr) {
          return;
        }

        // 3. Conflict Prevention: Only apply conflict resolution if this is not the initial session load.
        // On initial login or startup, always trust the database source of truth.
        if (!isFirstLoad) {
          const currentLocalStr = JSON.stringify(currentDataRef.current);
          const hasUnsavedLocalState = lastScheduledDataStrRef.current !== previousDataSyncRef.current;
          
          if (hasUnsavedLocalState || hasUnsavedChangesRef.current || isSyncingRef.current || currentLocalStr !== incomingStr) {
            // If the update came while we are working or if it's already "old" compared to current local state, ignore it.
            const wasRecentlyUpdated = Date.now() - lastLocalUpdateRef.current < 4000; // 4s window is enough for debounce
            if (wasRecentlyUpdated || hasUnsavedChangesRef.current || isSyncingRef.current || hasUnsavedLocalState) {
              return;
            }
          }
        }

        // Ensure DEFAULT_COLUMNS are initialized
        if (!newData.settings?.columns) {
          newData.settings = {
            ...(newData.settings || {
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
            }),
            columns: DEFAULT_COLUMNS,
          };
        } else {
          // Migration: Remove redundant 'name' column if it exists in settings
          const hasNameCol = newData.settings.columns.some(
            (c: any) => c.key === "name",
          );
          if (hasNameCol) {
            newData.settings.columns = newData.settings.columns.filter(
              (c: any) => c.key !== "name",
            );
          }

          // Migration: Ensure 'schedule' column exists if missing
          const hasSchedule = newData.settings.columns.some(
            (c: any) => c.key === "schedule",
          );
          if (!hasSchedule) {
            const newCols = [...newData.settings.columns];
            // Try to insert after behavior or before time
            const behaviorIdx = newCols.findIndex(
              (c: any) => c.key === "behavior",
            );
            if (behaviorIdx !== -1) {
              newCols.splice(
                behaviorIdx + 1,
                0,
                DEFAULT_COLUMNS.find((c) => c.key === "schedule")!,
              );
            } else {
              newCols.push(DEFAULT_COLUMNS.find((c) => c.key === "schedule")!);
            }
            newData.settings.columns = newCols;
          }
        }

        const finalStr = JSON.stringify(newData);
        previousDataSyncRef.current = finalStr;
        lastScheduledDataStrRef.current = finalStr;
        setInternalData(newData);
        storage.setItem("dps_data", JSON.stringify(newData)); // SYNC to storage
        setLoading(false);
      },
      () => {
        isCloudLoadedRef.current = true; // Still mark as loaded to allow local mode push if empty
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [currentUser?.uid, isAuthInitializing]);

  const handlePermanentDeleteStudent = async (id: string) => {
    const previousData = { ...data };
    const updatedStudents = data.students.filter((s) => s.id !== id);
    const newData = { ...data, students: updatedStudents };
    setData(newData);
    storage.setItem("dps_data", JSON.stringify(newData));

    if (currentUser?.uid) {
      try {
        const { deleteStudent } = await import("./services/supabase");
        await deleteStudent(currentUser.uid, id);
      } catch (error) {
        console.error("Failed to delete student:", error);
        setData(previousData);
        storage.setItem("dps_data", JSON.stringify(previousData));
        alert("Failed to delete student. The action has been reverted.");
      }
    }
  };

  const handlePermanentDeleteTopic = async (
    id: string,
    category: "dpss" | "selfLearning" = "dpss",
  ) => {
    const field = category === "dpss" ? "dpssTopics" : "selfLearningTopics";

    // Find the root topic containing this ID
    const findRoot = (items: any[], targetId: string): any | null => {
      for (const item of items) {
        if (item.id === targetId) return item;
        const existsInChildren = (children: any[], tid: string): boolean => {
          return children.some(
            (c) =>
              c.id === tid || (c.children && existsInChildren(c.children, tid)),
          );
        };
        if (item.children && existsInChildren(item.children, targetId))
          return item;
      }
      return null;
    };

    const rootToRemove = findRoot(data[field] || [], id);
    if (!rootToRemove) return;

    const isRoot = rootToRemove.id === id;

    const deleteFromTopics = (items: any[]): any[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children ? deleteFromTopics(item.children) : undefined,
        }));
    };

    const previousData = { ...data };
    const updatedTopics = deleteFromTopics(data[field] || []);
    const newData = { ...data, [field]: updatedTopics };
    setData(newData);
    storage.setItem("dps_data", JSON.stringify(newData));

    if (currentUser?.uid) {
      try {
        const { deleteTopic, saveTopic } = await import("./services/supabase");
        if (isRoot) {
          await deleteTopic(currentUser.uid, id, category);
        } else {
          // Find the updated root in the new data to save it
          const updatedRoot = updatedTopics.find((t) => t.id === rootToRemove.id);
          if (updatedRoot) {
            await saveTopic(currentUser.uid, updatedRoot, category);
          }
        }
      } catch (error) {
        console.error("Failed to delete topic:", error);
        setData(previousData);
        storage.setItem("dps_data", JSON.stringify(previousData));
        alert("Failed to delete topic. The action has been reverted.");
      }
    }
  };

  const handleUpdate = (
    newDataOrUpdater: AppData | ((prev: AppData) => AppData),
    skipHistory = false,
  ) => {
    setData((prev) => {
      const newData =
        typeof newDataOrUpdater === "function"
          ? newDataOrUpdater(prev)
          : newDataOrUpdater;

      if (!skipHistory) {
        setHistory((h) => [...h.slice(-19), prev]); // Keep last 20 states
        setRedoStack([]);
      }

      storage.setItem("dps_data", JSON.stringify(newData));

      if (currentUser?.uid) {
        import("./services/supabase").then(
          ({
            saveStudent,
            saveData,
            saveTopic,
            deleteTopic,
            saveTopicsBulk,
            saveAttendance,
            saveDailyNote,
            saveHabitCompletionBulk,
            saveHabitList,
            deleteHabit,
          }) => {
            // Specialized sync logic...

            // 1. Sync students
            const oldStudentsMap = new Map(prev.students.map((s) => [s.id, s]));
            newData.students.forEach((s) => {
              const old = oldStudentsMap.get(s.id);
              if (!old || JSON.stringify(old) !== JSON.stringify(s)) {
                saveStudent(currentUser.uid!, s);
              }
            });
            prev.students.forEach((s) => {
              if (!newData.students.find((ns) => ns.id === s.id)) {
                import("./services/supabase").then((f) =>
                  f.deleteStudent(currentUser.uid!, s.id),
                );
              }
            });

            // 1.1 Sync habits
            const oldHabitsMap = new Map(
              (prev.habits || []).map((h) => [h.id, h]),
            );
            (newData.habits || []).forEach((h) => {
              const old = oldHabitsMap.get(h.id);
              if (!old || JSON.stringify(old) !== JSON.stringify(h)) {
                saveHabitList(currentUser.uid!, [h]);
              }
            });
            (prev.habits || []).forEach((h) => {
              if (!(newData.habits || []).find((nh) => nh.id === h.id)) {
                deleteHabit(currentUser.uid!, h.id);
              }
            });

            // 2. Sync Daily Notes
            const changedNotes = Object.keys(newData.dailyNotes || {}).filter(
              (date) => newData.dailyNotes![date] !== prev.dailyNotes?.[date],
            );
            changedNotes.forEach((date) =>
              saveDailyNote(currentUser.uid!, date, newData.dailyNotes![date]),
            );

            // 3. Sync Habit Completions
            const changedHabitDates = Object.keys(
              newData.habitCompletions || {},
            ).filter(
              (date) =>
                JSON.stringify(newData.habitCompletions![date]) !==
                JSON.stringify(prev.habitCompletions?.[date]),
            );
            changedHabitDates.forEach((date) =>
              saveHabitCompletionBulk(
                currentUser.uid!,
                date,
                newData.habitCompletions![date],
              ),
            );

            // 4. Generic sync for settings (instant write to prevent delays)
            saveData(currentUser.uid!, newData, false);

            // 5. Sync Topics (DPSS and Self-Learning)
            const topicsToSave: {
              topic: any;
              category: "dpss" | "selfLearning";
            }[] = [];
            const topicIdsToDelete: {
              id: string;
              category: "dpss" | "selfLearning";
            }[] = [];

            ["dpssTopics", "selfLearningTopics"].forEach((field) => {
              const category = (
                field === "dpssTopics" ? "dpss" : "selfLearning"
              ) as "dpss" | "selfLearning";
              const oldTopicsArr =
                (prev[field as keyof AppData] as any[]) || [];
              const newTopicsArr =
                (newData[field as keyof AppData] as any[]) || [];

              const oldMap = new Map(
                oldTopicsArr.map((t) => [String(t.id), t]),
              );
              newTopicsArr.forEach((t) => {
                const old = oldMap.get(String(t.id));
                if (!old || JSON.stringify(old) !== JSON.stringify(t)) {
                  topicsToSave.push({ topic: t, category });
                }
              });
              oldTopicsArr.forEach((t) => {
                if (
                  !newTopicsArr.find((nt) => String(nt.id) === String(t.id))
                ) {
                  topicIdsToDelete.push({ id: String(t.id), category });
                }
              });
            });

            if (topicsToSave.length > 0 || topicIdsToDelete.length > 0) {
              saveTopicsBulk(currentUser.uid!, topicsToSave, topicIdsToDelete);
            }
          },
        );
      }

      return newData;
    });
  };

  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    setData((prev) => {
      const updatedStudents = prev.students.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      );
      const newData = { ...prev, students: updatedStudents };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });

    setHistory((prev) => [...prev.slice(-19), data]);
    setRedoStack([]);
  };

  const handleUpdateTopic = async (
    updatedTopics: any[],
    topicToSave?: any,
    category: "dpss" | "selfLearning" = "dpss",
  ) => {
    setData((prev) => {
      const newData =
        category === "dpss"
          ? { ...prev, dpssTopics: updatedTopics }
          : { ...prev, selfLearningTopics: updatedTopics };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });
  };

  const handleUpdateDailyNote = async (date: string, content: string) => {
    setData((prev) => {
      const newDailyNotes = { ...(prev.dailyNotes || {}), [date]: content };
      const newData = { ...prev, dailyNotes: newDailyNotes };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });
  };

  const handleUpdateJournalEntry = async (
    date: string,
    entry: JournalEntry,
  ) => {
    setData((prev) => {
      const newJournalEntries = {
        ...(prev.journalEntries || {}),
        [date]: entry,
      };
      const newData = { ...prev, journalEntries: newJournalEntries };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });
  };

  const handleUpdateHabitCompletion = async (
    date: string,
    habitId: string,
    completed: boolean | number,
  ) => {
    setData((prev) => {
      const completions = prev.habitCompletions || {};
      const dayCompletions = {
        ...(completions[date] || {}),
        [habitId]: completed,
      };
      const newCompletions = { ...completions, [date]: dayCompletions };
      const newData = { ...prev, habitCompletions: newCompletions };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });
  };

  const handleUpdateExpense = async (
    expense: ExpenseEntry,
    isDelete: boolean = false,
  ) => {
    setData((prevData) => {
      let newExpenses = [...(prevData.expenses || [])];
      if (isDelete) {
        newExpenses = newExpenses.filter((e) => e.id !== expense.id);
      } else {
        const exists = newExpenses.find((e) => e.id === expense.id);
        if (exists) {
          newExpenses = newExpenses.map((e) =>
            e.id === expense.id ? expense : e,
          );
        } else {
          newExpenses = [expense, ...newExpenses];
        }
      }

      const newData = { ...prevData, expenses: newExpenses };
      storage.setItem("dps_data", JSON.stringify(newData));
      return newData;
    });

    if (currentUser?.uid) {
      const { saveExpense } = await import("./services/supabase");
      await saveExpense(currentUser.uid, expense, isDelete);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, data]);
    setHistory((prev) => prev.slice(0, -1));
    setData(previous);
    storage.setItem("dps_data", JSON.stringify(previous));
    if (currentUser?.uid) saveData(currentUser.uid, previous, true);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, data]);
    setRedoStack((prev) => prev.slice(0, -1));
    setData(next);
    storage.setItem("dps_data", JSON.stringify(next));
    if (currentUser?.uid) saveData(currentUser.uid, next, true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, redoStack, data]);

  const handleAddStudent = async (
    parsedData?: Partial<Student> | Partial<Student>[],
  ) => {
    setData((prev) => {
      const incomingData = Array.isArray(parsedData)
        ? parsedData
        : parsedData
          ? [parsedData]
          : [{}];
      const newStudentsBatch = incomingData.map((s, index) => {
        const today = new Date();
        let determinedCategory: StudentCategory = "Reminder";

        return {
          id: uuidv4(),
          name: "",
          category: determinedCategory,
          order: prev.students.length + index,
          isHidden: false,
          parentContact: false,
          headTeacher: false,
          startDate: s.startDate || format(today, "dd/MM/yyyy"),
          deadline: s.deadline || format(addMonths(today, 1), "dd/MM/yyyy"),
          ...s,
        } as Student;
      });

      const newData = {
        ...prev,
        students: [...newStudentsBatch, ...prev.students],
      };
      storage.setItem("dps_data", JSON.stringify(newData));

      if (currentUser?.uid) {
        import("./services/supabase").then(({ saveStudent }) => {
          for (const student of newStudentsBatch) {
            saveStudent(currentUser.uid!, student);
          }
        });
      }
      return newData;
    });
  };

  const handleLogin = async (
    _name?: string,
    role: UserRole = "Admin",
    _pin?: string,
  ) => {
    // Deprecated: Google Sign-in removed
  };

  const handlePhoneLogin = (userResult: any) => {
    const user: CurrentUser = {
      name: userResult?.displayName || userResult?.phoneNumber || "User",
      role: "Teacher",
      uid: userResult?.uid,
    };
    setCurrentUser(user);
    localStorage.setItem("dps_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem("dps_user");
  };

  const handleClearCategory = (categories: StudentCategory[]) => {
    if (
      !window.confirm(
        `Are you sure you want to move ALL students in ${categories.join("/")} to the Recycle Bin?`,
      )
    )
      return;
    const now = new Date().toISOString();
    const updatedStudents = data.students.map((s) =>
      categories.includes(s.category) ? { ...s, deletedAt: now } : s,
    );
    handleUpdate({ ...data, students: updatedStudents });
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm("Move to Recycle Bin?")) {
      const now = new Date().toISOString();
      const updatedStudents = data.students.map((s) =>
        s.id === id ? { ...s, deletedAt: now } : s,
      );
      handleUpdate({ ...data, students: updatedStudents });

      if (currentUser?.uid) {
        const { saveStudent } = await import("./services/supabase");
        const student = updatedStudents.find((s) => s.id === id);
        if (student) await saveStudent(currentUser.uid, student);
      }
    }
  };

  // Automatically purge items older than 30 days
  useEffect(() => {
    if (!loading && data.students.length > 0) {
      const now = new Date();
      const filtered = data.students.filter((s) => {
        if (!s.deletedAt) return true;
        const deletedDate = new Date(s.deletedAt);
        const diffDays =
          (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < 30;
      });

      if (filtered.length !== data.students.length) {
        handleUpdate({ ...data, students: filtered });
      }
    }
  }, [loading, data.students.length]);

  const isModuleLocked = (module: "Hall" | "Attendance" | "Finance") => {
    return data.moduleLocks?.[module] || false;
  };

  return (
    <div
      className={`h-[100dvh] flex font-sans overflow-hidden md:overflow-hidden transition-all duration-700 relative ${data.settings?.highContrastMode ? 'high-contrast-mode' : ''}`}
      style={{
        fontFamily: data.settings?.fontFamily || "'Inter', sans-serif",
        backgroundColor: data.settings?.appBackgroundColor || (data.settings?.backgroundImage === 'solid-white' ? "#ffffff" : "transparent"),
        color: data.settings?.highContrastMode ? "#000000" : (data.settings?.fontColor || "inherit"),
        ...(data.settings?.highContrastMode ? { lineHeight: 1.6 } : {})
      }}
    >
      <style>
        {`
          .high-contrast-mode * {
            color: #000000 !important;
          }
          .high-contrast-mode p,
          .high-contrast-mode li,
          .high-contrast-mode span.content-text,
          .high-contrast-mode .text-heavy {
             line-height: 1.6 !important;
          }
          .high-contrast-mode h1, 
          .high-contrast-mode h2, 
          .high-contrast-mode h3, 
          .high-contrast-mode h4, 
          .high-contrast-mode h5, 
          .high-contrast-mode h6,
          .high-contrast-mode input,
          .high-contrast-mode textarea {
            color: #000000 !important;
          }
        `}
      </style>
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700`}
        style={{
          backgroundImage: data.settings?.backgroundImage && data.settings.backgroundImage !== 'solid-white'
            ? `url(${data.settings.backgroundImage})`
            : "none",
          backgroundColor: data.settings?.backgroundImage === 'solid-white' ? "#ffffff" : "transparent",
          filter: `blur(${data.settings?.backgroundImageBlur ?? 0}px)`,
          transform: data.settings?.backgroundImageBlur
            ? "scale(1.05)"
            : "none", // Prevent blurred white border artifacting!
          zIndex: 0,
        }}
      />
      {/* Dynamic Overlay Dimming Layer for Superior Text Readability */}
      <div
        className="absolute inset-0 bg-slate-950 pointer-events-none transition-all duration-700"
        style={{
          opacity:
            data.settings?.backgroundDimOpacity !== undefined
              ? data.settings.backgroundDimOpacity / 100
              : 0.2,
          zIndex: 0,
        }}
      />

      <div className="flex h-full w-full relative z-10 transition-colors duration-700 dark:text-slate-200">
        <Sidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          role={currentUser?.role || "Teacher"}
          currentUser={currentUser}
          onSettingsOpen={() => setIsContactsOpen(true)}
          filters={filters}
          setFilters={setFilters}
          uniqueTeachers={uniqueTeachers}
          uniqueAssistants={uniqueAssistants}
          uniqueTimes={uniqueTimes}
          uniqueLevels={uniqueLevels}
          uniqueBehaviors={uniqueBehaviors}
          viewMode={viewMode}
          setViewMode={setViewMode}
          globalScale={globalScale}
          setGlobalScale={setGlobalScale}
          settings={data.settings}
          onUpdateSettings={(s) => handleUpdate({ ...data, settings: s })}
          data={data}
          onClearCategory={handleClearCategory}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          isSyncing={isSyncing}
        />

        <AIModal
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          onAdd={handleAddStudent}
          mode={"Hall"}
        />

        <SettingsModal
          isOpen={isContactsOpen}
          onClose={() => setIsContactsOpen(false)}
          settings={data.settings}
          onUpdate={(newSettings) =>
            handleUpdate({ ...data, settings: newSettings })
          }
          currentUser={currentUser}
          onLogin={handleLogin as any}
          onPhoneLogin={handlePhoneLogin}
          onLogout={handleLogout}
          appData={data}
          onImportData={(importedData) => handleUpdate(importedData)}
        />

        <SupermanAnimation students={data.students} />

        <main
          className={`flex-1 flex flex-col ${[Tab.SelfLearning, Tab.DPSS].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto'} md:overflow-hidden transition-transform duration-300 origin-top-left bg-white/[0.01] backdrop-blur-md`}
          style={{
            transform: `scale(${globalScale})`,
            width: `${100 / globalScale}%`,
            height: `${100 / globalScale}%`,
          }}
        >
          <div className={`flex-1 flex flex-col ${[Tab.SelfLearning, Tab.DPSS].includes(activeTab) ? 'pt-0' : 'pt-16 md:pt-0'} overflow-visible md:overflow-hidden h-full min-h-0 w-full`}>
            <>
              {activeTab === Tab.AdvancedHabitTracker && (
                <AdvancedHabitTracker data={data} onUpdate={handleUpdate} />
              )}
              {activeTab === Tab.Reflections && (
                <Reflections data={data} onUpdate={handleUpdate} />
              )}
              {activeTab === Tab.DailyJournal && (
                <DailyJournal
                  data={data}
                  onUpdate={handleUpdate}
                  onUpdateJournalEntry={handleUpdateJournalEntry}
                />
              )}
              {activeTab === Tab.DailyPerformanceCheck && (
                <DailyPerformanceCheck
                  data={data}
                  onUpdate={handleUpdate}
                  students={activeStudents}
                  onAddStudent={(defaults) => handleAddStudent(defaults)}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onClearCategory={(cats) =>
                    handleClearCategory(cats as StudentCategory[])
                  }
                  filters={filters}
                  setFilters={setFilters}
                  role={currentUser?.role || "Teacher"}
                />
              )}
              {activeTab === Tab.Reminder && (
                <ReminderTable
                  students={activeStudents}
                  onAddStudent={(defaults) => handleAddStudent(defaults)}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onClearCategory={(cats) =>
                    handleClearCategory(cats as StudentCategory[])
                  }
                  filters={filters}
                  setFilters={setFilters}
                  role={currentUser?.role || "Teacher"}
                  settings={data.settings}
                  onUpdateSettings={(s) =>
                    handleUpdate({ ...data, settings: s })
                  }
                />
              )}
              {activeTab === Tab.DPSS && (
                <DPSSTable
                  data={data}
                  onUpdate={handleUpdate}
                  onUpdateTopic={(topics, topic) => {
                    if (topic && (topic as any).deletedAt) {
                      // Marking as deleted (recycle bin)
                      handleUpdateTopic(topics, topic, "dpss");
                    } else if (topic && (topic as any).deleted) {
                      // Actually delete if requested (though we mostly use deletedAt)
                      handlePermanentDeleteTopic(topic.id, "dpss");
                    } else {
                      handleUpdateTopic(topics, topic, "dpss");
                    }
                  }}
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                />
              )}
              {activeTab === Tab.SelfLearning && (
                <SelfLearningTable
                  data={data}
                  onUpdate={handleUpdate}
                  onUpdateTopic={(topics, topic) => {
                    if (topic && (topic as any).deletedAt) {
                      handleUpdateTopic(topics, topic, "selfLearning");
                    } else if (topic && (topic as any).deleted) {
                      handlePermanentDeleteTopic(topic.id, "selfLearning");
                    } else {
                      handleUpdateTopic(topics, topic, "selfLearning");
                    }
                  }}
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                />
              )}
              {activeTab === Tab.Templates && (
                <TemplatesPanel
                  data={data}
                  onUpdate={handleUpdate}
                  setActiveTab={setActiveTab}
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                />
              )}
              {activeTab === Tab.ExpenseTracker && (
                <ExpenseTracker
                  data={data}
                  onUpdate={handleUpdate}
                  onUpdateExpense={handleUpdateExpense}
                />
              )}
              {activeTab === Tab.Analytics && <Dashboard data={data} />}
              {activeTab === Tab.RecycleBin && (
                <RecycleBin
                  data={data}
                  onUpdate={handleUpdate}
                  onPermanentDeleteStudent={handlePermanentDeleteStudent}
                  onPermanentDeleteTopic={handlePermanentDeleteTopic}
                />
              )}
              {activeTab === Tab.Maintenance && (
                <MaintenancePanel
                  data={data}
                  onUpdate={handleUpdate}
                  currentUser={currentUser}
                />
              )}
              <FloatingToolbar />
            </>
          </div>
        </main>

        <div className="fixed bottom-2 right-2 md:bottom-2 md:right-2 flex flex-col gap-3 no-print z-50">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-11 h-11 bg-white text-slate-500 hover:text-emerald-600 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-200"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Dynamic Link Note Import Full View Takeover */}
      {isImportModalOpen && sharedNoteData && (
        <div className="fixed inset-0 z-[99999] bg-white dark:bg-slate-950 overflow-y-auto">
          <SharedContentFullView
            data={sharedNoteData}
            onImport={(date) => {
              if (date) setImportingDate(date);
              handleConfirmImport();
            }}
            onClose={() => {
              setIsImportModalOpen(false);
              setSharedNoteData(null);
              window.history.replaceState(null, "", window.location.pathname);
            }}
          />
        </div>
      )}

      {/* Dynamic Link Fetch Loader */}
      {isFetchSharedLoading && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider uppercase">
              Fetching shared content...
            </span>
          </div>
        </div>
      )}

      {/* Non-Intrusive Animated Bottom Toast confirmation */}
      <AnimatePresence>
        {showSyncToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl font-sans select-none pointer-events-none"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/25 text-emerald-400">
              <Cloud size={14} className="animate-bounce" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-wider uppercase leading-none text-slate-200">
                Cloud Sync Success
              </span>
              <span className="text-[9px] font-medium leading-normal text-slate-400 mt-1">
                Data saved successfully to Supabase
              </span>
            </div>
            <div className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-500 text-slate-950 ml-2 shadow-inner">
              <Check size={10} strokeWidth={4} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
