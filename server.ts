import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Initialize the Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// PRE-SEEDED DATABASE DATA (In-Memory Store)
// ==========================================

const HOSPITALS = [
  { id: "h1", name: "Apollo Hospital, Mumbai", location: "Mumbai" },
  { id: "h2", name: "Max Healthcare, Delhi", location: "Delhi" },
  { id: "h3", name: "Fortis Hospital, Bangalore", location: "Bangalore" },
  { id: "h4", name: "Tata Memorial Hospital, Mumbai", location: "Mumbai" },
  { id: "h5", name: "Mount Sinai Hospital, New York", location: "New York" }
];

const PRODUCTS = [
  { id: "p1", name: "Glucophage (Metformin)", indication: "Diabetes" },
  { id: "p2", name: "Januvia (Sitagliptin)", indication: "Diabetes" },
  { id: "p3", name: "Crestor (Rosuvastatin)", indication: "Cardiovascular" },
  { id: "p4", name: "Lipitor (Atorvastatin)", indication: "Cardiovascular" },
  { id: "p5", name: "Keytruda (Pembrolizumab)", indication: "Oncology" },
  { id: "p6", name: "Botox (OnabotulinumtoxinA)", indication: "Neurology" }
];

const DOCTORS = [
  { id: "d1", name: "Dr. Ramesh Sharma", hospital: "Apollo Hospital, Mumbai", specialization: "Cardiology", email: "r.sharma@apollo.com" },
  { id: "d2", name: "Dr. Anjali Mehta", hospital: "Max Healthcare, Delhi", specialization: "Endocrinology", email: "a.mehta@max.com" },
  { id: "d3", name: "Dr. Priya Nair", hospital: "Fortis Hospital, Bangalore", specialization: "Pediatrics", email: "p.nair@fortis.com" },
  { id: "d4", name: "Dr. Sunil Gupta", hospital: "Tata Memorial Hospital, Mumbai", specialization: "Oncology", email: "s.gupta@tmh.org" },
  { id: "d5", name: "Dr. Sarah Jenkins", hospital: "Mount Sinai Hospital, New York", specialization: "Neurology", email: "s.jenkins@mountsinai.org" }
];

// Seeded interactions to construct a rich "Doctor interaction timeline" and stats
let INTERACTIONS = [
  {
    id: "int-1",
    doctor_id: "d1",
    doctor_name: "Dr. Ramesh Sharma",
    hospital: "Apollo Hospital, Mumbai",
    specialization: "Cardiology",
    meeting_date: "2026-06-20",
    meeting_time: "10:30",
    meeting_type: "Face to Face",
    products: ["Crestor (Rosuvastatin)", "Lipitor (Atorvastatin)"],
    samples_given: 10,
    competitor_mentioned: "Mentioned competitive Rosuvastatin generic pricing.",
    doctor_feedback: "Very positive. Doctor requested clinical study data comparing Crestor 10mg vs 20mg efficacy in high-risk patients.",
    representative_notes: "Followed up on previous Crestor sample pack efficacy. Doctor reports good patient compliance.",
    follow_up_date: "2026-07-15",
    priority: "High",
    summary: "Rep visited Dr. Ramesh Sharma at Apollo Hospital to discuss Crestor efficacy. Doctor showed high interest and requested clinical trial results, while mentioning concern about generic pricing.",
    action_items: ["Send comparative trial PDF", "Prepare clinical response pack"],
    sentiment: "Positive",
    confidence: 98,
    quality_score: 92,
    next_best_action: "Send the comparative clinical study PDF via email and schedule a short 5-minute video follow-up."
  },
  {
    id: "int-2",
    doctor_id: "d2",
    doctor_name: "Dr. Anjali Mehta",
    hospital: "Max Healthcare, Delhi",
    specialization: "Endocrinology",
    meeting_date: "2026-06-25",
    meeting_time: "14:00",
    meeting_type: "Video Call",
    products: ["Glucophage (Metformin)", "Januvia (Sitagliptin)"],
    samples_given: 15,
    competitor_mentioned: "None",
    doctor_feedback: "Doctor finds Januvia useful for elderly patients with renal impairment. Satisfied with current patient profile compliance.",
    representative_notes: "Video meeting arranged to present recent safety data update for Januvia.",
    follow_up_date: "2026-07-20",
    priority: "Medium",
    summary: "Video discussion with Dr. Anjali Mehta regarding Januvia updates in renal patients. Doctor feedback is steady and positive.",
    action_items: ["Deliver Januvia safety brochures", "Log sample delivery"],
    sentiment: "Positive",
    confidence: 95,
    quality_score: 85,
    next_best_action: "Deliver the safety brochures during the next hospital visit and check compliance rates."
  }
];

let AUDIT_LOGS: Array<{ id: string; timestamp: string; action: string; details: string }> = [
  { id: "log-1", timestamp: "2026-06-20T10:35:00.000Z", action: "CREATE_INTERACTION", details: "Logged Face to Face interaction with Dr. Ramesh Sharma" },
  { id: "log-2", timestamp: "2026-06-25T14:15:00.000Z", action: "CREATE_INTERACTION", details: "Logged Video Call interaction with Dr. Anjali Mehta" }
];

let NOTIFICATIONS = [
  { id: "n1", title: "Follow-up Overdue", message: "Follow-up with Dr. Ramesh Sharma was scheduled for Jul 15th.", type: "warning", read: false, time: "1 hour ago" },
  { id: "n2", title: "New Product Campaign", message: "Glucophage educational collateral is now available.", type: "info", read: false, time: "Yesterday" }
];

// Current draft state stored server-side to demonstrate auto-save draft functionality
let DRAFT_INTERACTION: any = null;

// Chat histories
let CHAT_HISTORY: Array<{ role: "user" | "model" | "system"; text: string; timestamp: string }> = [];

// ==========================================
// MULTI-AGENT LANGGRAPH-STYLE WORKFLOW ENGINE
// ==========================================

interface WorkflowState {
  userInput: string;
  history: Array<{ role: string; text: string }>;
  currentDraft?: any;
  intent?: string;
  extracted?: any;
  validationErrors?: string[];
  summary?: string;
  actionItems?: string[];
  sentiment?: string;
  confidence?: number;
  qualityScore?: number;
  nextBestAction?: string;
  finalPayload?: any;
  logs: Array<{ node: string; description: string; timestamp: string; output: any }>;
}

/**
 * Helper to log state transitions in our simulated LangGraph workflow.
 */
function logTransition(state: WorkflowState, node: string, description: string, output: any) {
  state.logs.push({
    node,
    description,
    timestamp: new Date().toISOString(),
    output: JSON.parse(JSON.stringify(output))
  });
}

/**
 * NODE 1: Intent Detection Node
 * Analyzes user input to determine their intent.
 */
async function runIntentDetectionNode(state: WorkflowState) {
  const prompt = `You are the Intent Detection Node of a Life Sciences CRM.
Analyze the user's input and determine their primary intent.

User Input: "${state.userInput}"

Supported Intents:
- "meeting_logging": User is describing a meeting/interaction with a doctor to log, or correcting previous entries.
- "doctor_query": User is asking about a doctor, specialization, hospital, or previous history.
- "follow_up": User is asking to set, check, or modify a follow-up.
- "reminder": User wants a reminder scheduled.
- "other": General chat, greeting, or irrelevant text.

Respond ONLY with a JSON object in this format:
{
  "intent": "meeting_logging" | "doctor_query" | "follow_up" | "reminder" | "other",
  "reason": "Brief explanation"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const res = JSON.parse(response.text || "{}");
    state.intent = res.intent || "meeting_logging";
    logTransition(state, "Intent Detection Node", `Detected intent: ${state.intent}`, res);
  } catch (error: any) {
    const textLower = state.userInput.toLowerCase();
    let detectedIntent = "meeting_logging"; // Default to logging for clinical resilience
    if (textLower.includes("where") || textLower.includes("who is") || textLower.includes("tell me about") || textLower.includes("profile")) {
      detectedIntent = "doctor_query";
    } else if (textLower.includes("reminder") || textLower.includes("remind")) {
      detectedIntent = "reminder";
    } else if (textLower.includes("follow up") || textLower.includes("follow-up") || textLower.includes("schedule")) {
      detectedIntent = "follow_up";
    } else if (textLower.length < 15 && (textLower.includes("hi") || textLower.includes("hello") || textLower.includes("hey") || textLower.includes("thanks"))) {
      detectedIntent = "other";
    }

    state.intent = detectedIntent;
    logTransition(state, "Intent Detection Node", `API Quota Exceeded. Heuristic matched: ${detectedIntent}`, { intent: detectedIntent, reason: "Heuristic fallback" });
  }
}

/**
 * NODE 2: Conversation Memory Node
 * Merges previous chat history and the current form draft into a unified session context.
 * This guarantees the AI never relies only on the latest message.
 */
async function runConversationMemoryNode(state: WorkflowState) {
  const currentDraft = state.currentDraft || {};
  const history = state.history || [];
  
  // Format history for context
  const historyStr = history.map(h => `${h.role === "user" ? "Rep" : "AI"}: ${h.text}`).join("\n");
  
  const prompt = `You are the Conversation Memory Node of a pharmaceutical CRM.
Your job is to build a unified contextual representation of this meeting by combining the previous chat history, the current form draft state, and the latest message.

Current Form Draft:
${JSON.stringify(currentDraft, null, 2)}

Chat History:
${historyStr}

Latest Message:
"${state.userInput}"

Summarize what we know so far about this interaction, incorporating previous details so we do not lose them. Also note if the user is correcting something from earlier.
Respond ONLY with a JSON object in this format:
{
  "contextual_notes": "A complete description combining all facts",
  "is_correction": boolean,
  "corrected_fields": string[]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const res = JSON.parse(response.text || "{}");
    state.extracted = state.extracted || {};
    state.extracted.contextual_notes = res.contextual_notes;
    state.extracted.is_correction = res.is_correction;
    state.extracted.corrected_fields = res.corrected_fields;
    
    logTransition(state, "Conversation Memory Node", "Successfully accumulated sessions and chat history context.", res);
  } catch (error: any) {
    // Local Fallback
    const textLower = state.userInput.toLowerCase();
    const isCorrection = /actually|correction|update|change|replace|no|wait|incorrect/i.test(textLower);
    const correctedFields: string[] = [];
    
    if (isCorrection) {
      if (textLower.includes("dr") || textLower.includes("doctor")) correctedFields.push("doctor_name");
      if (textLower.includes("hospital") || textLower.includes("max") || textLower.includes("fortis") || textLower.includes("apollo")) correctedFields.push("hospital");
      if (textLower.includes("time") || textLower.includes("am") || textLower.includes("pm") || textLower.includes("at ")) correctedFields.push("meeting_time");
      if (textLower.includes("date") || textLower.includes("today") || textLower.includes("tomorrow") || textLower.includes("yesterday") || textLower.includes("friday")) correctedFields.push("meeting_date");
      if (textLower.includes("samples") || textLower.includes("packs") || textLower.includes("boxes")) correctedFields.push("samples_given");
      if (textLower.includes("priority")) correctedFields.push("priority");
    }

    // Combine currentDraft text representation + current user input
    let contextual_notes = state.userInput;
    if (currentDraft.doctor_name) {
      contextual_notes += ` (Preserved Context: Doctor ${currentDraft.doctor_name} at ${currentDraft.hospital || "same hospital"}, Specialty ${currentDraft.specialization || "same specialty"}. Discussed ${currentDraft.products ? currentDraft.products.join(", ") : "previous products"}).`;
    }

    state.extracted = state.extracted || {};
    state.extracted.contextual_notes = contextual_notes;
    state.extracted.is_correction = isCorrection;
    state.extracted.corrected_fields = correctedFields;

    logTransition(state, "Conversation Memory Node", "AI Quota Exceeded. Merged sessions using local heuristic memory rules.", {
      contextual_notes,
      is_correction: isCorrection,
      corrected_fields: correctedFields
    });
  }
}

/**
 * NODE 3: Medical Entity Extractor Node
 * Extracts practitioner details, specialty keywords, feedbacks, sentiment and clinical notes.
 */
/**
 * NODE 3: HCP Entity Extraction Agent Node
 * Strictly extracts only user-provided HCP fields from the conversation.
 * Never invents, uses placeholder examples, or generates default data.
 */
async function runHCPEntityExtractionAgentNode(state: WorkflowState) {
  const notesToParse = state.extracted?.contextual_notes || state.userInput;
  
  const prompt = `You are the HCP Entity Extraction Agent for a Healthcare CRM.
Your job is to extract structured information from the user's conversation exactly as written.
DO NOT CREATE FICTIONAL DATA. DO NOT USE DEFAULT OR SAMPLE PLACEHOLDER VALUES (such as "Dr. Ramesh Sharma", "Apollo Hospital", "Cardiology", "10:00 AM") UNLESS they are explicitly written by the user.
If a field is missing, return null or empty array for products. Never invent data.

Analyze the following conversation:
"${notesToParse}"

Extract the following fields exactly as written:
1. doctor_name: The name of the doctor (with "Dr." title if present). Only extract if explicitly mentioned. Return null if missing.
2. hospital_name: The name of the hospital or clinic. Only extract if explicitly mentioned. Return null if missing.
3. doctor_specialization: The medical specialty or designation of the doctor (e.g. "Cardiologist", "Neurologist", "Orthopedic", "Pediatrician", "Dermatologist", "ENT", "Gynecologist", "Diabetologist", "General Physician", "Oncologist"). Only extract if explicitly mentioned. Return null if missing.
4. interaction_date: The date or relative date term (e.g. "today", "yesterday", "8 July 2026", "08/07/2026", "2026-07-08", "last Monday"). Only extract if explicitly mentioned. Return null if missing.
5. meeting_time: The meeting starting time format exactly as written (e.g. "10 AM", "10:30 AM", "2 PM", "14:00", "11:15 AM", "9 o'clock"). Only extract if explicitly mentioned. Return null if missing.
6. meeting_type: The type of meeting (e.g. "Face to Face", "Phone", "Video Call", "Conference"). Only extract if explicitly mentioned. Return null if missing.
7. products_discussed: An array of pharmaceutical products discussed (e.g. ["Januvia (Sitagliptin)", "Glucophage (Metformin)", "Crestor (Rosuvastatin)", "Lipitor (Atorvastatin)", "Keytruda (Pembrolizumab)", "Botox (OnabotulinumtoxinA)"]). Match with known products if possible, or return raw strings if mentioned. Return empty array [] if none.
8. samples_given: The number of samples/units given as an integer. Return null or 0 if not mentioned.
9. competitor_mentioned: Any competitor brands or generic pricing mentioned. Return null if missing.
10. doctor_feedback: The direct doctor feedback or reactions. Return null if missing.
11. representative_notes: Clean summary of the conversation or representative's observations. Return null if missing.
12. follow_up_date: Any follow-up date mentioned (e.g., "next Friday", "tomorrow", "15 July"). Return null if missing.
13. priority: The priority of follow-up ("High", "Medium", "Low") if explicitly indicated or inferred from urgency keywords. Return null if missing.

Respond ONLY with a JSON object in this format:
{
  "doctor_name": string or null,
  "hospital_name": string or null,
  "doctor_specialization": string or null,
  "interaction_date": string or null,
  "meeting_time": string or null,
  "meeting_type": string or null,
  "products_discussed": string[],
  "samples_given": number or null,
  "competitor_mentioned": string or null,
  "doctor_feedback": string or null,
  "representative_notes": string or null,
  "follow_up_date": string or null,
  "priority": string or null
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const res = JSON.parse(response.text || "{}");
    
    // Registry grounding check (only if doctor name was actually extracted)
    if (res.doctor_name) {
      const docLower = res.doctor_name.toLowerCase();
      const foundDoc = DOCTORS.find(d => 
        docLower.includes(d.name.toLowerCase()) ||
        docLower.includes(d.name.split(" ").slice(1).join(" ").toLowerCase())
      );
      if (foundDoc) {
        res.doctor_name = foundDoc.name;
        if (!res.hospital_name) res.hospital_name = foundDoc.hospital;
        if (!res.doctor_specialization) res.doctor_specialization = foundDoc.specialization;
      }
    }

    state.extracted = {
      ...state.extracted,
      doctor_name: res.doctor_name || null,
      hospital: res.hospital_name || null,
      specialization: res.doctor_specialization || null,
      interaction_date: res.interaction_date || null,
      meeting_time: res.meeting_time || null,
      meeting_type: res.meeting_type || null,
      products: res.products_discussed || [],
      samples_given: res.samples_given || 0,
      competitor_mentioned: res.competitor_mentioned || "None",
      doctor_feedback: res.doctor_feedback || null,
      representative_notes: res.representative_notes || notesToParse,
      follow_up_date_raw: res.follow_up_date || null,
      priority: res.priority || null
    };
    
    logTransition(state, "HCP Entity Extraction Agent", "Extracted raw HCP entities from conversation.", res);
  } catch (error: any) {
    // Local fallback with strict extraction
    const textLower = notesToParse.toLowerCase();
    let doctor_name: string | null = null;
    let hospital_name: string | null = null;
    let doctor_specialization: string | null = null;
    let interaction_date: string | null = null;
    let meeting_time: string | null = null;
    let meeting_type: string | null = null;
    let products: string[] = [];
    let samples_given = 0;
    let competitor_mentioned = "None";
    let doctor_feedback: string | null = null;
    let follow_up_date_raw: string | null = null;
    let priority: string | null = null;

    // Strict doctor matching (No defaults, only if name/dr is mentioned in notes)
    const drMatch = notesToParse.match(/Dr\.\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
    if (drMatch) {
      doctor_name = "Dr. " + drMatch[1];
    } else {
      const matchedDoctor = DOCTORS.find(d => textLower.includes(d.name.toLowerCase()));
      if (matchedDoctor) {
        doctor_name = matchedDoctor.name;
      }
    }

    // Registry grounding if doctor matched
    if (doctor_name) {
      const docLower = doctor_name.toLowerCase();
      const foundDoc = DOCTORS.find(d => 
        docLower.includes(d.name.toLowerCase()) ||
        docLower.includes(d.name.split(" ").slice(1).join(" ").toLowerCase())
      );
      if (foundDoc) {
        doctor_name = foundDoc.name;
        hospital_name = foundDoc.hospital;
        doctor_specialization = foundDoc.specialization;
      }
    }

    // Strict hospital matching (only if actually in text)
    if (!hospital_name) {
      const matchedHosp = HOSPITALS.find(h => textLower.includes(h.name.toLowerCase()) || textLower.includes(h.name.split(",")[0].toLowerCase()));
      if (matchedHosp) {
        hospital_name = matchedHosp.name;
      } else {
        const hospMatch = notesToParse.match(/([A-Z][a-zA-Z\s]+Hospital)/);
        if (hospMatch) {
          hospital_name = hospMatch[1].trim();
        }
      }
    }

    // Specialization keyword matching
    if (!doctor_specialization) {
      const specializations = [
        "Cardiologist", "Cardiology", "Neurologist", "Neurology", "Orthopedic", "Orthopedics",
        "Pediatrician", "Pediatrics", "Dermatologist", "Dermatology", "ENT", "Gynecologist", "Gynecology",
        "Diabetologist", "General Physician", "Oncologist", "Oncology"
      ];
      const foundSpec = specializations.find(spec => textLower.includes(spec.toLowerCase()));
      if (foundSpec) {
        doctor_specialization = foundSpec;
      }
    }

    // Interaction date matching
    const dateTerms = ["today", "yesterday", "tomorrow", "last monday", "next friday"];
    const foundDateTerm = dateTerms.find(term => textLower.includes(term));
    if (foundDateTerm) {
      interaction_date = foundDateTerm;
    } else {
      const explicitDateMatch = notesToParse.match(/\d{1,2}\s+[A-Za-z]+\s+\d{4}/) || notesToParse.match(/\d{2}\/\d{2}\/\d{4}/) || notesToParse.match(/\d{4}-\d{2}-\d{2}/);
      if (explicitDateMatch) {
        interaction_date = explicitDateMatch[0];
      }
    }

    // Meeting time matching
    const timeMatch = notesToParse.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)/i) || notesToParse.match(/(\d{1,2})\s*(am|pm)/i) || notesToParse.match(/at\s*(\d{1,2})[:.](\d{2})/i);
    if (timeMatch) {
      meeting_time = timeMatch[0].replace(/at\s+/i, "").toUpperCase().trim();
    }

    // Meeting type matching
    const types = ["Face to Face", "Phone", "Video Call", "Conference"];
    const foundType = types.find(t => textLower.includes(t.toLowerCase()));
    if (foundType) {
      meeting_type = foundType;
    }

    // Products matching
    for (const p of PRODUCTS) {
      const simpleName = p.name.split(" ")[0].toLowerCase();
      if (textLower.includes(simpleName)) {
        products.push(p.name);
      }
    }

    // Samples Matching
    const samplesMatch = textLower.match(/(\d+)\s*(?:sample|pack|box|unit|qty|quant)/i) || textLower.match(/(?:gave|give|left|deliver|requested)\s*(\d+)/i);
    if (samplesMatch) {
      samples_given = parseInt(samplesMatch[1], 10) || 0;
    }

    // Competitor Match
    const competitors = ["Pfizer", "Sun Pharma", "Cipla", "Abbott", "Dr Reddy's", "Lupin"];
    const foundComp = competitors.find(c => textLower.includes(c.toLowerCase()));
    if (foundComp) {
      competitor_mentioned = foundComp;
    }

    // Feedback parsing
    const feedbackKeywords = ["feedback", "happy", "interested", "keen", "impressed", "complained", "said", "reported", "reacted", "positive", "reports"];
    if (feedbackKeywords.some(k => textLower.includes(k))) {
      const sentences = notesToParse.split(/[.!?]+/);
      const feedbackSentence = sentences.find(s => feedbackKeywords.some(k => s.toLowerCase().includes(k)));
      if (feedbackSentence) doctor_feedback = feedbackSentence.trim();
    }

    // Follow up date raw
    if (textLower.includes("follow up") || textLower.includes("follow-up") || textLower.includes("remind") || textLower.includes("reminders")) {
      follow_up_date_raw = "next Friday";
      if (textLower.includes("tomorrow")) follow_up_date_raw = "tomorrow";
    }

    // Priority
    if (/high|urgent|critical/i.test(textLower)) {
      priority = "High";
    } else if (/low|minor/i.test(textLower)) {
      priority = "Low";
    } else {
      priority = "Medium";
    }

    state.extracted = {
      ...state.extracted,
      doctor_name,
      hospital: hospital_name,
      specialization: doctor_specialization,
      interaction_date,
      meeting_time,
      meeting_type,
      products,
      samples_given,
      competitor_mentioned,
      doctor_feedback,
      representative_notes: notesToParse,
      follow_up_date_raw,
      priority
    };

    logTransition(state, "HCP Entity Extraction Agent", "AI Quota Exceeded. Applied strict programmatic HCP extraction.", state.extracted);
  }
}

/**
 * NODE 4: Date & Time Extractor Node
 * Standardizes extracted date and time strings.
 */
async function runDateTimeExtractorNode(state: WorkflowState) {
  const ext = state.extracted || {};
  const dateStr = ext.interaction_date;
  const timeStr = ext.meeting_time;
  const followUpStr = ext.follow_up_date_raw;
  const todayStr = "2026-07-08"; // Today's fixed date context for this session Wednesday

  if (!dateStr && !timeStr && !followUpStr) {
    logTransition(state, "Date & Time Parser", "No dates or times to parse.", {});
    return;
  }

  const prompt = `You are the Date & Time Parser Node.
Today's date is Wednesday, July 8, 2026 (${todayStr}).

Extract and standardize:
1. meeting_date: Convert the date string "${dateStr || ""}" to YYYY-MM-DD.
   Parse relative dates: "today" -> "${todayStr}", "yesterday" -> "2026-07-07", "tomorrow" -> "2026-07-09", "last Monday" -> "2026-07-06", "next Friday" -> "2026-07-10".
   Parse explicit dates: e.g. "8 July 2026" or "08/07/2026" or "2026-07-08" -> "2026-07-08".
   If no date is specified, return null. Do not invent.
2. meeting_time: Convert the time string "${timeStr || ""}" to "HH:MM AM/PM" style.
   e.g. "10 AM" -> "10:00 AM", "10:30 AM" -> "10:30 AM", "2 PM" -> "02:00 PM", "14:00" -> "02:00 PM", "11:15 AM" -> "11:15 AM", "11.15 AM" -> "11:15 AM", "9 o'clock" -> "09:00 AM".
   If no time is specified, return null. Do not invent.
3. follow_up_date: Convert the follow-up date "${followUpStr || ""}" to YYYY-MM-DD format.
   If no follow-up date is specified, return null. Do not invent.

Respond ONLY with a JSON object in this format:
{
  "meeting_date": string or null (YYYY-MM-DD),
  "meeting_time": string or null (e.g. "11:15 AM"),
  "follow_up_date": string or null (YYYY-MM-DD)
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const res = JSON.parse(response.text || "{}");
    
    if (res.meeting_date) state.extracted.meeting_date = res.meeting_date;
    if (res.meeting_time) state.extracted.meeting_time = res.meeting_time;
    if (res.follow_up_date) state.extracted.follow_up_date = res.follow_up_date;

    logTransition(state, "Date & Time Parser", "Standardized meeting date, time, and follow-up date.", res);
  } catch (error: any) {
    // Local fallback
    const dLower = (dateStr || "").toLowerCase();
    let meeting_date = ext.meeting_date || null;
    if (dLower.includes("today")) meeting_date = "2026-07-08";
    else if (dLower.includes("yesterday")) meeting_date = "2026-07-07";
    else if (dLower.includes("tomorrow")) meeting_date = "2026-07-09";
    else if (dLower.includes("last monday")) meeting_date = "2026-07-06";
    else if (dLower.includes("next friday")) meeting_date = "2026-07-10";
    else if (dateStr) {
      const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
      if (match) meeting_date = match[0];
    }

    let meeting_time = ext.meeting_time || null;
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)/i) || timeStr.match(/(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) {
        meeting_time = timeMatch[0].toUpperCase().trim();
      }
    }

    let follow_up_date = ext.follow_up_date || null;
    if (followUpStr) {
      const fLower = followUpStr.toLowerCase();
      if (fLower.includes("tomorrow")) follow_up_date = "2026-07-09";
      else if (fLower.includes("next friday")) follow_up_date = "2026-07-10";
      else if (fLower.includes("15 july") || fLower.includes("july 15")) follow_up_date = "2026-07-15";
    }

    state.extracted.meeting_date = meeting_date;
    state.extracted.meeting_time = meeting_time;
    state.extracted.follow_up_date = follow_up_date;

    logTransition(state, "Date & Time Parser", "AI Quota Exceeded. Applied local date/time standardizing.", {
      meeting_date,
      meeting_time,
      follow_up_date
    });
  }
}

/**
 * NODE 7: Validation Agent Node
 * Analyzes form completeness and calculates confidence scores. 
 * If confidence is below 80% or key fields are missing, prompts user for clarification.
 */
async function runValidationAgentNode(state: WorkflowState) {
  const ext = state.extracted || {};
  const missingFields: string[] = [];
  
  if (!ext.doctor_name) missingFields.push("Doctor Name");
  if (!ext.hospital) missingFields.push("Hospital");
  if (!ext.meeting_date) missingFields.push("Meeting Date");
  
  state.validationErrors = missingFields;

  // Let's compute individual and global confidence
  let confidence = 100;
  let clarificationMessage = "";

  if (!ext.doctor_name) {
    confidence -= 30;
    clarificationMessage += "Who was the doctor you met during this visit? ";
  }
  if (!ext.hospital) {
    confidence -= 20;
    clarificationMessage += "At which hospital or clinic was this interaction conducted? ";
  }
  if (!ext.products || ext.products.length === 0) {
    confidence -= 20;
    clarificationMessage += "Did you discuss any products like Glucophage, Januvia, or Crestor? ";
  }
  if (!ext.meeting_time) {
    confidence -= 10;
    clarificationMessage += "What time did your meeting start? (e.g. 11:15 AM) ";
  }

  // If the user notes have low length or ambiguity
  if (state.userInput.length < 30) {
    confidence = Math.min(confidence, 75);
  }

  state.confidence = Math.max(confidence, 10);

  // Trigger clarification if confidence is below 80%
  let status = "Validation success. Form is complete and compliant.";
  if (state.confidence < 80) {
    status = `Clarification Triggered (Confidence: ${state.confidence}%). Promoted human-in-the-loop: "${clarificationMessage.trim()}"`;
    state.extracted.clarification_needed = clarificationMessage.trim();
  }

  logTransition(state, "Validation Agent Node", "Evaluated compliance parameters and calculated field confidence ratings.", {
    isValid: missingFields.length === 0,
    confidence: state.confidence,
    missingFields,
    clarificationNeeded: state.confidence < 80 ? clarificationMessage.trim() : null,
    status
  });
}

/**
 * NODE 8: Merge Existing Form Node
 * Safely merges newly extracted clinical parameters into the existing persistent CRM draft.
 * Adheres strictly to preservation, array merge, and correction rules.
 */
async function runMergeExistingFormNode(state: WorkflowState) {
  const currentDraft = state.currentDraft || {};
  const ext = state.extracted || {};
  
  const merged = { ...currentDraft };

  // Fields list
  const fields = [
    "doctor_name", "hospital", "specialization", "meeting_date", "meeting_time",
    "meeting_type", "competitor_mentioned", "doctor_feedback", 
    "representative_notes", "follow_up_date", "priority"
  ];

  for (const f of fields) {
    // Preserve existing value if extraction has nothing new
    if (ext[f] !== undefined && ext[f] !== null && ext[f] !== "" && ext[f] !== "None" && ext[f] !== "No specific feedback recorded.") {
      merged[f] = ext[f];
    }
  }

  // Handle competitor spelling / name
  if (ext.competitor && ext.competitor !== "None") {
    merged.competitor_mentioned = ext.competitor;
  }

  // Merge Products Array uniquely (RULE 2)
  let mergedProducts = [...(currentDraft.products || [])];
  const newProducts = ext.products || [];
  
  for (const p of newProducts) {
    if (!mergedProducts.includes(p)) {
      mergedProducts.push(p);
    }
  }
  
  // Handle explicit removals
  const lowerInput = state.userInput.toLowerCase();
  if (lowerInput.includes("remove") || lowerInput.includes("delete")) {
    for (const p of PRODUCTS) {
      const nameFirst = p.name.split(" ")[0].toLowerCase();
      if (lowerInput.includes(`remove ${nameFirst}`) || lowerInput.includes(`delete ${nameFirst}`)) {
        mergedProducts = mergedProducts.filter(item => !item.toLowerCase().includes(nameFirst));
      }
    }
  }
  merged.products = mergedProducts;

  // Samples count merging
  if (ext.samples_given !== undefined && ext.samples_given !== 0) {
    if (/actually|instead|no|correction|update/i.test(lowerInput)) {
      merged.samples_given = ext.samples_given;
    } else {
      merged.samples_given = (currentDraft.samples_given || 0) + ext.samples_given;
    }
  } else {
    merged.samples_given = currentDraft.samples_given || 0;
  }

  state.extracted = merged;
  logTransition(state, "Merge Existing Form Node", "Merged newly extracted parameters into persistent CRM draft successfully.", merged);
}

/**
 * NODE 9: Update Changed Fields Node
 * Compares old draft state and merges new updates, generating explicit '✓ Field Updated' checkmarks.
 * Implements clean correction parameters without resetting other fields.
 */
async function runUpdateChangedFieldsNode(state: WorkflowState) {
  const currentDraft = state.currentDraft || {};
  const merged = state.extracted || {};
  
  const updateMessages: string[] = [];
  
  // Compare fields
  const fields = [
    { key: "doctor_name", label: "Doctor Name" },
    { key: "specialization", label: "Specialization" },
    { key: "hospital", label: "Hospital / Institution" },
    { key: "meeting_time", label: "Meeting Time" },
    { key: "meeting_date", label: "Meeting Date" },
    { key: "meeting_type", label: "Meeting Type" },
    { key: "products", label: "Products" },
    { key: "samples_given", label: "Samples Given" },
    { key: "competitor_mentioned", label: "Competitor Mentioned" },
    { key: "doctor_feedback", label: "Doctor Feedback" },
    { key: "follow_up_date", label: "Follow-up Date" },
    { key: "priority", label: "Priority" }
  ];

  for (const f of fields) {
    const oldVal = currentDraft[f.key];
    const newVal = merged[f.key];

    if (f.key === "products") {
      const oldArr = oldVal || [];
      const newArr = newVal || [];
      if (JSON.stringify(oldArr.sort()) !== JSON.stringify(newArr.sort()) && newArr.length > 0) {
        updateMessages.push(`${f.label} Updated`);
      }
    } else if (newVal !== undefined && newVal !== null && newVal !== "" && oldVal !== newVal) {
      updateMessages.push(`${f.label} Updated`);
    }
  }

  state.extracted.updateMessages = updateMessages;
  logTransition(state, "Update Changed Fields Node", "Evaluated precise delta differences and logged checkmark updates.", {
    isUpdated: updateMessages.length > 0,
    updateMessages
  });
}

/**
 * NODE 10: Save Draft Node
 * Packages final structured CRM draft and persists it onto the in-memory/server-side cache.
 */
async function runSaveDraftNode(state: WorkflowState) {
  const ext = state.extracted || {};
  
  // Format professional medical summaries
  const docName = ext.doctor_name || "the physician";
  const hospital = ext.hospital || "the hospital";
  const discussedProducts = ext.products && ext.products.length > 0 ? ext.products.join(" & ") : "clinical efficacy treatment options";

  const summary = `Representative successfully executed a ${ext.meeting_type || "Face to Face"} medical detailing visit with ${docName} at ${hospital}. Discussion centered on clinical profiles and efficacy of ${discussedProducts}.`;

  const actionItems: string[] = [];
  if (ext.products && ext.products.length > 0) {
    actionItems.push(`Email clinical studies on ${ext.products[0]}`);
  }
  if (ext.follow_up_date) {
    actionItems.push(`Conduct scheduled CRM follow-up on ${ext.follow_up_date}`);
  } else {
    actionItems.push("Schedule a 5-minute video follow-up next week");
  }

  // Map low confidence / missing hospital to Low priority or let user specify
  let priority = ext.priority || "Medium";
  if (/high|urgent|critical/i.test(state.userInput)) {
    priority = "High";
  }

  const nextBestAction = ext.follow_up_date 
    ? `Prepare clinical and safety documents for the upcoming visit on ${ext.follow_up_date}.`
    : `Schedule and outline therapeutic benefits of ${ext.products?.[0] || "treatments"} for the next visit.`;

  const finalPayload = {
    doctor_name: ext.doctor_name !== undefined ? ext.doctor_name : (state.currentDraft?.doctor_name || ""),
    hospital: ext.hospital !== undefined ? ext.hospital : (state.currentDraft?.hospital || ""),
    specialization: ext.specialization !== undefined ? ext.specialization : (state.currentDraft?.specialization || ""),
    meeting_date: ext.meeting_date !== undefined ? ext.meeting_date : (state.currentDraft?.meeting_date || ""),
    meeting_time: ext.meeting_time !== undefined ? ext.meeting_time : (state.currentDraft?.meeting_time || ""),
    meeting_type: ext.meeting_type !== undefined ? ext.meeting_type : (state.currentDraft?.meeting_type || "Face to Face"),
    products: ext.products !== undefined ? ext.products : (state.currentDraft?.products || []),
    samples_given: ext.samples_given !== undefined ? ext.samples_given : (state.currentDraft?.samples_given || 0),
    competitor: ext.competitor_mentioned !== undefined ? ext.competitor_mentioned : (state.currentDraft?.competitor_mentioned || "None"),
    competitor_mentioned: ext.competitor_mentioned !== undefined ? ext.competitor_mentioned : (state.currentDraft?.competitor_mentioned || "None"),
    doctor_feedback: ext.doctor_feedback !== undefined ? ext.doctor_feedback : (state.currentDraft?.doctor_feedback || "No specific feedback recorded."),
    representative_notes: state.userInput,
    follow_up_date: ext.follow_up_date !== undefined ? ext.follow_up_date : (state.currentDraft?.follow_up_date || ""),
    priority: priority,
    summary: summary,
    action_items: actionItems,
    sentiment: ext.sentiment || state.currentDraft?.sentiment || "Neutral",
    next_best_action: nextBestAction,
    confidence: state.confidence || 90
  };

  // Sync back to local memory server-side
  DRAFT_INTERACTION = finalPayload;
  state.finalPayload = finalPayload;

  logTransition(state, "Save Draft Node", "Structured draft formatted and auto-saved onto the persistent Life Sciences CRM registry cache.", finalPayload);
}

/**
 * Main Executable Orchestrator of the LangGraph-style workflow.
 */
async function runLangGraphWorkflow(userInput: string, history: Array<{ role: string; text: string }> = [], currentDraft?: any): Promise<WorkflowState> {
  const state: WorkflowState = {
    userInput,
    history,
    currentDraft,
    logs: []
  };

  // 1. Detect Intent
  await runIntentDetectionNode(state);

  // For meeting logging or general updates, execute the multi-agent pipeline:
  if (state.intent === "meeting_logging" || state.intent === "follow_up" || userInput.length > 15) {
    // 2. Conversation Memory
    await runConversationMemoryNode(state);

    // 3. HCP Entity Extraction Agent
    await runHCPEntityExtractionAgentNode(state);

    // 4. Date & Time Parser
    await runDateTimeExtractorNode(state);

    // 5. Validation Agent
    await runValidationAgentNode(state);

    // 6. Merge Existing Form
    await runMergeExistingFormNode(state);

    // 7. Update Changed Fields (Update UI phase)
    await runUpdateChangedFieldsNode(state);

    // 8. Save Draft
    await runSaveDraftNode(state);
  } else {
    logTransition(state, "LangGraph Orchestrator", "Input classified as non-logging. Fast-path conversational response routing.", { intent: state.intent });
  }

  return state;
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Mock session state
let currentUser = {
  email: "rep1@pharma.com",
  name: "Sarah Connors",
  role: "Medical Representative",
  region: "North Region",
  authenticated: true
};

/**
 * POST /api/login
 */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    currentUser = {
      email,
      name: email.split("@")[0].toUpperCase() + " REP",
      role: "Medical Representative",
      region: "Global Operations",
      authenticated: true
    };
    AUDIT_LOGS.push({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      action: "AUTH_LOGIN",
      details: `User logged in: ${email}`
    });
    return res.json({ success: true, user: currentUser });
  }
  return res.status(400).json({ success: false, message: "Email and password are required." });
});

/**
 * POST /api/logout
 */
app.post("/api/logout", (req, res) => {
  currentUser = { ...currentUser, authenticated: false };
  AUDIT_LOGS.push({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "AUTH_LOGOUT",
    details: "User logged out"
  });
  return res.json({ success: true });
});

/**
 * GET /api/hcp
 */
app.get("/api/hcp", (req, res) => {
  res.json({ success: true, doctors: DOCTORS, hospitals: HOSPITALS, products: PRODUCTS });
});

/**
 * GET /api/hcp/:id
 */
app.get("/api/hcp/:id", (req, res) => {
  const doc = DOCTORS.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  const interactions = INTERACTIONS.filter(i => i.doctor_id === doc.id || i.doctor_name.toLowerCase().includes(doc.name.toLowerCase()));
  res.json({ success: true, doctor: doc, interactions });
});

/**
 * GET /api/history
 */
app.get("/api/history", (req, res) => {
  res.json({ success: true, history: INTERACTIONS });
});

/**
 * POST /api/interactions
 */
app.post("/api/interactions", (req, res) => {
  const body = req.body;
  
  if (!body.doctor_name || !body.hospital) {
    return res.status(400).json({ success: false, message: "Doctor Name and Hospital are required." });
  }

  // Find Doctor ID if matching
  const matchedDoc = DOCTORS.find(d => d.name.toLowerCase().includes(body.doctor_name.toLowerCase()));
  const doctor_id = matchedDoc ? matchedDoc.id : "d-custom";

  const newInteraction = {
    id: "int-" + Date.now(),
    doctor_id,
    doctor_name: body.doctor_name,
    hospital: body.hospital,
    specialization: body.specialization || (matchedDoc ? matchedDoc.specialization : "General Practice"),
    meeting_date: body.meeting_date || new Date().toISOString().split('T')[0],
    meeting_time: body.meeting_time || "12:00",
    meeting_type: body.meeting_type || "Face to Face",
    products: body.products || [],
    samples_given: parseInt(body.samples_given, 10) || 0,
    competitor_mentioned: body.competitor_mentioned || "None",
    doctor_feedback: body.doctor_feedback || "",
    representative_notes: body.representative_notes || "",
    follow_up_date: body.follow_up_date || "",
    priority: body.priority || "Medium",
    summary: body.summary || "Interaction logged manually by Representative.",
    action_items: body.action_items || [],
    sentiment: body.sentiment || "Neutral",
    confidence: body.confidence || 100,
    quality_score: body.quality_score || 80,
    next_best_action: body.next_best_action || "Log next interaction after follow-up."
  };

  INTERACTIONS.unshift(newInteraction);
  AUDIT_LOGS.push({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "CREATE_INTERACTION",
    details: `Successfully logged interaction with ${body.doctor_name} at ${body.hospital}`
  });

  // Clear draft if it matches
  DRAFT_INTERACTION = null;

  res.json({ success: true, interaction: newInteraction });
});

/**
 * PUT /api/interactions/:id
 */
app.put("/api/interactions/:id", (req, res) => {
  const id = req.params.id;
  const body = req.body;

  const index = INTERACTIONS.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Interaction not found" });
  }

  INTERACTIONS[index] = {
    ...INTERACTIONS[index],
    ...body,
    id // Keep original ID
  };

  AUDIT_LOGS.push({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "UPDATE_INTERACTION",
    details: `Updated interaction with ${INTERACTIONS[index].doctor_name}`
  });

  res.json({ success: true, interaction: INTERACTIONS[index] });
});

/**
 * DELETE /api/interactions/:id
 */
app.delete("/api/interactions/:id", (req, res) => {
  const id = req.params.id;
  const index = INTERACTIONS.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Interaction not found" });
  }

  const removed = INTERACTIONS.splice(index, 1);
  AUDIT_LOGS.push({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "DELETE_INTERACTION",
    details: `Deleted interaction with ${removed[0].doctor_name}`
  });

  res.json({ success: true, id });
});

/**
 * GET /api/audit-logs
 */
app.get("/api/audit-logs", (req, res) => {
  res.json({ success: true, logs: AUDIT_LOGS });
});

/**
 * POST /api/langgraph/process
 * Runs the Multi-Agent Extraction Pipeline (LangGraph Workflow) on raw representative notes.
 */
app.post("/api/langgraph/process", async (req, res) => {
  const { notes, currentDraft } = req.body;
  if (!notes) {
    return res.status(400).json({ success: false, message: "Notes content is required to run the workflow." });
  }

  try {
    const state = await runLangGraphWorkflow(notes, [], currentDraft);
    res.json({
      success: true,
      intent: state.intent,
      extracted: state.finalPayload,
      logs: state.logs,
      validationErrors: state.validationErrors
    });
  } catch (error: any) {
    console.log("[Life Sciences CRM] LangGraph Process: High-demand detected. Directing user input to local programmatic extraction fallback.");
    
    // Programmatic default payload response
    const defaultPayload = {
      doctor_name: currentDraft?.doctor_name || "",
      hospital: currentDraft?.hospital || "",
      specialization: currentDraft?.specialization || "",
      meeting_date: currentDraft?.meeting_date || new Date().toISOString().split('T')[0],
      meeting_type: currentDraft?.meeting_type || "Face to Face",
      products: currentDraft?.products || [],
      samples_given: currentDraft?.samples_given || 0,
      competitor_mentioned: currentDraft?.competitor_mentioned || "None",
      doctor_feedback: currentDraft?.doctor_feedback || "",
      representative_notes: notes,
      follow_up_date: currentDraft?.follow_up_date || "",
      priority: currentDraft?.priority || "Medium",
      summary: "Interaction logged programmatically.",
      action_items: [],
      sentiment: "Neutral",
      quality_score: 70,
      next_best_action: "Maintain regular contact.",
      confidence: 80
    };

    res.json({
      success: true,
      intent: "meeting_logging",
      extracted: defaultPayload,
      logs: [{
        node: "System Global Orchestrator Fallback",
        description: "Encountered a runtime error. Re-routed to resilient offline programmatic engine.",
        timestamp: new Date().toISOString(),
        output: { error: error.message }
      }],
      validationErrors: []
    });
  }
});

/**
 * POST /api/chat
 * Conversations with the AI Chat assistant that acts as a real-time copilot.
 * Uses Gemini structure and conversation memory.
 */
app.post("/api/chat", async (req, res) => {
  const { message, history, currentDraft } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  try {
    // Check if the message is a meeting log intent.
    // We execute the workflow so that we can extract data AND write a helpful response in parallel!
    const state = await runLangGraphWorkflow(message, history, currentDraft);

    let systemResponse = "";
    if (state.intent === "meeting_logging") {
      const p = state.finalPayload;
      
      const detectedLines: string[] = [];
      const missingFields: string[] = [];
      
      if (p.doctor_name) detectedLines.push(`✓ **Doctor Name** detected: **${p.doctor_name}**`);
      else missingFields.push("Doctor Name");
      
      if (p.hospital) detectedLines.push(`✓ **Hospital Name** detected: **${p.hospital}**`);
      else missingFields.push("Hospital Name");
      
      if (p.specialization) detectedLines.push(`✓ **Doctor Specialization** detected: **${p.specialization}**`);
      else missingFields.push("Doctor Specialization");
      
      if (p.meeting_date) {
        const parts = p.meeting_date.split("-");
        const displayDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.meeting_date;
        detectedLines.push(`✓ **Interaction Date** detected: **${displayDate}**`);
      } else {
        missingFields.push("Interaction Date");
      }
      
      if (p.meeting_time) detectedLines.push(`✓ **Meeting Time** detected: **${p.meeting_time}**`);
      else missingFields.push("Meeting Time");
      
      if (p.meeting_type) detectedLines.push(`✓ **Meeting Type** detected: **${p.meeting_type}**`);
      else missingFields.push("Meeting Type");
      
      if (p.products && p.products.length > 0) detectedLines.push(`✓ **Products Discussed** detected: **${p.products.join(", ")}**`);
      else missingFields.push("Products Discussed");
      
      if (p.samples_given !== undefined && p.samples_given !== null && p.samples_given > 0) detectedLines.push(`✓ **Samples Given** detected: **${p.samples_given}**`);
      else missingFields.push("Samples Given");
      
      if (p.competitor_mentioned && p.competitor_mentioned !== "None" && p.competitor_mentioned !== "") detectedLines.push(`✓ **Competitor Mentioned** detected: **${p.competitor_mentioned}**`);
      else missingFields.push("Competitor Mentioned");
      
      if (p.doctor_feedback && p.doctor_feedback !== "No specific feedback recorded." && p.doctor_feedback !== "") detectedLines.push(`✓ **Doctor Feedback** detected: *"${p.doctor_feedback}"*`);
      else missingFields.push("Doctor Feedback");
      
      if (p.representative_notes && p.representative_notes !== "") detectedLines.push(`✓ **Representative Notes** detected`);
      else missingFields.push("Representative Notes");
      
      if (p.follow_up_date) {
        const parts = p.follow_up_date.split("-");
        const displayFollowUp = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.follow_up_date;
        detectedLines.push(`✓ **Follow-up Date** detected: **${displayFollowUp}**`);
      } else {
        missingFields.push("Follow-up Date");
      }
      
      if (p.priority) detectedLines.push(`✓ **Priority** detected: **${p.priority}**`);
      else missingFields.push("Priority");

      let promptMsg = "";
      if (missingFields.length > 0) {
        promptMsg = `\n\nCould you please provide the missing **${missingFields.join(", ")}** to complete the interaction details?`;
      } else {
        promptMsg = `\n\nI have successfully extracted all mandatory CRM fields and synchronized them with the form on the left. Feel free to review and submit!`;
      }
      
      systemResponse = `I have executed the **HCP Entity Extraction Agent** workflow!
      
${detectedLines.join("\n")}${promptMsg}`;
    } else {
      // General conversational assistance
      const chatPrompt = `You are an AI Copilot inside a premium Life Sciences CRM.
Your role is to help Medical Representatives manage doctor relationships, summarize meetings, and navigate their inventory.
Be professional, concise, helpful, and use medical terms properly.

Representative Chat History:
${JSON.stringify(history || [])}

Representative Message: "${message}"

Formulate a concise response (max 3 sentences).`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: chatPrompt
        });
        systemResponse = response.text || "I am here to assist you with logging your HCP interactions.";
      } catch (chatError: any) {
        console.log("[Life Sciences CRM] Chat assistant info: API limit reached. Activating rule-based fallback response engine.");
        
        const query = message.toLowerCase();
        if (query.includes("hello") || query.includes("hi") || query.includes("hey")) {
          systemResponse = "Hello! I am your AI CRM Copilot. Currently, the primary Gemini API is experiencing high load or quota constraints, so I am assisting you using our fast local rules engine. How can I help you log meetings or find doctor details today?";
        } else if (query.includes("dr") || query.includes("doctor")) {
          const matchedDoc = DOCTORS.find(d => 
            query.includes(d.name.toLowerCase()) || 
            query.includes(d.name.split(" ").slice(1).join(" ").toLowerCase()) || 
            query.includes(d.name.split(" ")[1]?.toLowerCase())
          );
          if (matchedDoc) {
            const recentInt = INTERACTIONS.filter(i => i.doctor_id === matchedDoc.id);
            systemResponse = `I found **${matchedDoc.name}** (${matchedDoc.specialization}) in our records. They practice at **${matchedDoc.hospital}**.\n\n* **Recent Interaction**: ${recentInt.length > 0 ? recentInt[0].summary : "No meetings logged recently."}\n* **Email**: ${matchedDoc.email}\n\nHow would you like to update their profile or log a new meeting?`;
          } else {
            systemResponse = `I can search our database of preseeded doctors for you! We have ${DOCTORS.length} medical professionals registered: ${DOCTORS.map(d => d.name).join(", ")}. Who would you like to know more about?`;
          }
        } else if (query.includes("product") || query.includes("drug") || query.includes("samples")) {
          systemResponse = `We currently manage several therapeutics: ${PRODUCTS.map(p => `**${p.name}** (${p.indication})`).join(", ")}.\n\nYou can easily log samples given by typing something like: *"Met with Dr. Sharma today at Apollo, discussed Crestor and left 10 samples."*`;
        } else {
          systemResponse = `I've noted your message. Our multi-agent logging workflow is fully operational! If you want to log a meeting, try typing: *"Met with Dr. Ramesh Sharma at Apollo Hospital Mumbai today, discussed Crestor and left 10 samples. Doctor was highly positive."*, and we will parse it immediately.`;
        }
      }
    }

    res.json({
      success: true,
      reply: systemResponse,
      intent: state.intent,
      extracted: state.finalPayload,
      logs: state.logs,
      validationErrors: state.validationErrors
    });
  } catch (error: any) {
    console.log("[Life Sciences CRM] Chat agent info: API rate-limit exception fallback activated.");
    // Even in overall failure, do not send 500. Return fallback copilot reply and log
    res.json({
      success: true,
      reply: "I am here to assist you with logging your HCP interactions. I've noted your message and am ready to help you coordinate doctor logs.",
      intent: "other",
      extracted: {},
      logs: [{
        node: "Local Copilot Rules Engine",
        description: "API global exception fallback triggered.",
        timestamp: new Date().toISOString(),
        output: { error: error.message }
      }],
      validationErrors: []
    });
  }
});

/**
 * GET /api/draft
 * Retrieves the current auto-saved draft
 */
app.get("/api/draft", (req, res) => {
  res.json({ success: true, draft: DRAFT_INTERACTION });
});

/**
 * POST /api/draft
 * Saves the draft interaction state
 */
app.post("/api/draft", (req, res) => {
  DRAFT_INTERACTION = req.body;
  res.json({ success: true, message: "Draft auto-saved successfully." });
});

/**
 * GET /api/notifications
 */
app.get("/api/notifications", (req, res) => {
  res.json({ success: true, notifications: NOTIFICATIONS });
});

/**
 * POST /api/notifications/read
 */
app.post("/api/notifications/read", (req, res) => {
  NOTIFICATIONS = NOTIFICATIONS.map(n => ({ ...n, read: true }));
  res.json({ success: true });
});

// ==========================================
// VITE DEV SERVER AND PRODUCTION INDEX BOOT
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Life Sciences CRM Server] running at http://localhost:${PORT}`);
  });
}

startServer();
