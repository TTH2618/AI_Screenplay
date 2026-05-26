# 3. System Design

## 3.1 Formal Model of the Sequential Generation Pipeline

The core of the proposed system is an eight-step sequential generation pipeline in which each step produces structured output that serves as context input for the next. Let $\mathcal{T} = \{t_1, t_2, \ldots, t_8\}$ denote the ordered set of generation tools, where the tools are indexed as:

$$
t_1 = \text{logline},\; t_2 = \text{theme},\; t_3 = \text{character},\; t_4 = \text{synopsis},\; t_5 = \text{structure},\; t_6 = \text{beatsheet},\; t_7 = \text{scenelist},\; t_8 = \text{script}
$$

At each step $n$, the system maintains an accumulated context $C_n$ defined as the union of all prior outputs:

$$
C_0 = \emptyset, \qquad C_n = C_{n-1} \cup \{o_n\}, \quad n = 1, 2, \ldots, 8
$$

where $o_n$ denotes the accepted output of step $n$. The generation function at step $n$ is modeled as:

$$
g: \mathcal{T} \times \mathcal{C} \to \mathcal{O}
$$

mapping a tool identifier and an accumulated context to a candidate output. Concretely, $g$ constructs a system prompt $\sigma(t_n)$ and a user prompt $\rho(t_n, C_{n-1})$, then submits the pair to the large language model (LLM) endpoint:

$$
\hat{o}_n = \text{LLM}\bigl(\sigma(t_n),\; \rho(t_n, C_{n-1})\bigr)
$$

The full pipeline thus constitutes a sequential composition:

$$
o_8 = g(t_8, C_7) \circ g(t_7, C_6) \circ \cdots \circ g(t_1, C_0)
$$

ensuring that every downstream step is causally conditioned on the outputs of all upstream steps, producing a globally coherent screenplay artifact.

### 3.1.1 Pipeline Step Specification

The table below formally specifies each pipeline step, its tool identifier, the required output format, and the subset of accumulated context fields injected into the user prompt.

| Step | Tool $t_n$ | Output Artifact | Format Constraint | Context Injected $C_{n-1}$ |
|------|-----------|----------------|-------------------|---------------------------|
| 1 | `logline` | 1–2 sentences, 25–50 words, four required elements: protagonist · goal · conflict · stakes | Free prose | $\emptyset$ |
| 2 | `theme` | 14-section thematic analysis following the LIE→TRUTH dramatic arc | Markdown headings (strict order) | logline |
| 3 | `character` | JSON array of character profiles; each profile has exactly 8 mandatory fields | Pure JSON (machine-parseable) | logline, theme |
| 4 | `synopsis` | 500–800 words covering four narrative movements: setup · confrontation · crisis · resolution | Markdown | logline, theme, characters |
| 5 | `structure` | Four-act Story Circle (Dan Harmon) with per-act scene descriptions and character arc summary | Markdown | synopsis, characters, theme |
| 6 | `beatsheet` | 15-beat Save the Cat sheet (Blake Snyder) with scene page references | Markdown | synopsis, structure, characters |
| 7 | `scenelist` | Ordered list of $N$ scenes (user-specified), each described in 1–2 sentences | Numbered list | synopsis, structure, beatsheet, characters |
| 8 | `script` | Full Hollywood-format screenplay for exactly one scene; minimum 5 sub-shots | Screenplay format | entire $C_7$ + previous scene script |

### 3.1.2 Context Accumulation and Prompt Construction

At step $n$, the user prompt $\rho(t_n, C_{n-1})$ is assembled by the function `build_user_prompt` in `prompts.py`. The function selects the relevant subset of $C_{n-1}$ for each tool and injects it as labeled sections. Character data, being structured JSON persisted to the filesystem, is loaded from `uploads/characters/{project\_id}/` and deserialized before injection, ensuring that downstream steps always receive the most recently validated character set. Formally:

$$
\rho(t_n, C_{n-1}) = \bigoplus_{k < n,\; t_k \in \mathcal{D}(t_n)} \text{format}(o_k, t_k)
$$

where $\mathcal{D}(t_n)$ is the dependency set of tool $t_n$ (see Table above) and $\bigoplus$ denotes ordered string concatenation. The system prompt $\sigma(t_n)$ encapsulates the role definition, output format specification, and absolute constraints for the tool, and may be overridden at runtime through the `system_prompts` database table without redeploying the application.

---

## 3.2 Validation and Retry Mechanism

To enforce structural and semantic correctness of each generated output, the system employs a dedicated validation agent at every pipeline step. Let $\mathcal{K}_n$ denote the set of acceptance criteria defined for tool $t_n$. The validation function is modeled as:

$$
v_n: \mathcal{O} \to \{\texttt{pass}, \texttt{fail}\} \times \mathcal{F}
$$

where $\mathcal{F}$ is the set of structured feedback messages. When $v_n(\hat{o}_n) = (\texttt{fail}, f)$, the system appends the feedback $f$ to the generation context and issues a new request:

$$
\hat{o}_n^{(k+1)} = \text{LLM}\Bigl(\sigma(t_n),\; \rho(t_n, C_{n-1}) \;\|\; f^{(k)}\Bigr)
$$

where $\|$ denotes context concatenation and $k$ is the current attempt index. This retry loop is bounded by a maximum attempt count $K = 5$:

$$
\text{result}_n =
\begin{cases}
\hat{o}_n^{(k)} & \text{if } v_n\!\left(\hat{o}_n^{(k)}\right) = (\texttt{pass},\,\cdot\,),\; k \leq K \\
\hat{o}_n^{(K)} & \text{if all } K \text{ attempts fail (best-effort)}
\end{cases}
$$

This bounded retry strategy guarantees pipeline termination while progressively incorporating validator feedback, empirically increasing the probability that the output satisfies the defined criteria.

### 3.2.1 Per-Tool Acceptance Criteria

Each tool maintains a dedicated criteria string $\mathcal{K}_n$ that the validation LLM evaluates against the candidate output. The criteria are defined in `validator.py` under the `_CRITERIA` dictionary and cover both structural constraints (JSON parseability, heading order, minimum section count) and semantic constraints (character name consistency, thematic coherence, narrative causality). Key criteria per tool are summarized below:

- **logline**: four required elements present; length 25–50 words; genre clarity; originality.
- **theme**: exactly 14 headings in prescribed order; content for every section; thematic consistency with logline.
- **character**: valid JSON array; at minimum one protagonist, one antagonist, one supporting character; all 8 fields populated with required sub-fields (`ngoai_hinh` describes height, build, hair, eyes; `tinh_cach` includes Ghost/Wound, WANT vs NEED; `background` includes arc projection); all characters consistent with logline and theme.
- **synopsis**: character names match step-3 roster; four narrative movements present (pass if content is present, regardless of heading labels); causal coherence between movements.
- **structure**: four acts recognizable (headings may carry page-range annotations); each act has at minimum two event descriptions; character arc summary present.
- **beatsheet**: 15 beats in order; each beat has `Mục đích` and `Nội dung` fields; beat content consistent with structure.
- **scenelist**: scene count matches user request; each scene description is 1–2 sentences; scene titles match synopsis events.
- **script**: minimum 5 sub-shots; shot labels `[GÓC MÁY]` and `[TẠO HÌNH NHÂN VẬT]` present; dialogue and action lines in Hollywood format; continuity with previous scene maintained.

When validation fails, the validator LLM returns a structured issues list which `FormatFeedback` converts into an actionable feedback string $f$. This string is appended to the user prompt so that the next generation attempt explicitly addresses each identified deficiency.

---

## 3.3 Character File Persistence Subsystem

Character profiles occupy a privileged position in the pipeline: they are the only pipeline artifact stored both in the relational database and on the filesystem as individual JSON files. This dual persistence strategy is motivated by the need to inject character data as structured objects — rather than raw text — into downstream prompts.

When tool $t_3$ (or its story-analysis counterpart `story_character`) produces a validated output, the `save_characters` function in `character_files.py` executes the following procedure:

1. Parse the JSON array from the LLM response.
2. For each character object $c_i$ in the array, derive a filesystem-safe slug from `c_i.ho_ten`.
3. Write `uploads/characters/{project_id}/{slug}_{timestamp}.json`.
4. Return the list of written file paths for inclusion in the generation log.

The file naming convention encodes the project scope and creation timestamp, enabling versioned retrieval. At steps $n \geq 4$, the function `_load_characters_from_files(project_id)` reads all JSON files in the project directory and deserializes them into the `form_data.characters` list before prompt construction, so that every downstream step operates on the canonically validated character set.

If a character validation failure triggers a retry, the subsystem first deletes all character files created by the previous attempt before writing new ones, preventing stale character data from contaminating the retry prompt.

Formally, let $\Phi_p$ denote the character file set for project $p$ at time $\tau$:

$$
\Phi_p(\tau) = \bigl\{ \text{uploads/characters}/p/\text{slug}(c_i)\_\tau_i.\text{json} \mid c_i \in o_3 \bigr\}
$$

At each downstream step $n \geq 4$:

$$
\rho(t_n, C_{n-1}) \;\supset\; \bigoplus_{f \in \Phi_p(\tau_{\text{latest}})} \text{deserialize}(f)
$$

---

## 3.4 Script Continuity Mechanism

Step $t_8$ is invoked once per scene in the scene list produced by step $t_7$. Because a feature screenplay may contain 40–120 scenes, maintaining narrative and tonal continuity across sequential script calls is a non-trivial challenge. The system addresses this through two complementary mechanisms.

**Mechanism 1 — Scene Neighbor Context.** The helper `_extract_scene_neighbors` in `story_prompts.py` parses the full scene list and, for the scene at index $i$, injects into the prompt:

- The description of scene $i-1$ (labelled as *previously written; do not rewrite*).
- The description of scene $i$ (the current scene to write).
- The description of scene $i+1$ (labelled as *upcoming; do not anticipate in the current scene*).

This three-scene window ensures that each generated scene neither re-narrates prior events nor prematurely reveals future plot points.

**Mechanism 2 — Previous Script Injection.** When the caller provides a `previous_script` field in `form_data`, the full text of the already-written script for scene $i-1$ is embedded in the prompt with the directive:

> *Continue directly from the emotional and dramatic state at the end of the previous scene. Maintain the same tone, character voice, and narrative momentum.*

Formally, for scene index $i$ the user prompt is:

$$
\rho(t_8^{(i)}, C_7) = \text{BasePrompt}(t_8, C_7, \text{scene}_i) \;\|\; \text{Neighbors}(i) \;\|\; \text{PrevScript}(i-1)
$$

where $\text{PrevScript}(i-1) = \emptyset$ when $i = 1$.

---

## 3.5 Quota and Access-Control Model

The system enforces a differentiated access model over a user population $\mathcal{U}$ partitioned into two plan tiers: $\mathcal{U}_{\text{free}}$ and $\mathcal{U}_{\text{pro}}$. Let $\text{usage}(u, d)$ denote the number of AI generation requests issued by user $u \in \mathcal{U}$ on calendar date $d$. The access predicate is defined as:

$$
\text{allowed}(u, d) =
\begin{cases}
\texttt{true} & \text{if } u \in \mathcal{U}_{\text{pro}} \text{ and } \text{pro\_expires}(u) > d \\
\texttt{true} & \text{if } u \in \mathcal{U}_{\text{free}} \text{ and } \text{usage}(u, d) < \Lambda_{\text{free}} \\
\texttt{false} & \text{otherwise}
\end{cases}
$$

where $\Lambda_{\text{free}} = 10$ is the daily generation limit for free-tier accounts. A request that violates this predicate is rejected with HTTP status 429 before any LLM call is issued, thereby protecting API resources and enforcing the monetization boundary. The quota state $\text{usage}(u, d)$ is read from the `ai_generation_logs` table by `get_user_ai_quota_state` in `db_runtime.py` at the start of each generation request.

---

## 3.6 Authentication Model

Authentication relies on a dual-channel scheme. In the primary channel, a user registers with an email and a BCrypt-hashed password (cost factor 10) stored in the relational database. Upon successful credential verification, the server issues a signed JSON Web Token (JWT) of the form:

$$
\text{JWT} = \text{Base64}(H) \,.\, \text{Base64}(P) \,.\, \text{Sig}_{K_s}(H, P)
$$

where $H$ is the JOSE header, $P$ is the payload $\{id,\; email,\; username,\; is\_admin,\; plan\_type,\; pro\_expires\_at\}$, and $\text{Sig}_{K_s}$ is an HMAC-SHA256 signature computed with the server secret $K_s$. The token lifetime is set to $\tau = 7$ days, after which re-authentication is required.

In the secondary channel, the system supports Google OAuth 2.0. The client forwards the Google identity token $\tau_G$ to the server endpoint `/api/auth/google`, which validates it against the Google public key set and extracts the verified profile $(e, n, \text{sub})$ — email, display name, and subject identifier. A local account is then upserted deterministically:

$$
\text{account}(e) =
\begin{cases}
\text{existing user} & \text{if } e \in \mathcal{E}_{\text{DB}} \\
\text{new user}(\text{slug}(e)) & \text{otherwise}
\end{cases}
$$

where $\text{slug}(e)$ converts the email prefix to a collision-free alphanumeric username.

---

## 3.7 System Architecture

The proposed platform adopts a four-layer architecture with clear separation of responsibilities across each tier.

```
┌───────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                                │
│    Static HTML/CSS/JS · auth.html · dashboard.html · admin.html   │
│    Vanilla JS controllers · REST calls with Bearer JWT            │
└─────────────────────────┬─────────────────────────────────────────┘
                          │ REST API  (JWT Bearer)
┌─────────────────────────▼─────────────────────────────────────────┐
│              NODE.JS API LAYER  (Express · Port 3000)             │
│  /api/auth · /api/projects · /api/ai-responses                    │
│  /api/payment · /api/admin                                        │
│  MySQL Connection Pool (max 10) · Static file serving             │
└──────────────┬────────────────────────────┬───────────────────────┘
               │ HTTP  (internal proxy)     │ MySQL / utf8mb4
┌──────────────▼──────────────┐   ┌─────────▼──────────────────────┐
│  PYTHON AI LAYER            │   │  DATA PERSISTENCE LAYER         │
│  Flask · Port 5000          │   │  MySQL  Database: ai_screenplay  │
│  OpenRouter / Gemini Flash  │   │  Filesystem: uploads/           │
│  Prompt builder             │   │  characters/{proj_id}/*.json    │
│  Validation + Retry loop    │   │  stories/ · avatars/            │
└─────────────────────────────┘   └─────────────────────────────────┘
```

### 3.7.1 Frontend Layer

The presentation layer is implemented as static HTML pages (`home.html`, `auth.html`, `dashboard.html`, `admin.html`) served directly by the Express server, combined with modular JavaScript controllers in the `js/` directory. Each page communicates with the backend exclusively through authenticated REST calls carrying a Bearer JWT extracted from `localStorage` or `sessionStorage`. The frontend maintains a local project state object that accumulates context fields as pipeline steps are completed, ensuring that each subsequent tool call carries the full context produced so far.

### 3.7.2 Node.js API Layer

The primary backend is an Express.js server responsible for user authentication, project lifecycle management, AI response persistence, and payment processing. This layer exposes the following route groups:

- `/api/auth` — registration, login, Google OAuth callback, token refresh, and avatar upload.
- `/api/projects` — CRUD operations on user screenplay projects.
- `/api/ai-responses` — storage and retrieval of all AI-generated outputs associated with a project, partitioned across tool-specific tables (`loglines`, `themes`, `characters`, `synopses`, `structures`, `beatsheets`, `scenelists`, `scripts`).
- `/api/payment` — PayOS payment-link creation and webhook-based plan upgrade.
- `/api/admin` — privileged administrative operations gated by an `is_admin` flag, including user management, API credential rotation, and system prompt editing.

A MySQL connection pool (maximum 10 concurrent connections, charset `utf8mb4`) mediates all database interactions, providing efficient resource reuse under concurrent load.

### 3.7.3 Python AI Layer

A dedicated Python Flask microservice (port 5000) encapsulates all interactions with the large language model. This separation isolates the prompt engineering logic, validation agents, and AI provider configuration from the main application server. The service exposes a single generation endpoint (`POST /api/generate`) that accepts a `tool_id` and a `form_data` dictionary, builds the appropriate system and user prompts via `get_system_prompt` and `build_user_prompt`, invokes the OpenRouter gateway with model `google/gemini-2.0-flash-001` (temperature 0.7, max_tokens 4096) over HTTPS, and returns an HTML-formatted response after completing the validation-retry loop.

At runtime, the service resolves the active API key from the `api_credentials` table via `get_active_api_key`, allowing administrators to rotate credentials without redeploying the application. When the `character` or `story_character` tool is invoked, the service additionally parses the JSON array from the LLM response via `save_characters` and persists each character profile as an individual JSON file under `uploads/characters/{project_id}/`, making character data available as structured objects for downstream pipeline steps.

### 3.7.4 Data Persistence Layer

The MySQL database (`ai_screenplay`) hosts the following primary tables:

| Table | Contents |
|-------|----------|
| `users` | Account credentials, plan tier, PRO expiry date, ban status |
| `projects` | Screenplay project metadata per user |
| `loglines` | Step-1 pipeline outputs |
| `themes` | Step-2 pipeline outputs |
| `characters` | Step-3 pipeline outputs |
| `synopses` | Step-4 pipeline outputs |
| `structures` | Step-5 pipeline outputs |
| `beatsheets` | Step-6 pipeline outputs |
| `scenelists` | Step-7 pipeline outputs |
| `scripts` | Step-8 pipeline outputs (per scene) |
| `api_credentials` | Dynamically configurable LLM provider API keys |
| `system_prompts` | Database-overridable prompt templates per tool |
| `ai_generation_logs` | Timestamped records of every generation attempt (tool, model, status, latency, error) |
| `payment_orders` | Payment lifecycle records linked to PayOS order codes |

The filesystem complements the database by storing character profiles as versioned JSON files keyed by project identifier and creation timestamp, enabling structured injection into downstream prompts without parsing free-form text.

---

## 3.8 End-to-End Processing Workflow

The following sequence describes the complete request lifecycle for a single pipeline step.

```
User selects pipeline step on Dashboard
              │
              ▼
Frontend constructs POST /api/generate (Python API)
  { tool_id, form_data, user_id, project_id }
  Authorization: Bearer <JWT>
              │
              ▼
Python API: evaluate allowed(u, today)
  ├── FAIL (free tier, quota exhausted) ──► HTTP 429
  └── PASS ─────────────────────────────────────────────┐
                                                        │
              ┌─────────────────────────────────────────▼──────┐
              │  get_active_api_key(provider)  ← api_credentials│
              │  get_system_prompt(tool_id)    ← system_prompts  │
              │  build_user_prompt(tool_id, C_{n-1})             │
              └─────────────────────────────────────────────────┘
                                                        │
              ▼                                         │
  ┌─── Validation-Retry Loop (max K=5) ───────────────┐ │
  │                                                   │ │
  │   LLM(σ(t_n), ρ(t_n, C_{n-1}) ‖ feedback_k)      │ │
  │          │                                        │ │
  │          ▼                                        │ │
  │   validate(t_n, ô_n, C_{n-1})                     │ │
  │     ├── PASS ─────────────────────────────────────┘ │
  │     └── FAIL (k < K): append feedback ──► retry     │
  │                       (k = K): best-effort output   │
  └───────────────────────────────────────────────────  │
                                                        │
              ▼
  if tool_id ∈ {character, story_character}:
      parse JSON → save_characters(o_n, project_id)
              │
              ▼
  log_generation(user_id, project_id, tool_id,
                 verdict, latency, model)
              │
              ▼
  Return HTML-formatted o_n to frontend
              │
              ▼
Frontend displays result; updates local context C_n
  (next pipeline step will carry o_n in form_data)
              │
              ▼
  (Optional) User clicks Save → POST /api/ai-responses
  Node.js persists o_n to tool-specific DB table
```

The architecture ensures a clean separation between the stateless AI generation concern (Python layer), the stateful session and project management concern (Node.js layer), and the persistent storage concern (MySQL and filesystem layers). Concurrent requests are handled independently at the Python service level, with per-user quota enforcement providing the only shared-state coordination point.

---

## 3.9 Story Analysis Pipeline

In addition to the original screenplay creation pipeline, the system provides a parallel set of tools prefixed with `story_` that analyze an existing narrative text and produce equivalent artifacts. The seven story analysis tools map one-to-one to steps 2–8 of the original pipeline:

| Tool ID | Function |
|---------|----------|
| `story_theme` | Analyzes the thematic structure, LIE/TRUTH arc, and character journey of the source text |
| `story_character` | Extracts and profiles each character (role, arc, Ghost/Wound, WANT vs NEED) |
| `story_synopsis` | Rewrites a four-movement cinematic synopsis from the source narrative |
| `story_structure` | Maps the source text onto a four-act Story Circle structure |
| `story_beatsheet` | Aligns the source narrative to the 15-beat Save the Cat framework |
| `story_scenelist` | Segments the source narrative into a numbered scene list |
| `story_script` | Writes Hollywood-format screenplay for individual scenes derived from the source |

The user uploads the source text (stored in the `stories` table), which is then injected as an additional context field into the prompts for each `story_*` tool. All validation, retry, and character file persistence mechanisms from Sections 3.2 and 3.3 apply identically to the story analysis pipeline.

---

## 3.10 Core Algorithms

Based on the theoretical foundations established above, the system's core algorithms are described using pseudocode as follows.

---

**Algorithm GENERATE_SCREENPLAY_STEP**

Input: tool_id $t_n$, accumulated context $C_{n-1}$, user_id $u$, project_id $p$

```
1.  if ¬ allowed(u, today) then
2.      return QUOTA_EXCEEDED

3.  σ  ← GetSystemPrompt(t_n)          // from DB or code fallback
4.  ρ  ← BuildUserPrompt(t_n, C_{n-1}) // inject relevant context fields
5.  k  ← 0

6.  repeat
7.      k ← k + 1
8.      ô ← LLM(σ, ρ)                  // call OpenRouter / Gemini Flash
9.      (verdict, f) ← Validate(t_n, ô, C_{n-1})
10.     if verdict = PASS then break
11.     ρ ← ρ ‖ f                       // append feedback for next attempt
12. until k ≥ K                        // K = 5

13. o_n ← ô
14. if t_n ∈ T_char then
15.     SaveCharacterFiles(o_n, p)      // parse JSON, write .json files
16. LogGeneration(u, p, t_n, verdict, latency)
17. C_n ← C_{n-1} ∪ {o_n}
18. return o_n
```

---

**Algorithm VALIDATE_STEP_OUTPUT**

Input: tool_id $t_n$, candidate output $\hat{o}$, context $C_{n-1}$

```
1.  K_n ← GetCriteria(t_n)             // per-tool acceptance criteria string
2.  σ_v ← GetValidationPrompt(t_n)
3.  ρ_v ← BuildValidationUserPrompt(ô, C_{n-1}, K_n)
4.  r   ← LLM(σ_v, ρ_v)
5.  Parse r into (verdict, issues)
6.  if verdict = PASS then return (pass, ∅)
7.  f ← FormatFeedback(issues)
8.  return (fail, f)
```

---

**Algorithm SAVE_CHARACTER_FILES**

Input: raw LLM output $o_3$, project_id $p$

```
1.  DeleteExistingCharacterFiles(p)    // purge stale files from prior attempt
2.  chars ← ParseJSONArray(o_3)
3.  saved ← []
4.  for each c_i in chars:
5.      slug ← Slugify(c_i.ho_ten)
6.      ts   ← CurrentTimestamp()
7.      path ← "uploads/characters/" + p + "/" + slug + "_" + ts + ".json"
8.      WriteFile(path, Serialize(c_i))
9.      saved.append(path)
10. return saved
```

---

**Algorithm UPGRADE_USER_PLAN**

Input: user_id $u$, package_id $p$, payment_order_code $c$

```
1.  if ¬ VerifyPayOSWebhookSignature(c) then
2.      return REJECTED
3.  pkg         ← PLAN_PACKAGES[p]
4.  t_current   ← GetProExpiresAt(u)
5.  t_base      ← max(now, t_current)  // accumulate on existing PRO time
6.  t_new       ← t_base + pkg.months
7.  UPDATE users SET plan_type = 'pro', pro_expires_at = t_new WHERE id = u
8.  INSERT INTO payment_orders (u, p, c, amount, PAID)
9.  return SUCCESS
```

---

## 3.11 Admin Configuration System

The administration panel (`admin.html`) exposes runtime configuration capabilities that decouple operational tuning from code deployment:

- **API Credential Management**: administrators can add, update, or deactivate LLM provider API keys through the `/api/admin/credentials` endpoint. The Python AI service resolves the active key at request time via `get_active_api_key`, so credential rotation takes effect immediately without restart.

- **System Prompt Editing**: every tool's system prompt $\sigma(t_n)$ has a corresponding row in the `system_prompts` table. Administrators can edit prompt text directly from the admin panel. When a row is present for a given `tool_id`, `GetSystemPrompt` returns the database value; otherwise, it falls back to the hardcoded default in `prompts.py`. This allows prompt engineering iterations to be deployed as database updates rather than code commits.

- **Generation Log Monitoring**: the `ai_generation_logs` table records the tool identifier, LLM provider, model version, HTTP status, end-to-end latency, and error message for every generation attempt. The admin panel exposes these logs with filtering by user, tool, date range, and status, enabling diagnosis of validation failures and latency anomalies.

- **Usage Statistics**: aggregate query results over `ai_generation_logs` and `users` drive the dashboard statistics panels (total users, new users per period, active PRO accounts, total projects, total AI generations, 14-day PRO growth chart).

---

**Fig. 1.** The eight-step sequential screenplay generation pipeline. Each node represents a generation step $t_n$; arrows denote the flow of accumulated context $C_n$ from one step to the next. The validation-retry loop (bounded at $K=5$) operates internally at each node before the output is accepted and added to the context.

---

**Fig. 2.** The four-layer system architecture of the AI-assisted screenplay generation platform, illustrating the data flow from the frontend through the Node.js API gateway, the Python AI microservice, and the MySQL/filesystem persistence layer.
