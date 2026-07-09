import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  BrainCircuit, 
  FileText, 
  Upload, 
  CheckCircle, 
  Network,
  RotateCcw
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { sendChatMessage, addMessage, clearChat, setFullDraft, addNotification } from "../redux/slices";

export default function AIChatInterface() {
  const dispatch = useAppDispatch();
  const { messages, suggestedPrompts, status } = useAppSelector((state) => state.chat);

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Handle message sending
  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    dispatch(addMessage({ sender: "user", text: textToSend }));
    setInput("");

    // Create history context for LLM
    const historyPayload = messages.map(msg => ({
      role: msg.sender === "user" ? "user" : "model",
      text: msg.text
    }));

    // Trigger full-stack LangGraph processing route
    const resultAction = await dispatch(sendChatMessage({ message: textToSend, history: historyPayload }));

    if (sendChatMessage.fulfilled.match(resultAction)) {
      const data = resultAction.payload;
      // If AI extracted structured fields, synchronize them with our current Draft!
      if (data.extracted) {
        dispatch(setFullDraft(data.extracted));
        dispatch(addNotification({
          title: "CRM Draft Synchronized",
          message: `AI extracted clinical details for ${data.extracted.doctor_name || "HCP"}. Structured form updated.`,
          type: "info"
        }));
      }
    }
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  // Simulating Voice Dictation
  const startVoiceDictation = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    dispatch(addNotification({
      title: "Microphone Active",
      message: "Listening to interaction detailing logs...",
      type: "info"
    }));

    // Simulate speech-to-text logging after 3.5 seconds
    setTimeout(() => {
      const simulatedText = "I met Dr. Anjali Mehta today at Max Healthcare regarding Glucophage. She reports patients are showing outstanding compliance and she requested 15 samples. Remind me next Friday to follow up.";
      setInput(simulatedText);
      setIsRecording(false);
      dispatch(addNotification({
        title: "Voice Transcript Captured",
        message: "Successfully converted speech to clinical CRM detailing text.",
        type: "success"
      }));
    }, 4000);
  };

  // Simulating OCR Note Scanners
  const handleOCRScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsScanningOCR(true);
      dispatch(addNotification({
        title: "Scanning Handwritten Notes",
        message: "Running OCR layout parser and medical nomenclature analyzer...",
        type: "info"
      }));

      setTimeout(() => {
        const parsedOCRText = "Meeting with Dr. Priya Nair at Fortis Hospital on 2026-07-08. Specialty Pediatrics. Discussed Synagis. Doctor requested 25 packages. Set priority high.";
        handleSend(parsedOCRText);
        setIsScanningOCR(false);
        dispatch(addNotification({
          title: "OCR Parsing Success",
          message: "Extracted handwritten pharmaceutical log notes and initiated Agent processing.",
          type: "success"
        }));
      }, 3500);
    }
  };

  const triggerOCRInput = () => {
    document.getElementById("ocr-file-input")?.click();
  };

  return (
    <div id="ai-chat-interface-view" className="flex flex-col h-[calc(100vh-14rem)] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header section */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 flex items-center justify-center">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Veritas AI Copilot</h3>
            <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 leading-none mt-0.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Synchronized Draft Active
            </span>
          </div>
        </div>
        <button
          id="clear-chat-history-btn"
          onClick={() => dispatch(clearChat())}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          title="Clear Chat History"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Message Window */}
      <div id="chat-messages-scrollable" className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div 
            id={`chat-msg-${msg.id}`}
            key={msg.id} 
            className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
              msg.sender === "user" 
                ? "bg-slate-800 text-slate-100" 
                : "bg-blue-600 text-white"
            }`}>
              {msg.sender === "user" ? "MR" : "AI"}
            </div>

            {/* Bubble body */}
            <div className="space-y-1.5">
              <div className={`p-3 rounded-2xl text-xs leading-normal ${
                msg.sender === "user"
                  ? "bg-slate-800 text-white rounded-tr-none"
                  : "bg-white border border-slate-200/80 shadow-xs text-slate-800 rounded-tl-none"
              }`}>
                <p className="whitespace-pre-line font-medium">{msg.text}</p>
                
                {/* Embedded extraction badge on assistant bubbles */}
                {msg.sender === "assistant" && msg.extractedData && msg.extractedData.doctor_name && (
                  <div className="mt-3 p-2 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-[10px] text-slate-600">
                    <div className="flex items-center gap-1 font-semibold text-blue-700">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Extracted: {msg.extractedData.doctor_name}</span>
                    </div>
                    <span className="text-slate-400 font-mono">Confidence: {msg.extractedData.confidence}%</span>
                  </div>
                )}
              </div>
              <span className={`text-[9px] text-slate-400 font-mono block ${msg.sender === "user" ? "text-right" : ""}`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {status === "loading" && (
          <div id="chat-assistant-typing" className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              AI
            </div>
            <div className="bg-white border border-slate-200/80 shadow-xs p-3 rounded-2xl rounded-tl-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts panel (shown only if minimal chat history) */}
      {messages.length === 1 && (
        <div id="suggested-prompts-tray" className="px-4 py-2 border-t border-slate-150 bg-slate-50 flex flex-wrap gap-2">
          {suggestedPrompts.map((p, idx) => (
            <button
              id={`suggest-prompt-${idx}`}
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              className="px-2.5 py-1 text-[10px] font-semibold bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-800 rounded-full transition-all cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input panel container */}
      <div className="bg-white px-4 py-3 border-t border-slate-200">
        <form onSubmit={handleSubmitText} className="flex gap-2">
          {/* Handwritten Scan button (OCR Simulation) */}
          <button
            id="ocr-scan-btn"
            type="button"
            onClick={triggerOCRInput}
            disabled={isScanningOCR}
            className={`p-2 rounded-lg border text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shrink-0 flex items-center justify-center relative ${
              isScanningOCR ? "bg-slate-100 border-slate-300" : "border-slate-200"
            }`}
            title="Scan Handwritten Meeting Notes (OCR)"
          >
            <Upload className="w-4 h-4" />
            <input
              id="ocr-file-input"
              type="file"
              accept="image/*,.pdf"
              onChange={handleOCRScan}
              className="hidden"
            />
          </button>

          {/* Text Input */}
          <input
            id="chat-text-input"
            type="text"
            placeholder={
              isRecording 
                ? "Listening... Speak naturally to log your interaction." 
                : "Type clinical detailing notes or chat..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === "loading" || isRecording}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-slate-800 disabled:opacity-75 transition-all font-medium"
          />

          {/* Voice input button */}
          <button
            id="voice-dictation-btn"
            type="button"
            onClick={startVoiceDictation}
            className={`p-2 rounded-lg text-white flex items-center justify-center shrink-0 transition-all ${
              isRecording 
                ? "bg-rose-500 voice-active" 
                : "bg-slate-800 hover:bg-slate-900"
            }`}
            title={isRecording ? "Stop voice dictation" : "Dictate meeting logs (Voice-to-Text)"}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send text button */}
          <button
            id="chat-send-btn"
            type="submit"
            disabled={status === "loading" || isRecording || !input.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
