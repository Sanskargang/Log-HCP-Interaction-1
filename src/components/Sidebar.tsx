import React from "react";
import { 
  Activity, 
  Users, 
  ClipboardList, 
  BarChart3, 
  FileLock2, 
  Menu,
  Sparkles
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { toggleSidebar } from "../redux/slices";

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const menuItems = [
    { id: "log", label: "Log HCP Interaction", icon: ClipboardList },
    { id: "directory", label: "HCP Doctor Directory", icon: Users },
    { id: "history", label: "Interaction Logs", icon: Activity },
    { id: "analytics", label: "CRM Analytics", icon: BarChart3 },
    { id: "audit", label: "System Audit Logs", icon: FileLock2 },
  ];

  if (!sidebarOpen) return null;

  return (
    <aside 
      id="sidebar-container"
      className="w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0 transition-all duration-300"
    >
      {/* Brand Section */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-xs">
            C
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-800 leading-none">CORE CRM</h1>
            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5 block font-mono">Veritas</span>
          </div>
        </div>
        <button 
          id="toggle-sidebar-inner"
          onClick={() => dispatch(toggleSidebar())}
          className="p-1 hover:bg-slate-50 rounded-md text-slate-400 hover:text-slate-800 md:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              id={`nav-link-${item.id}`}
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                isActive 
                  ? "bg-blue-50 text-blue-700 font-bold" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
              {item.id === "log" && (
                <span className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-[9px] font-extrabold text-blue-700 uppercase font-mono">
                  <Sparkles className="w-2.5 h-2.5 inline text-blue-600 animate-pulse" /> AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Representative User Profile Badge */}
      {user && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{user.role}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-[9px] text-slate-500 font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>{user.region}</span>
          </div>
        </div>
      )}

      {/* Footer / Info */}
      <div className="p-4 border-t border-slate-100 text-[9px] text-slate-400 font-mono space-y-0.5 bg-slate-50/30 shrink-0">
        <p>Veeva SDK Integration v4.1</p>
        <p className="text-blue-600 font-semibold">Secure Sandbox Mode</p>
      </div>
    </aside>
  );
}
