import React, { useState } from "react";
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  ChevronRight, 
  Menu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { toggleSidebar, markAllRead, logoutUser } from "../redux/slices";

interface HeaderProps {
  currentView: string;
}

export default function Header({ currentView }: HeaderProps) {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { notifications, unreadCount } = useAppSelector((state) => state.notification);
  const { user } = useAppSelector((state) => state.auth);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Map view IDs to clean names
  const viewNames: Record<string, string> = {
    log: "Log HCP Interaction",
    directory: "HCP Doctor Directory",
    history: "Interaction Logs",
    analytics: "CRM Analytics Dashboard",
    audit: "System Audit Logs"
  };

  const currentViewName = viewNames[currentView] || "Log HCP Interaction";

  return (
    <header 
      id="header-bar"
      className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 relative z-10 shadow-xs"
    >
      {/* Left side: Hamburger and Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          id="toggle-sidebar-button"
          onClick={() => dispatch(toggleSidebar())}
          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 font-black">
          <span>CRM</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span>Interactions</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-blue-600 font-bold">{currentViewName}</span>
        </div>
      </div>

      {/* Right side: Search, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Search Box */}
        <div className="relative hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="global-search-input"
            type="search"
            placeholder="Search HCPs, products..."
            className="w-64 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-xs focus:border-blue-500 focus:outline-none transition-all text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            id="notification-bell"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div 
              id="notifications-dropdown"
              className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 text-xs text-slate-700 font-normal z-20"
            >
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-900">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button
                    id="mark-all-read-btn"
                    onClick={() => {
                      dispatch(markAllRead());
                    }}
                    className="text-[10px] text-blue-600 font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-3 hover:bg-slate-50 transition-colors ${notif.read ? "opacity-75" : "bg-slate-50/40"}`}>
                    <div className="flex gap-2">
                      {notif.type === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{notif.title}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{notif.message}</p>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 inline-block">{notif.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            id="profile-dropdown-trigger"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded-lg transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white text-slate-700 font-bold text-xs flex items-center justify-center shadow-sm">
              {user ? user.name.charAt(0) : "U"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user ? user.name : "Guest"}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Field Agent</p>
            </div>
          </button>

          {/* Profile Menu Dropdown */}
          {profileOpen && (
            <div 
              id="profile-dropdown-menu"
              className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 text-xs">{user?.name || "Field Rep"}</p>
                <p className="text-slate-400 text-[10px] truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <div className="flex items-center gap-2 px-3 py-1.5 text-slate-600 text-[11px] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Compliance level: 100%</span>
                </div>
              </div>
              <div className="border-t border-slate-100 p-1">
                <button
                  id="profile-logout-btn"
                  onClick={() => {
                    dispatch(logoutUser());
                  }}
                  className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
