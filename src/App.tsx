import React, { useState, useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "./redux/store";
import { 
  fetchHCPData, 
  fetchInteractionsHistory, 
  setActiveTab, 
  toggleDarkMode,
  addNotification
} from "./redux/slices";

// Component imports
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StructuredForm from "./components/StructuredForm";
import AIChatInterface from "./components/AIChatInterface";
import LangGraphVisualizer from "./components/LangGraphVisualizer";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DoctorDirectory from "./components/DoctorDirectory";

// Lucide Icons
import { 
  Sparkles, 
  BookOpen, 
  Database, 
  FileText, 
  FileLock, 
  History, 
  ShieldAlert, 
  X,
  MessageSquareCode,
  FileCode,
  Activity,
  HeartPulse,
  HeartHandshake,
  TrendingUp,
  Cpu,
  BadgeCheck,
  Network
} from "lucide-react";

function AppContent() {
  const dispatch = useAppDispatch();
  const { activeTab } = useAppSelector((state) => state.ui);
  const { interactions, agentLogs, validationErrors, aiProcessing } = useAppSelector((state) => state.interaction);
  const { doctors } = useAppSelector((state) => state.doctor);
  const { user } = useAppSelector((state) => state.auth);

  const [currentView, setView] = useState("log");
  const [showDocsDrawer, setShowDocsDrawer] = useState(false);
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState(false);
  const [systemAuditLogs, setSystemAuditLogs] = useState<any[]>([]);

  // Automatically open the workflow drawer when the LangGraph pipeline is triggered (aiProcessing turns true)
  useEffect(() => {
    if (aiProcessing) {
      setShowWorkflowDrawer(true);
    }
  }, [aiProcessing]);

  // Fetch initial data from Express backend
  useEffect(() => {
    dispatch(fetchHCPData());
    dispatch(fetchInteractionsHistory());
    
    // Load backend audit logs for the audit log tab
    fetch("/api/audit-logs")
      .then(r => r.json())
      .then(data => {
        if (data.success) setSystemAuditLogs(data.logs);
      })
      .catch(err => console.error("Error loading audit logs:", err));
  }, [dispatch, currentView]);

  // Handle successful form log
  const handleInteractionLogged = () => {
    dispatch(fetchInteractionsHistory());
    // Fetch updated audit logs
    fetch("/api/audit-logs")
      .then(r => r.json())
      .then(data => {
        if (data.success) setSystemAuditLogs(data.logs);
      });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Sidebar navigation */}
      <Sidebar currentView={currentView} setView={(v) => { setView(v); setShowDocsDrawer(false); }} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <Header currentView={currentView} />

        {/* Content View Router */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === "log" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Screen Title Block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Log HCP Interaction</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Record meetings with Healthcare Professionals (Doctors) using the traditional structured form or Veritas AI voice/text copilot.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* AI Agent Workflow Button */}
                  <button
                    id="toggle-workflow-drawer-btn"
                    onClick={() => setShowWorkflowDrawer(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all relative overflow-hidden"
                  >
                    {aiProcessing ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    ) : (
                      <Cpu className="w-4 h-4 text-indigo-200" />
                    )}
                    <span>AI Agent Workflow</span>
                    {validationErrors.length > 0 && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"></span>
                    )}
                  </button>

                  {/* Technical Docs Panel toggle button */}
                  <button
                    id="toggle-technical-docs-btn"
                    onClick={() => setShowDocsDrawer(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Technical Blueprint Docs</span>
                  </button>
                </div>
              </div>

              {/* Centered Workspace for Interaction Logging */}
              <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 gap-1 select-none">
                  <button
                    id="tab-structured-form-trigger"
                    onClick={() => dispatch(setActiveTab("form"))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
                      activeTab === "form"
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/40"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Traditional Structured Form</span>
                  </button>
                  <button
                    id="tab-ai-chat-trigger"
                    onClick={() => dispatch(setActiveTab("chat"))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 relative ${
                      activeTab === "chat"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/40"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>AI Assistant Chat</span>
                    <span className="absolute -top-1 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === "form" ? (
                    <StructuredForm onSuccess={handleInteractionLogged} />
                  ) : (
                    <AIChatInterface />
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === "directory" && (
            <div className="max-w-7xl mx-auto">
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Healthcare Professionals Directory</h1>
                <p className="text-xs text-slate-500 mt-1">Review pre-seeded doctor profiles, email databases, and chronological visit compliance statistics.</p>
              </div>
              <DoctorDirectory />
            </div>
          )}

          {currentView === "history" && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Interaction History logs</h1>
                <p className="text-xs text-slate-500 mt-1">Audit log of all logged pharmaceutical interactions and medical summaries.</p>
              </div>

              {/* Grid of Interactions */}
              {interactions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 font-mono">
                  No interactions logged in CRM database yet. Log some to view history!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interactions.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 leading-tight">{item.doctor_name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono uppercase">{item.specialization} • {item.hospital}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold uppercase font-mono">{item.meeting_type}</span>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <p className="text-slate-700 leading-relaxed"><strong className="text-slate-800 font-semibold">Summary:</strong> {item.summary}</p>
                        {item.products && item.products.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.products.map((p: string, pIdx: number) => (
                              <span key={pIdx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-mono font-medium">{p}</span>
                            ))}
                          </div>
                        )}
                        {item.action_items && item.action_items.length > 0 && (
                          <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Action Items</span>
                            <ul className="list-disc pl-4 text-slate-600 text-[11px] mt-1 space-y-0.5">
                              {item.action_items.map((act: string, aIdx: number) => (
                                <li key={aIdx}>{act}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-3 pt-3 border-t border-slate-50">
                          <span>Quality Rating: <strong>{item.quality_score || 80}/100</strong></span>
                          <span>{item.meeting_date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === "analytics" && (
            <div className="max-w-7xl mx-auto">
              <AnalyticsDashboard />
            </div>
          )}

          {currentView === "audit" && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">System Activity Audit Trail</h1>
                <p className="text-xs text-slate-500 mt-1">Security logs of database triggers, agent process cycles, and login sessions.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Action Type</span>
                  <span>Details</span>
                  <span>Timestamp</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {systemAuditLogs.map((log) => (
                    <div key={log.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          log.action.includes("CREATE") ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                          log.action.includes("UPDATE") ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-blue-50 text-blue-700 border border-blue-150"
                        }`}>
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-700 font-mono">API SECURE GATEWAY</span>
                      </div>
                      <span className="text-slate-600 max-w-xl truncate">{log.details}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* LANGGRAPH AGENT WORKFLOW DRAWER */}
      {showWorkflowDrawer && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 text-slate-200 h-full p-6 shadow-2xl flex flex-col relative border-l border-slate-800">
            <LangGraphVisualizer 
              logs={agentLogs} 
              isProcessing={aiProcessing} 
              validationErrors={validationErrors} 
              onClose={() => setShowWorkflowDrawer(false)}
            />
          </div>
        </div>
      )}

      {/* TECHNICAL DOCUMENTATION DRAWERS (SIDE BLUEPRINT OVERLAY) */}
      {showDocsDrawer && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 text-slate-200 h-full p-6 overflow-y-auto shadow-2xl flex flex-col relative border-l border-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Enterprise Technical Blueprint</h2>
                  <p className="text-[10px] text-slate-400 font-mono">Life Sciences HCP CRM Module Architecture</p>
                </div>
              </div>
              <button 
                id="close-technical-docs-btn"
                onClick={() => setShowDocsDrawer(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Docs */}
            <div className="space-y-6 text-xs text-slate-300 leading-relaxed overflow-y-auto flex-1 pr-1 font-sans">
              
              {/* Introduction */}
              <div>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mb-2">1. System Topology Overview</h3>
                <p>
                  This enterprise application demonstrates a full-stack, compliance-optimized AI-First CRM portal focused on Healthcare Professionals (HCPs) and interaction loggers. It combines traditional structured logging with advanced server-side Gemini Multi-Agent processing resembling a LangGraph state-transition engine.
                </p>
              </div>

              {/* LangGraph Architecture */}
              <div>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mb-2 flex items-center gap-1.5">
                  <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                  <span>2. Node-Based Workflow Agent (LangGraph Simulator)</span>
                </h3>
                <p className="mb-3">
                  Rather than making single unguided LLM queries, our server backend executes a modular multi-agent workflow in sequential nodes, tracing input context and updating state transitions dynamically:
                </p>
                <div className="space-y-3 bg-slate-950/60 border border-slate-850 p-4 rounded-xl font-mono text-[11px] leading-normal">
                  <div className="text-blue-400">Node 1: Intent Detection Agent (Gemma-9B)</div>
                  <div className="pl-4 text-slate-400">→ Evaluates natural text. Determines if user is trying to log a meeting, query data, or set follow-ups.</div>
                  
                  <div className="text-indigo-400">Node 2: Information Extraction Agent (Med-Extract)</div>
                  <div className="pl-4 text-slate-400">→ Parses specific pharmaceutical fields: Doctor, specialty, product, samples distributed, and feedback.</div>
                  
                  <div className="text-violet-400">Node 3: CRM Compliance Validation Node</div>
                  <div className="pl-4 text-slate-400">→ Checks database constraints. Raises human-in-the-loop triggers if required values are missing.</div>

                  <div className="text-purple-400">Node 4: Medical Summary & Intelligence Agent</div>
                  <div className="pl-4 text-slate-400">→ Computes sentiment, performance quality rating out of 100, and lists clinical next best action items.</div>

                  <div className="text-emerald-400">Node 5: SQL Database Formatter Node</div>
                  <div className="pl-4 text-slate-400 font-sans text-[11px] leading-relaxed">→ Formats the extracted fields into a SQL-ready JSON schema package matching enterprise DB declarations.</div>
                </div>
              </div>

              {/* Database Schema */}
              <div>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mb-2 flex items-center gap-1.5">
                  <Database className="w-4.5 h-4.5 text-blue-400" />
                  <span>3. Relational SQL Database Schema (PostgreSQL/MySQL)</span>
                </h3>
                <p className="mb-2">This SQL schema maps out the target PostgreSQL/MySQL tables required for the Veeva CRM extension:</p>
                <pre className="bg-slate-950 p-3.5 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto leading-tight">
{`-- SQL Database Schema for Life Sciences CRM
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Sales Representative',
    region VARCHAR(100) DEFAULT 'North Region',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hospital VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    indication VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id),
    doctor_name VARCHAR(255) NOT NULL,
    hospital VARCHAR(255) NOT NULL,
    specialization VARCHAR(100),
    meeting_date DATE NOT NULL,
    meeting_time TIME DEFAULT '12:00:00',
    meeting_type VARCHAR(50) DEFAULT 'Face to Face',
    samples_given INT DEFAULT 0,
    competitor_mentioned TEXT,
    doctor_feedback TEXT,
    representative_notes TEXT,
    follow_up_date DATE,
    priority VARCHAR(10) DEFAULT 'Medium',
    summary TEXT,
    sentiment VARCHAR(20) DEFAULT 'Neutral',
    quality_score INT DEFAULT 80,
    confidence INT DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interaction_products (
    id SERIAL PRIMARY KEY,
    interaction_id INT REFERENCES interactions(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    details TEXT
);`}
                </pre>
              </div>

              {/* FastAPI Implementation Guide */}
              <div>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-amber-400" />
                  <span>4. Python FastAPI Backend Blueprint</span>
                </h3>
                <p className="mb-2">Here is the FastAPI implementation pattern to run in Python environments using Pydantic schemas and LangGraph-Python SDK:</p>
                <pre className="bg-slate-950 p-3.5 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto leading-tight">
{`from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, time

app = FastAPI(title="CRM HCP API Gateway", version="4.1")

# Pydantic Schemas
class InteractionPayload(BaseModel):
    doctor_name: str
    hospital: str
    meeting_date: date
    meeting_type: str
    products: List[str]
    doctor_feedback: Optional[str] = None
    samples_given: int = 0
    follow_up_date: Optional[date] = None
    priority: str = "Medium"
    summary: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    confidence: int = 95

# Endpoint implementations
@app.get("/hcp")
async def get_all_hcps():
    return {"success": True, "doctors": []}

@app.post("/interactions")
async def create_interaction(payload: InteractionPayload):
    # Node logic triggered here...
    return {"success": True, "message": "Logged successfully"}

@app.post("/langgraph/process")
async def run_langgraph_pipeline(notes: str):
    # Invokes compiled LangGraph workflows: StateGraph(WorkflowState)
    return {"success": True, "extracted": {}}`}
                </pre>
              </div>

              {/* Deployment instructions */}
              <div>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-1 mb-2">5. Deployment Guide</h3>
                <ol className="list-decimal pl-4 space-y-2 text-slate-400">
                  <li><strong>Environment Secrets</strong>: Define <code className="text-white">GEMINI_API_KEY</code> in your environment variables. No public SDK keys are ever exposed in Vite bundles.</li>
                  <li><strong>Containerization</strong>: Build using Docker. The multi-stage build bundles React files inside the Express static server directory and launches the application via <code className="text-white">npm run build</code>.</li>
                  <li><strong>Database Integration</strong>: Wire standard Drizzle ORM or SQLAlchemy connection pools inside your Node/Python server models to persist interaction streams.</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 pt-4 mt-6 text-center text-[10px] text-slate-500 font-mono">
              Designed & Compiled by Senior AI Software Architect.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
