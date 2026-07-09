# Log HCP Interaction — Life Sciences CRM Assistant

A high-fidelity, AI-First Healthcare Professional (HCP) CRM logging platform designed for life sciences representatives. Powered by a multi-agent server-side Gemini workflow, it allows field representatives to log structured interactions, compliance notes, and samples seamlessly through standard conversational text.

---

## 🌟 Core Features

- **Bimodal CRM Hub**: An interactive split-screen experience featuring a highly-structured clinical form on the left, synchronized in real time with an AI chat assistant on the right.
- **State-Preserving Multi-Turn Editing**: Iterative corrections are handled dynamically. Field representatives can say *"Actually, we met yesterday instead"* or *"Add Glucophage to the product list"*, and the agent merges these updates without resetting unchanged fields.
- **Precision HCP Extraction**: Extracts and maps 13 high-priority clinical and interaction fields without hallucinating or injecting pre-seeded placeholder data.
- **Fail-Safe Resilience Engine**: Implements deep, rule-based programmatic heuristic engines. If upstream LLM rate limits (`RESOURCE_EXHAUSTED`) are encountered, the system gracefully falls back to deterministic parsing to ensure zero-downtime operation.
- **Visual Alert & Highlight Overlays**: Visual feedback loops in the form indicate newly updated fields, confidence percentages, missing mandatory indicators, and real-time clinical alerts.

---

## 🤖 Multi-Agent LangGraph Workflow

Every update typed by the representative is fed through a structured, multi-agent pipeline designed to capture, validate, and persist medical CRM records.

### Architecture Pipeline

```text
                    User Message
                          │
                          ▼
                 1. Intent Agent
                          │
                          ▼
              2. Conversation Memory
                          │
                          ▼
             3. HCP Entity Extractor
                          │
                          ▼
             4. Medical NER Agent
                          │
                          ▼
             5. Date & Time Parser
                          │
                          ▼
              6. Validation Agent
                          │
                          ▼
               7. Merge State Agent
                          │
                          ▼
          8. Summary & Save Agent
                          │
                          ▼
                 PostgreSQL Database
```

### Detailed Agent Responsibilities

1. **Intent Agent (`runIntentDetectionNode`)**: Classifies query intent into `meeting_logging`, `follow_up`, `doctor_query`, or `other` to bypass heavy processing for casual conversation.
2. **Conversation Memory**: Merges multi-turn conversational history with the current draft session state to recognize and process human corrections and incremental edits.
3. **HCP Entity Extractor (`runHCPEntityExtractionAgentNode`)**: Parses the input string for 13 specific life sciences attributes (e.g. Doctor Name, Hospital, Specialty, Meeting Type, Samples, Competitor Mentions, etc.) avoiding fictional data injection.
4. **Medical NER Agent & Registry Grounding**: cross-checks literal names against the pre-seeded clinical HCP database to automatically enrich specialty and hospital details.
5. **Date & Time Parser (`runDateTimeExtractorNode`)**: Standardizes relative dates (e.g., "today", "last Monday") and varied formats into clean, structured ISO timestamps relative to the current operational time.
6. **Validation Agent (`runValidationAgentNode`)**: Analyzes parameters, checks mandatory constraints, computes field-level confidence scores, and signals the UI to highlight missing or low-confidence details.
7. **Merge State Agent (`runMergeExistingFormNode`)**: Performs high-fidelity state merging into the active draft, ensuring custom lists (like products) are correctly appended rather than overridden.
8. **Summary & Save Agent (`runSaveDraftNode`)**: Automatically synthesizes medical summaries and key action points, persisting finalized records securely.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS, Redux Toolkit, Framer Motion, Lucide Icons, Recharts.
- **Backend**: Express.js server (running on port `3000`), with integrated Vite development middleware.
- **Build Tooling**: Vite for static frontend compiling, bundling backend server TypeScript into a self-contained, optimized CJS file (`dist/server.cjs`) with `esbuild`.
- **AI Core**: Google GenAI SDK (`@google/genai`) invoking Gemini 3.5 models.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js 18 or higher installed on your local machine.
- A **Gemini API Key** to run the live multi-agent workflows.

### 1. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Install Dependencies
Run the package manager to download all necessary libraries:
```bash
npm install
```

### 3. Run Development Server
Launches the full-stack server running Express.js and the Vite dev server simultaneously:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the platform.

### 4. Production Compilation & Build
To bundle the frontend assets and compile the server-side TypeScript code into a single distribution module:
```bash
npm run build
```

### 5. Start Production Server
Start the production-ready server utilizing Node.js directly:
```bash
npm run start
```
LangGraph Multi-Agent HCP Extraction Workflow Tool
===================================================

The CRM application integrates a custom-designed, state-of-the-art Multi-Agent LangGraph workflow pipeline. This tool automates advanced clinical text extraction, conversational corrections, automated registry grounding, multi-field state merges, validation checks, and automatic draft caching.

Multi-Agent Pipeline Nodes & Architecture:
------------------------------------------
1. **Intent Detection Node (runIntentDetectionNode)**:
   - Analyzes incoming representative queries and transcripts.
   - Categorizes intent into structured classes: `meeting_logging`, `doctor_query`, `follow_up`, or `other`.
   - Incorporates robust offline heuristic fallbacks for high load scenarios.

2. **Conversation Memory Node (rfJi5GN23kBTCA6KLrWVND2B7BRERd9uE)**:
   - Seamlessly merges multi-turn chat history with the current draft state.
   - Detects user correction vs. addition states to preserve long-term session context.

3. **HCP Entity Extraction Agent Node (runHCPEntityExtractionAgentNode)**:
   - Centrally extracts all 13 CRM fields (Doctor Name, Hospital, Specialization, Meeting Date, Meeting Time, Meeting Type, Products Discussed, Samples Given, Competitor Mentioned, Doctor Feedback, Representative Notes, Follow-up Date, Priority) exactly as written.
   - Prevents hallucinations and guarantees zero default/placeholder value injection.

4. **Date & Time Parser Node (runDateTimeExtractorNode)**:
   - Standardizes and parses relative meeting dates (e.g. "today", "yesterday", "next Friday") and diverse time strings into clean ISO dates and structured AM/PM times.

5. **Validation Agent Node (runValidationAgentNode)**:
   - Examines complete form parameters and calculates field-by-field confidence scores.
   - Triggers clarification prompts if confidence falls below 80% to maintain database integrity.

6. **Merge Existing Form Node (runMergeExistingFormNode)**:
   - Performs high-fidelity state merging into the active draft CRM state, implementing strict field preservation and unique product array merge rules.

7. **Update Changed Fields Node (runUpdateChangedFieldsNode)**:
   - Computes precise field-level deltas to track and highlight newly changed information without resetting the form.

8. **Save Draft Node (runSaveDraftNode)**:
   - Automatically builds professional medical summaries and action items, then persists the finalized interaction to the server-side registry.

Fail-Safe Resiliency Engine:
---------------------------
- **High-Fidelity Heuristic Fallbacks**: All pipeline nodes implement custom programmatic heuristic engines to mitigate upstream API quota limits (`RESOURCE_EXHAUSTED`).
- **Rule-Based Extractors**: Guarantees zero-downtime parsing of doctor titles, specialties, hospital keywords, and numerical sample counts.
- **State Merging Consistency**: Performs secure, deep, state-preserving merges client-side and server-side.


                    User Message
                          │
                          ▼
                 1. Intent Agent
                          │
                          ▼
              2. Conversation Memory
                          │
                          ▼
             3. HCP Entity Extractor
                          │
                          ▼
             4. Medical NER Agent
                          │
                          ▼
             5. Date & Time Parser
                          │
                          ▼
              6. Validation Agent
                          │
                          ▼
               7. Merge State Agent
                          │
                          ▼
               8. Summary & Save Agent
                          │
                          ▼
                  PostgreSQL Database
  
#############################    PICTURE #################################################
  <img width="1916" height="873" alt="image" src="https://github.com/user-attachments/assets/6307eea0-9aa6-4e28-bb51-9aef2fd8765d" />

  <img width="1920" height="875" alt="image" src="https://github.com/user-attachments/assets/466f3200-6519-44a2-9f05-3cb787e7bd76" />

  <img width="1918" height="860" alt="image" src="https://github.com/user-attachments/assets/12ec6269-a82d-442f-834b-fa9cdaeda6c5" />

  <img width="1918" height="868" alt="image" src="https://github.com/user-attachments/assets/0dccb03f-8694-4dd3-a813-f46385d14a2c" />




         
                 


