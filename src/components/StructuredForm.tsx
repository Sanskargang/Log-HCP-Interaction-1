import React, { useState, useEffect } from "react";
import { 
  Save, 
  Send, 
  MapPin, 
  Stethoscope, 
  Sparkles, 
  Paperclip, 
  X, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { 
  updateDraftField, 
  submitInteraction, 
  resetDraft, 
  processAILogWorkflow,
  addNotification,
  clearHighlights
} from "../redux/slices";

interface StructuredFormProps {
  onSuccess: () => void;
}

export default function StructuredForm({ onSuccess }: StructuredFormProps) {
  const dispatch = useAppDispatch();
  const { currentDraft, validationErrors, aiProcessing, highlightedFields } = useAppSelector((state) => state.interaction);
  const { doctors, hospitals, products } = useAppSelector((state) => state.doctor);

  // Clear highlighted fields after 4 seconds
  useEffect(() => {
    if (highlightedFields && highlightedFields.length > 0) {
      const timer = setTimeout(() => {
        dispatch(clearHighlights());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightedFields, dispatch]);

  const getHighlightClass = (field: string) => {
    return highlightedFields?.includes(field)
      ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50/15 animate-pulse"
      : "border-slate-200 bg-slate-50";
  };

  const renderHighlightBadge = (field: string) => {
    if (highlightedFields?.includes(field)) {
      return (
        <span className="ml-2 inline-flex items-center text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
          AI Updated
        </span>
      );
    }
    return null;
  };

  // Local UI state
  const [docSuggestions, setDocSuggestions] = useState<any[]>([]);
  const [hospSuggestions, setHospSuggestions] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  // Synced Form Fields
  const handleChange = (field: string, value: any) => {
    dispatch(updateDraftField({ field, value }));
  };

  // Autocomplete Doctor Input
  const handleDoctorInput = (val: string) => {
    handleChange("doctor_name", val);
    if (val.length > 1) {
      const filtered = doctors.filter(d => d.name.toLowerCase().includes(val.toLowerCase()));
      setDocSuggestions(filtered);
    } else {
      setDocSuggestions([]);
    }
  };

  const selectDoctor = (doc: any) => {
    handleChange("doctor_name", doc.name);
    handleChange("hospital", doc.hospital);
    handleChange("specialization", doc.specialization);
    setDocSuggestions([]);
  };

  // Autocomplete Hospital Input
  const handleHospitalInput = (val: string) => {
    handleChange("hospital", val);
    if (val.length > 1) {
      const filtered = hospitals.filter(h => h.name.toLowerCase().includes(val.toLowerCase()));
      setHospSuggestions(filtered);
    } else {
      setHospSuggestions([]);
    }
  };

  const selectHospital = (hosp: any) => {
    handleChange("hospital", hosp.name);
    setHospSuggestions([]);
  };

  // Toggle products
  const handleProductToggle = (prodName: string) => {
    const currentProds = currentDraft.products || [];
    if (currentProds.includes(prodName)) {
      handleChange("products", currentProds.filter(p => p !== prodName));
    } else {
      handleChange("products", [...currentProds, prodName]);
    }
  };

  // Save Draft (Local saving simulation with notifications)
  const handleSaveDraft = async () => {
    try {
      await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentDraft)
      });
      dispatch(addNotification({
        title: "Draft Saved",
        message: `Draft interaction with ${currentDraft.doctor_name || "Doctor"} has been successfully synchronized on server.`,
        type: "success"
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Submit form to Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus({ loading: true, error: null });

    if (!currentDraft.doctor_name || !currentDraft.hospital) {
      setSubmitStatus({ loading: false, error: "Doctor Name and Hospital are required fields." });
      return;
    }

    try {
      const resultAction = await dispatch(submitInteraction(currentDraft));
      if (submitInteraction.fulfilled.match(resultAction)) {
        dispatch(addNotification({
          title: "Interaction Logged",
          message: `Successfully logged medical interaction with ${currentDraft.doctor_name} in CRM database.`,
          type: "success"
        }));
        dispatch(resetDraft());
        setAttachedFiles([]);
        onSuccess();
      } else {
        setSubmitStatus({ loading: false, error: (resultAction.payload as string) || "Failed to submit interaction." });
      }
    } catch (err: any) {
      setSubmitStatus({ loading: false, error: err.message || "An error occurred." });
    } finally {
      setSubmitStatus({ loading: false, error: null });
    }
  };

  // Drag and Drop File Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const list = Array.from(e.dataTransfer.files as any as File[]).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...list]);
    }
  };

  const triggerFileInput = () => {
    const el = document.getElementById("file-loader-input");
    if (el) el.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const list = Array.from(e.target.files as any as File[]).map(f => f.name);
      setAttachedFiles(prev => [...prev, ...list]);
    }
  };

  const removeFile = (name: string) => {
    setAttachedFiles(prev => prev.filter(f => f !== name));
  };

  return (
    <form id="structured-log-form" onSubmit={handleSubmit} className="space-y-6">
      {submitStatus.error && (
        <div id="form-error-alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{submitStatus.error}</span>
        </div>
      )}

      {/* Synchronized state indicator banner */}
      <div className="bg-blue-50 border border-blue-100/80 rounded-lg p-3 text-xs flex items-center justify-between text-blue-800">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>Form is synchronized in real-time with your AI Chat Assistant.</span>
        </div>
        <button
          id="clear-form-draft-btn"
          type="button"
          onClick={() => dispatch(resetDraft())}
          className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
        >
          Reset Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Doctor Name with Autocomplete */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Doctor Name</span> <span className="text-rose-500 ml-0.5">*</span>
            {renderHighlightBadge("doctor_name")}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Stethoscope className="w-4 h-4" />
            </span>
            <input
              id="form-doctor-name"
              type="text"
              required
              placeholder="e.g. Dr. Ramesh Sharma"
              value={currentDraft.doctor_name || ""}
              onChange={(e) => handleDoctorInput(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("doctor_name")}`}
            />
          </div>
          {/* Autocomplete Suggestions */}
          {docSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto py-1 divide-y divide-slate-50">
              {docSuggestions.map(doc => (
                <button
                  id={`suggest-doc-${doc.id}`}
                  key={doc.id}
                  type="button"
                  onClick={() => selectDoctor(doc)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{doc.name}</p>
                    <p className="text-[10px] text-slate-400">{doc.specialization} • {doc.hospital}</p>
                  </div>
                  <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase font-bold">CRM Match</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hospital with Autocomplete */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Hospital / Institution</span> <span className="text-rose-500 ml-0.5">*</span>
            {renderHighlightBadge("hospital")}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              id="form-hospital"
              type="text"
              required
              placeholder="e.g. Apollo Hospital"
              value={currentDraft.hospital || ""}
              onChange={(e) => handleHospitalInput(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("hospital")}`}
            />
          </div>
          {/* Autocomplete Suggestions */}
          {hospSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto py-1">
              {hospSuggestions.map(h => (
                <button
                  id={`suggest-hosp-${h.id}`}
                  key={h.id}
                  type="button"
                  onClick={() => selectHospital(h)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50"
                >
                  <p className="font-semibold text-slate-900">{h.name}</p>
                  <p className="text-[10px] text-slate-400">{h.location}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Specialization */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Doctor Specialization</span>
            {renderHighlightBadge("specialization")}
          </label>
          <input
            id="form-specialization"
            type="text"
            placeholder="e.g. Cardiology"
            value={currentDraft.specialization || ""}
            onChange={(e) => handleChange("specialization", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("specialization")}`}
          />
        </div>

        {/* Meeting Type */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Meeting Type</span>
            {renderHighlightBadge("meeting_type")}
          </label>
          <select
            id="form-meeting-type"
            value={currentDraft.meeting_type || "Face to Face"}
            onChange={(e) => handleChange("meeting_type", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("meeting_type")}`}
          >
            <option value="Face to Face">Face to Face</option>
            <option value="Phone">Phone</option>
            <option value="Video Call">Video Call</option>
            <option value="Conference">Conference</option>
          </select>
        </div>

        {/* Interaction Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Interaction Date</span>
            {renderHighlightBadge("meeting_date")}
          </label>
          <input
            id="form-meeting-date"
            type="date"
            value={currentDraft.meeting_date || ""}
            onChange={(e) => handleChange("meeting_date", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 font-mono transition-all ${getHighlightClass("meeting_date")}`}
          />
        </div>

        {/* Interaction Time */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Meeting Time</span>
            {renderHighlightBadge("meeting_time")}
          </label>
          <input
            id="form-meeting-time"
            type="text"
            placeholder="e.g. 11:15 AM"
            value={currentDraft.meeting_time || ""}
            onChange={(e) => handleChange("meeting_time", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 font-mono transition-all ${getHighlightClass("meeting_time")}`}
          />
        </div>
      </div>

      {/* Products Discussed (Multi Select Checkboxes) */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
          <span>Products Discussed (Multi-Select)</span>
          {renderHighlightBadge("products")}
        </label>
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 rounded-xl border transition-all ${
          highlightedFields?.includes("products") 
            ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50/10 animate-pulse" 
            : "bg-slate-50 border-slate-200"
        }`}>
          {products.map(prod => {
            const isChecked = (currentDraft.products || []).includes(prod.name);
            return (
              <label 
                id={`label-product-${prod.id}`}
                key={prod.id} 
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                  isChecked 
                    ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  id={`product-checkbox-${prod.id}`}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleProductToggle(prod.name)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <div className="overflow-hidden">
                  <p className="truncate leading-none">{prod.name.split(" ")[0]}</p>
                  <span className="text-[9px] text-slate-400 font-mono leading-none">{prod.indication}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Samples Given Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Samples Given (Pack Count)</span>
            {renderHighlightBadge("samples_given")}
          </label>
          <input
            id="form-samples-given"
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={currentDraft.samples_given || ""}
            onChange={(e) => handleChange("samples_given", parseInt(e.target.value, 10) || 0)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("samples_given")}`}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Priority Flag</span>
            {renderHighlightBadge("priority")}
          </label>
          <div className={`flex gap-4 py-2 px-3 rounded-lg border transition-all ${
            highlightedFields?.includes("priority") 
              ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50/10 animate-pulse" 
              : "border-transparent"
          }`}>
            {["High", "Medium", "Low"].map((level) => (
              <label 
                id={`priority-radio-label-${level}`}
                key={level} 
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                <input
                  id={`priority-radio-${level}`}
                  type="radio"
                  name="priority"
                  value={level}
                  checked={currentDraft.priority === level}
                  onChange={() => handleChange("priority", level)}
                  className="text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Textareas: Competitor, Feedback, Representative Notes */}
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Competitor Mentioned</span>
            {renderHighlightBadge("competitor_mentioned")}
          </label>
          <textarea
            id="form-competitor-mentioned"
            rows={2}
            placeholder="Type any competitors mentioned by the HCP or pricing concerns..."
            value={currentDraft.competitor_mentioned || ""}
            onChange={(e) => handleChange("competitor_mentioned", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("competitor_mentioned")}`}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Doctor Feedback</span>
            {renderHighlightBadge("doctor_feedback")}
          </label>
          <textarea
            id="form-doctor-feedback"
            rows={2}
            placeholder="Feedback given by the doctor on patient profiles or clinical safety data..."
            value={currentDraft.doctor_feedback || ""}
            onChange={(e) => handleChange("doctor_feedback", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("doctor_feedback")}`}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <span>Representative Summary / Notes</span>
            {renderHighlightBadge("representative_notes")}
          </label>
          <textarea
            id="form-representative-notes"
            rows={3}
            placeholder="Enter clinical detailing summaries, meeting notes, action logs, or discussion outcomes..."
            value={currentDraft.representative_notes || ""}
            onChange={(e) => handleChange("representative_notes", e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 transition-all ${getHighlightClass("representative_notes")}`}
          />
        </div>
      </div>

      {/* Follow-up Date */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
          <span>Follow-Up Date</span>
          {renderHighlightBadge("follow_up_date")}
        </label>
        <input
          id="form-follow-up-date"
          type="date"
          value={currentDraft.follow_up_date || ""}
          onChange={(e) => handleChange("follow_up_date", e.target.value)}
          className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 font-mono transition-all ${getHighlightClass("follow_up_date")}`}
        />
      </div>

      {/* Attachments Section (Drag and Drop) */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attachments & Clinical Collaterals</label>
        <div 
          id="drag-drop-zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer select-none transition-all ${
            dragActive 
              ? "border-blue-600 bg-blue-50 text-blue-800" 
              : "border-slate-200 bg-slate-50 hover:bg-slate-100/50 text-slate-500"
          }`}
        >
          <input
            id="file-loader-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Paperclip className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">Drag & Drop clinical notes or handouts here</p>
          <p className="text-[10px] text-slate-400 mt-1">or click to upload files from your system</p>
        </div>

        {/* Attached Files List */}
        {attachedFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-100 rounded-lg border border-slate-200/60 text-xs">
                <span className="truncate font-medium text-slate-700">{file}</span>
                <button
                  id={`remove-file-${index}`}
                  type="button"
                  onClick={() => removeFile(file)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Controls */}
      <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
        <button
          id="form-save-draft-btn"
          type="button"
          onClick={handleSaveDraft}
          className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Draft on Server</span>
        </button>

        <button
          id="form-submit-interaction-btn"
          type="submit"
          disabled={submitStatus.loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
        >
          <Send className="w-4 h-4" />
          <span>{submitStatus.loading ? "Logging..." : "Log Interaction in CRM"}</span>
        </button>
      </div>
    </form>
  );
}
