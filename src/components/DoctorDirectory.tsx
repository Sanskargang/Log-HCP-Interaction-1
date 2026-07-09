import React, { useState } from "react";
import { 
  Users, 
  Search, 
  MapPin, 
  Mail, 
  Stethoscope, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Smile, 
  Frown, 
  Meh,
  Activity
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { setFullDraft, setActiveTab } from "../redux/slices";

export default function DoctorDirectory() {
  const dispatch = useAppDispatch();
  const { doctors, hospitals, products } = useAppSelector((state) => state.doctor);
  const { interactions } = useAppSelector((state) => state.interaction);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>("d1"); // default to first doctor

  // 1. Filter Doctors
  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.hospital.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Load Selected Doctor details
  const activeDoc = doctors.find(d => d.id === selectedDocId) || doctors[0];

  // 3. Filter Interactions for active doctor
  const docInteractions = activeDoc 
    ? interactions.filter(i => 
        i.doctor_id === activeDoc.id || 
        i.doctor_name.toLowerCase().includes(activeDoc.name.toLowerCase())
      )
    : [];

  // Calculate doctor-specific metrics
  const totalVisits = docInteractions.length;
  const lastVisited = totalVisits > 0 ? docInteractions[0].meeting_date : "Never";
  const doctorFeedbackLog = docInteractions.filter(i => i.doctor_feedback).map(i => i.doctor_feedback);

  // Auto populate helper
  const handleStartInteraction = () => {
    if (!activeDoc) return;
    dispatch(setFullDraft({
      doctor_name: activeDoc.name,
      hospital: activeDoc.hospital,
      specialization: activeDoc.specialization,
      meeting_date: new Date().toISOString().split("T")[0],
    }));
    dispatch(setActiveTab("form"));
  };

  return (
    <div id="doctor-directory-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1 & 2: Search & Master list */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-[calc(100vh-12rem)]">
        <div className="border-b border-slate-150 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-blue-600" />
            <span>HCP Doctor List ({filteredDoctors.length})</span>
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Select a doctor to inspect historical interactions.</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="directory-search-input"
            type="text"
            placeholder="Search by name, hospital, specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
          />
        </div>

        {/* Doctor scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-mono">No doctors match your query</div>
          ) : (
            filteredDoctors.map(doc => {
              const isActive = doc.id === selectedDocId;
              return (
                <button
                  id={`doc-item-${doc.id}`}
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    isActive 
                      ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold" 
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold leading-tight truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{doc.specialization}</p>
                    <p className="text-[9px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{doc.hospital.split(",")[0]}</span>
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-500" : "text-slate-300"}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Column 3: Detail view */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col h-[calc(100vh-12rem)] overflow-y-auto">
        {activeDoc ? (
          <div id="doctor-details-panel" className="space-y-6">
            {/* Header / Profile card */}
            <div className="border-b border-slate-100 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center font-bold text-blue-600 text-xl shadow-xs">
                    {activeDoc.name.replace("Dr. ", "").charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{activeDoc.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600">
                        <Stethoscope className="w-3.5 h-3.5" /> {activeDoc.specialization}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {activeDoc.hospital}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id="directory-start-log-btn"
                  onClick={handleStartInteraction}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-center"
                >
                  <span>Sync & Log Interaction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-600 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email: <strong className="text-slate-800">{activeDoc.email}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span>Interaction Frequency: <strong className="text-slate-800">Monthly recommended</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Total logged visits</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{totalVisits}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Last Visited</span>
                <p className="text-xs font-semibold text-slate-800 mt-1 truncate">{lastVisited}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Relationship score</span>
                <p className="text-xs font-bold text-emerald-600 mt-1">Excellent (A+)</p>
              </div>
            </div>

            {/* Engagement Timeline */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Engagement Logs</h3>
              {docInteractions.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono py-6">No previous interactions logged in system for this HCP.</p>
              ) : (
                <div className="space-y-3">
                  {docInteractions.map((item, idx) => (
                    <div key={idx} className="border border-slate-150 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="text-[10px] font-bold text-blue-600 font-mono uppercase">{item.meeting_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.meeting_date}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-normal"><strong className="text-slate-800">Summary: </strong>{item.summary}</p>
                      
                      {item.doctor_feedback && (
                        <p className="text-xs text-slate-500 italic mt-2">Feedback: "{item.doctor_feedback}"</p>
                      )}

                      {item.products && item.products.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.products.map((p: string, pIdx: number) => (
                            <span key={pIdx} className="bg-slate-200/50 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-mono font-medium">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Feedback Log */}
            {doctorFeedbackLog.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Clinical Opinions & Prescribing Feedback</h3>
                <div className="space-y-2 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  {doctorFeedbackLog.map((fb, idx) => (
                    <div key={idx} className="flex gap-2 text-xs text-slate-600 border-b border-slate-100/60 pb-2 last:border-0 last:pb-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <p className="italic">"{fb}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
            <Users className="w-12 h-12 mb-2 text-slate-200" />
            <p className="text-xs font-mono">Select a doctor to review history and log interactions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
