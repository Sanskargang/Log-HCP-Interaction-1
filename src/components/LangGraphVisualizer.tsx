import React from "react";
import { 
  Cpu, 
  SearchCode, 
  BrainCircuit, 
  BadgeCheck, 
  Database,
  ArrowDownCircle,
  Play,
  RotateCcw,
  Network,
  X
} from "lucide-react";

interface AgentLog {
  node: string;
  description: string;
  timestamp: string;
  output: any;
}

interface LangGraphVisualizerProps {
  logs: AgentLog[];
  isProcessing: boolean;
  validationErrors?: string[];
  onRetry?: () => void;
  onClose?: () => void;
}

export default function LangGraphVisualizer({ logs, isProcessing, validationErrors = [], onRetry, onClose }: LangGraphVisualizerProps) {
  // Definition of the nodes in our LangGraph pipeline
  const pipelineNodes = [
    { id: "Intent Detection Agent", icon: SearchCode, label: "Intent Detector", color: "blue" },
    { id: "Information Extraction Agent", icon: BrainCircuit, label: "Med-Extract Agent", color: "indigo" },
    { id: "CRM Validation Agent", icon: BadgeCheck, label: "Compliance Validator", color: "violet" },
    { id: "Intelligence Generator Agent", icon: Cpu, label: "Medical Intelligence", color: "purple" },
    { id: "Database Formatter Agent", icon: Database, label: "SQL Formatter Node", color: "emerald" }
  ];

  // Helper to get status of a node
  const getNodeStatus = (nodeName: string) => {
    if (isProcessing) {
      // Find index of last logged node
      const lastIndex = logs.findIndex(l => l.node === nodeName);
      if (lastIndex !== -1) return "completed";
      // Simple fallback animation
      return "processing";
    }
    const logIndex = logs.findIndex(l => l.node === nodeName);
    if (logIndex !== -1) {
      if (nodeName === "CRM Validation Agent" && validationErrors.length > 0) {
        return "failed";
      }
      return "completed";
    }
    return "idle";
  };

  return (
    <div 
      id="langgraph-visualizer-container"
      className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-lg overflow-hidden flex flex-col h-full"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">LangGraph Agent Workflow</h3>
            <p className="text-[10px] text-slate-400 font-mono">Workflow Status: {isProcessing ? "Running pipeline..." : logs.length > 0 ? "Execution Completed" : "Idle"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && onRetry && (
            <button
              id="visualizer-retry-btn"
              onClick={onRetry}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Agent</span>
            </button>
          )}
          {onClose && (
            <button
              id="visualizer-close-drawer-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Close Panel"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Graph Diagram */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800/40 mb-4 overflow-x-auto">
        {pipelineNodes.map((node, index) => {
          const NodeIcon = node.icon;
          const status = getNodeStatus(node.id);
          
          let borderStyle = "border-slate-800 bg-slate-900 text-slate-500";
          let glowStyle = "";
          
          if (status === "completed") {
            borderStyle = "border-emerald-500/80 bg-emerald-950/25 text-emerald-400";
          } else if (status === "failed") {
            borderStyle = "border-rose-500/80 bg-rose-950/25 text-rose-400";
          } else if (status === "processing") {
            borderStyle = "border-blue-500 bg-slate-900 text-blue-400";
            glowStyle = "animate-pulse ring-2 ring-blue-500/30";
          }

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div 
                id={`graph-node-${node.id.replace(/\s+/g, '-')}`}
                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all duration-300 min-w-[100px] flex-1 ${borderStyle} ${glowStyle}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                  status === "completed" ? "bg-emerald-500/20" : status === "failed" ? "bg-rose-500/20" : "bg-slate-800"
                }`}>
                  <NodeIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold leading-tight">{node.label}</span>
                <span className="text-[8px] font-mono mt-1 opacity-70 uppercase tracking-wider">
                  {status === "completed" ? "Completed" : status === "failed" ? "Correction" : status === "processing" ? "Active" : "Idle"}
                </span>
              </div>

              {/* Connector Arrow */}
              {index < pipelineNodes.length - 1 && (
                <div className="hidden md:flex items-center justify-center text-slate-700 shrink-0 select-none">
                  <Play className="w-3.5 h-3.5 fill-current text-slate-800" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Human-in-the-Loop Validation Warnings */}
      {validationErrors.length > 0 && (
        <div 
          id="visualizer-validation-warnings"
          className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-lg text-xs mb-4 flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>Human Correction Required</span>
          </div>
          <p className="text-[11px] text-rose-300">
            The Agent identified missing CRM compliance requirements: 
            <strong className="text-white ml-1">{validationErrors.join(", ")}</strong>.
          </p>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Prompt: Fill these fields directly on the form or mention them in the AI Chat.</span>
        </div>
      )}

      {/* Execution Logs */}
      <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Detailed Node Logs</h4>
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-600 font-mono text-xs">
            <ArrowDownCircle className="w-6 h-6 mb-2 animate-bounce text-slate-700" />
            <p>Ready to trace agent execution...</p>
            <p className="text-[10px] text-slate-700 mt-1">Submit natural language meeting logs on either tab to boot the pipeline.</p>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              id={`log-item-${idx}`}
              key={idx} 
              className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 hover:bg-slate-950/85 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 mb-2 text-[10px]">
                <span className="font-bold text-blue-400 font-mono">{log.node}</span>
                <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal mb-2">{log.description}</p>
              
              {/* Output Object Inspector */}
              <div className="bg-slate-900 border border-slate-850 p-2 rounded-md overflow-x-auto max-h-32">
                <pre className="text-[10px] text-slate-400 font-mono leading-tight">
                  {JSON.stringify(log.output, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
