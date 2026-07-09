import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

// ==========================================
// ASYNC THUNKS FOR FULL-STACK COMMUNICATION
// ==========================================

// Auth Thunks
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password?: string }, thunkAPI) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password || "password123" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue(data.message || "Failed to login");
      }
      return data.user;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    await fetch("/api/logout", { method: "POST" });
    return true;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.message || "Server connection error");
  }
});

// Doctors & Data Thunks
export const fetchHCPData = createAsyncThunk("doctor/fetchData", async (_, thunkAPI) => {
  try {
    const response = await fetch("/api/hcp");
    const data = await response.json();
    if (!response.ok || !data.success) {
      return thunkAPI.rejectWithValue("Failed to fetch HCP metadata");
    }
    return {
      doctors: data.doctors,
      hospitals: data.hospitals,
      products: data.products,
    };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.message || "Server connection error");
  }
});

export const fetchDoctorDetails = createAsyncThunk(
  "doctor/fetchDetails",
  async (id: string, thunkAPI) => {
    try {
      const response = await fetch(`/api/hcp/${id}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue("Failed to fetch Doctor details");
      }
      return { doctor: data.doctor, interactions: data.interactions };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

// Interaction Thunks
export const fetchInteractionsHistory = createAsyncThunk(
  "interaction/fetchHistory",
  async (_, thunkAPI) => {
    try {
      const response = await fetch("/api/history");
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue("Failed to fetch interaction log history");
      }
      return data.history;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

export const submitInteraction = createAsyncThunk(
  "interaction/submit",
  async (interaction: any, thunkAPI) => {
    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interaction),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue(data.message || "Failed to submit interaction");
      }
      thunkAPI.dispatch(fetchInteractionsHistory());
      return data.interaction;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

export const processAILogWorkflow = createAsyncThunk(
  "interaction/processAI",
  async (notes: string, thunkAPI) => {
    try {
      const state: any = thunkAPI.getState();
      const currentDraft = state.interaction?.currentDraft;

      const response = await fetch("/api/langgraph/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, currentDraft }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue(data.message || "Failed to process AI extraction");
      }
      return data; // contains extracted, logs, and validationErrors
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

// Chat Thunks
export const sendChatMessage = createAsyncThunk(
  "chat/sendMessage",
  async (payload: { message: string; history: Array<any> }, thunkAPI) => {
    try {
      const state: any = thunkAPI.getState();
      const currentDraft = state.interaction?.currentDraft;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payload.message,
          history: payload.history,
          currentDraft
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return thunkAPI.rejectWithValue(data.message || "Failed to chat with AI Assistant");
      }
      return data; // contains reply, extracted, logs, validationErrors
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || "Server connection error");
    }
  }
);

// ==========================================
// REDUX SLICES
// ==========================================

// 1. Auth Slice
interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "failed";
  error: string | null;
}
const initialAuthState: AuthState = {
  user: {
    email: "rep1@pharma.com",
    name: "SARAH CONNORS",
    role: "Senior Medical Representative",
    region: "Global Operations",
  },
  isAuthenticated: true, // Default logged-in for frictionless initial landing
  status: "idle",
  error: null,
};
export const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

// 2. Interaction Draft & Submission Slice
interface InteractionState {
  interactions: Array<any>;
  currentDraft: {
    doctor_name: string;
    hospital: string;
    specialization: string;
    meeting_date: string;
    meeting_time: string;
    meeting_type: "Face to Face" | "Phone" | "Video Call" | "Conference";
    products: string[];
    samples_given: number;
    competitor_mentioned: string;
    doctor_feedback: string;
    representative_notes: string;
    follow_up_date: string;
    priority: "High" | "Medium" | "Low";
    summary?: string;
    action_items?: string[];
    sentiment?: string;
    confidence?: number;
    quality_score?: number;
    next_best_action?: string;
  };
  agentLogs: Array<any>;
  validationErrors: string[];
  highlightedFields: string[];
  status: "idle" | "loading" | "succeeded" | "failed";
  aiProcessing: boolean;
  error: string | null;
}

const emptyDraft = {
  doctor_name: "",
  hospital: "",
  specialization: "",
  meeting_date: new Date().toISOString().split("T")[0],
  meeting_time: "10:00",
  meeting_type: "Face to Face" as const,
  products: [],
  samples_given: 0,
  competitor_mentioned: "",
  doctor_feedback: "",
  representative_notes: "",
  follow_up_date: "",
  priority: "Medium" as const,
  summary: "",
  action_items: [],
  sentiment: "Neutral",
  confidence: 100,
  quality_score: 80,
  next_best_action: ""
};

const initialInteractionState: InteractionState = {
  interactions: [],
  currentDraft: { ...emptyDraft },
  agentLogs: [],
  validationErrors: [],
  highlightedFields: [],
  status: "idle",
  aiProcessing: false,
  error: null,
};

const getModifiedFields = (prev: any, next: any) => {
  const modified: string[] = [];
  if (!prev || !next) return modified;

  const keys = [
    "doctor_name",
    "hospital",
    "specialization",
    "meeting_date",
    "meeting_time",
    "meeting_type",
    "products",
    "samples_given",
    "competitor_mentioned",
    "doctor_feedback",
    "representative_notes",
    "follow_up_date",
    "priority",
    "summary",
    "action_items",
    "sentiment",
    "confidence",
    "quality_score",
    "next_best_action"
  ];

  for (const key of keys) {
    const valPrev = prev[key];
    const valNext = next[key];

    if (valNext === undefined || valNext === null) continue;

    if (Array.isArray(valPrev) && Array.isArray(valNext)) {
      if (JSON.stringify([...valPrev].sort()) !== JSON.stringify([...valNext].sort())) {
        modified.push(key);
      }
    } else if (valPrev !== valNext) {
      modified.push(key);
    }
  }
  return modified;
};

export const interactionSlice = createSlice({
  name: "interaction",
  initialState: initialInteractionState,
  reducers: {
    updateDraftField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      state.currentDraft = {
        ...state.currentDraft,
        [action.payload.field]: action.payload.value,
      };
      // Keep highlighted fields updated if manual edits occur
      state.highlightedFields = state.highlightedFields.filter(f => f !== action.payload.field);
    },
    setFullDraft: (state, action: PayloadAction<any>) => {
      const modified = getModifiedFields(state.currentDraft, action.payload);
      state.highlightedFields = modified;
      state.currentDraft = { ...state.currentDraft, ...action.payload };
    },
    resetDraft: (state) => {
      state.currentDraft = { ...emptyDraft };
      state.agentLogs = [];
      state.validationErrors = [];
      state.highlightedFields = [];
    },
    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },
    clearHighlights: (state) => {
      state.highlightedFields = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractionsHistory.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchInteractionsHistory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.interactions = action.payload;
      })
      .addCase(submitInteraction.fulfilled, (state) => {
        state.currentDraft = { ...emptyDraft };
        state.agentLogs = [];
        state.validationErrors = [];
        state.highlightedFields = [];
      })
      .addCase(processAILogWorkflow.pending, (state) => {
        state.aiProcessing = true;
      })
      .addCase(processAILogWorkflow.fulfilled, (state, action) => {
        state.aiProcessing = false;
        state.agentLogs = action.payload.logs || [];
        state.validationErrors = action.payload.validationErrors || [];
        if (action.payload.extracted) {
          const modified = getModifiedFields(state.currentDraft, action.payload.extracted);
          state.highlightedFields = modified;
          state.currentDraft = {
            ...state.currentDraft,
            ...action.payload.extracted,
          };
        }
      })
      .addCase(processAILogWorkflow.rejected, (state, action) => {
        state.aiProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateDraftField, setFullDraft, resetDraft, clearValidationErrors, clearHighlights } = interactionSlice.actions;

// 3. AI Assistant Chat Slice
interface ChatState {
  messages: Array<{
    id: string;
    sender: "user" | "assistant";
    text: string;
    timestamp: string;
    logs?: Array<any>;
    extractedData?: any;
  }>;
  suggestedPrompts: string[];
  status: "idle" | "loading" | "failed";
}
const initialChatState: ChatState = {
  messages: [
    {
      id: "msg-init",
      sender: "assistant",
      text: "Hello! I am your AI CRM Assistant Copilot. You can describe your recent meeting in natural language here (e.g. 'I met Dr. Sharma today at Apollo Hospital. We discussed Januvia and he requested 10 samples.'), and I will automatically extract the CRM data, run validations, score the interaction quality, and synchronize the draft form on the left in real time!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ],
  suggestedPrompts: [
    "I met Dr. Sharma today at Apollo Hospital and discussed Crestor. He liked it.",
    "Video call with Dr. Anjali Mehta. She requested 15 samples of Januvia.",
    "Tell me about Dr. Priya Nair's specialty and hospital.",
    "What is the meeting history for Dr. Sunil Gupta?"
  ],
  status: "idle",
};
export const chatSlice = createSlice({
  name: "chat",
  initialState: initialChatState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ sender: "user" | "assistant"; text: string; logs?: any[]; extractedData?: any }>) => {
      state.messages.push({
        id: "msg-" + Date.now(),
        sender: action.payload.sender,
        text: action.payload.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        logs: action.payload.logs,
        extractedData: action.payload.extractedData,
      });
    },
    clearChat: (state) => {
      state.messages = [initialChatState.messages[0]];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.status = "idle";
        state.messages.push({
          id: "msg-ai-" + Date.now(),
          sender: "assistant",
          text: action.payload.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          logs: action.payload.logs,
          extractedData: action.payload.extracted,
        });
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.status = "failed";
        state.messages.push({
          id: "msg-err-" + Date.now(),
          sender: "assistant",
          text: "I apologize, but I encountered an error while processing your request. Please ensure the backend server is active and try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      });
  },
});

export const { addMessage, clearChat } = chatSlice.actions;

// 4. Doctor Metadata Slice
interface DoctorState {
  doctors: Array<any>;
  hospitals: Array<any>;
  products: Array<any>;
  selectedDoctorDetails: {
    doctor: any | null;
    interactions: Array<any>;
  };
  status: "idle" | "loading" | "succeeded" | "failed";
}
const initialDoctorState: DoctorState = {
  doctors: [],
  hospitals: [],
  products: [],
  selectedDoctorDetails: {
    doctor: null,
    interactions: [],
  },
  status: "idle",
};
export const doctorSlice = createSlice({
  name: "doctor",
  initialState: initialDoctorState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHCPData.fulfilled, (state, action) => {
        state.doctors = action.payload.doctors;
        state.hospitals = action.payload.hospitals;
        state.products = action.payload.products;
        state.status = "succeeded";
      })
      .addCase(fetchDoctorDetails.fulfilled, (state, action) => {
        state.selectedDoctorDetails = action.payload;
      });
  },
});

// 5. Notifications Slice
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "success";
  read: boolean;
  time: string;
}
interface NotificationState {
  notifications: Array<Notification>;
  unreadCount: number;
}
const initialNotificationState: NotificationState = {
  notifications: [
    { id: "n1", title: "Follow-up Overdue", message: "Follow-up with Dr. Ramesh Sharma was scheduled for Jul 15th.", type: "warning", read: false, time: "1 hour ago" },
    { id: "n2", title: "New Product Campaign", message: "Glucophage educational collateral is now available.", type: "info", read: false, time: "Yesterday" }
  ],
  unreadCount: 2,
};
export const notificationSlice = createSlice({
  name: "notification",
  initialState: initialNotificationState,
  reducers: {
    markAllRead: (state) => {
      state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
    addNotification: (state, action: PayloadAction<{ title: string; message: string; type: "warning" | "info" | "success" }>) => {
      state.notifications.unshift({
        id: "notif-" + Date.now(),
        title: action.payload.title,
        message: action.payload.message,
        type: action.payload.type,
        read: false,
        time: "Just now",
      });
      state.unreadCount += 1;
    },
  },
});

export const { markAllRead, addNotification } = notificationSlice.actions;

// 6. UI Controls Slice
interface UIState {
  activeTab: "form" | "chat";
  darkMode: boolean;
  sidebarOpen: boolean;
}
const initialUIState: UIState = {
  activeTab: "form",
  darkMode: false,
  sidebarOpen: true,
};
export const uiSlice = createSlice({
  name: "ui",
  initialState: initialUIState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<"form" | "chat">) => {
      state.activeTab = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setActiveTab, toggleDarkMode, toggleSidebar } = uiSlice.actions;

// 7. Loading Slice
interface LoadingState {
  globalLoading: boolean;
  notesProcessing: boolean;
  formSubmitting: boolean;
}
const initialLoadingState: LoadingState = {
  globalLoading: false,
  notesProcessing: false,
  formSubmitting: false,
};
export const loadingSlice = createSlice({
  name: "loading",
  initialState: initialLoadingState,
  reducers: {
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processAILogWorkflow.pending, (state) => {
        state.notesProcessing = true;
      })
      .addCase(processAILogWorkflow.fulfilled, (state) => {
        state.notesProcessing = false;
      })
      .addCase(processAILogWorkflow.rejected, (state) => {
        state.notesProcessing = false;
      })
      .addCase(submitInteraction.pending, (state) => {
        state.formSubmitting = true;
      })
      .addCase(submitInteraction.fulfilled, (state) => {
        state.formSubmitting = false;
      })
      .addCase(submitInteraction.rejected, (state) => {
        state.formSubmitting = false;
      });
  },
});

export const { setGlobalLoading } = loadingSlice.actions;
