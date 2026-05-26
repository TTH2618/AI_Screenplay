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

## 3.3 Quota and Access-Control Model

The system enforces a differentiated access model over a user population $\mathcal{U}$ partitioned into two plan tiers: $\mathcal{U}_{\text{free}}$ and $\mathcal{U}_{\text{pro}}$. Let $\text{usage}(u, d)$ denote the number of AI generation requests issued by user $u \in \mathcal{U}$ on calendar date $d$. The access predicate is defined as:

$$
\text{allowed}(u, d) =
\begin{cases}
\texttt{true} & \text{if } u \in \mathcal{U}_{\text{pro}} \\
\texttt{true} & \text{if } u \in \mathcal{U}_{\text{free}} \text{ and } \text{usage}(u, d) < \Lambda_{\text{free}} \\
\texttt{false} & \text{otherwise}
\end{cases}
$$

where $\Lambda_{\text{free}} = 10$ is the daily generation limit for free-tier accounts. A request that violates this predicate is rejected with HTTP status 429 before any LLM call is issued, thereby protecting API resources and enforcing the monetization boundary.

## 3.4 Authentication Model

Authentication relies on a dual-channel scheme. In the primary channel, a user registers with an email and a BCrypt-hashed password stored in the relational database. Upon successful credential verification, the server issues a signed JSON Web Token (JWT) of the form:

$$
\text{JWT} = \text{Base64}(H) \,.\, \text{Base64}(P) \,.\, \text{Sig}_{K_s}(H, P)
$$

where $H$ is the JOSE header, $P$ is the payload (user id, plan tier, expiry), and $\text{Sig}_{K_s}$ is an HMAC-SHA256 signature computed with the server secret $K_s$. The token lifetime is set to $\tau = 7$ days, after which re-authentication is required.

In the secondary channel, the system supports Google OAuth 2.0. The client forwards the Google identity token $\tau_G$ to the server, which validates it against the Google public key set and extracts the verified profile $(e, n, \text{sub})$ — email, display name, and subject identifier. A local account is then upserted deterministically:

$$
\text{account}(e) =
\begin{cases}
\text{existing user} & \text{if } e \in \mathcal{E}_{\text{DB}} \\
\text{new user}(\text{slug}(e)) & \text{otherwise}
\end{cases}
$$

where $\text{slug}(e)$ converts the email prefix to a collision-free alphanumeric username.

## 3.5 System Architecture

The proposed platform adopts a four-layer architecture with clear separation of responsibilities across each tier.

### 3.5.1 Frontend Layer

The presentation layer is implemented as server-side rendered static HTML pages (home.html, auth.html, dashboard.html, admin.html) combined with modular JavaScript controllers. Each page communicates with the backend exclusively through RESTful API calls, ensuring a stateless, single-page-application interaction pattern. The frontend is served directly by the Node.js Express server as static assets, eliminating the need for a separate web server.

### 3.5.2 Node.js API Layer

The primary backend is an Express.js server responsible for user authentication, project lifecycle management, AI response persistence, and payment processing. This layer exposes the following route groups:

- `/api/auth` — registration, login, Google OAuth callback, token refresh, and avatar upload.
- `/api/projects` — CRUD operations on user screenplay projects.
- `/api/ai-responses` — storage and retrieval of all AI-generated outputs associated with a project.
- `/api/payment` — PayOS payment-link creation and webhook-based plan upgrade.
- `/api/admin` — privileged administrative operations gated by an `is_admin` flag.

A MySQL connection pool (maximum 10 concurrent connections) mediates all database interactions, providing efficient resource reuse under concurrent load.

### 3.5.3 Python AI API Layer

A dedicated Python Flask microservice (port 5000) encapsulates all interactions with the large language model. This separation isolates the prompt engineering logic, validation agents, and AI provider configuration from the main application server. The service exposes a single generation endpoint (`POST /api/generate`) that accepts a `tool_id` and a `form_data` dictionary, builds the appropriate system and user prompts, invokes the OpenRouter gateway with the configured model (`google/gemini-2.0-flash-001`), and returns an HTML-formatted response.

At runtime, the service resolves the active API key from the database, allowing administrators to rotate credentials without redeploying the application. When the `character` tool is invoked, the service additionally parses the JSON array from the LLM response and persists each character profile as an individual JSON file under `uploads/characters/{project_id}/`, making character data available for downstream pipeline steps.

### 3.5.4 Data Persistence Layer

The MySQL database (`ai_screenplay`) hosts the following primary tables:

- `users` — account credentials, plan tier, and PRO expiry date.
- `projects` — screenplay project metadata per user.
- `ai_generation_logs` — timestamped records of every generation attempt, including tool identifier, provider, model, status, latency, and error information.
- `api_credentials` — dynamically configurable LLM provider API keys managed by administrators.
- `system_prompts` — database-overridable prompt templates per tool, enabling prompt updates without code deployment.
- `payment_orders` — payment lifecycle records linked to PayOS order codes.

## 3.6 End-to-End Processing Workflow

The illustration below describes the end-to-end request lifecycle. A user navigates to the dashboard and selects a screenplay project. The frontend dispatches an authenticated request (Bearer JWT) to the Node.js API, which validates the token and verifies plan-tier access. The API then forwards the generation request to the Python AI microservice, carrying the tool identifier, accumulated context fields, and user quota metadata.

Within the Python service, the quota predicate $\text{allowed}(u, d)$ is evaluated first. If satisfied, the service constructs the prompt pair $(\sigma(t_n), \rho(t_n, C_{n-1}))$ and submits it to the OpenRouter endpoint over HTTPS. The response is parsed, formatted to HTML, and — if the tool produces character data — serialized to the filesystem. The result is returned to the Node.js layer, which persists the AI response to the database and relays the formatted content to the frontend.

On the client side, the received HTML is injected into the tool panel and the context fields are updated in the browser's project state, so that the next pipeline step will carry all prior outputs as part of its prompt. This ensures the progressive accumulation of context described formally in Section 3.1.

Concurrently, the generation attempt is recorded in the `ai_generation_logs` table regardless of success or failure, capturing the tool identifier, provider, model version, HTTP status, and end-to-end latency. This audit trail enables administrators to monitor usage patterns, diagnose errors, and compute the performance metrics described in Section 4.

The architecture ensures a clean separation between the stateless AI generation concern (Python layer), the stateful session and project management concern (Node.js layer), and the persistent storage concern (MySQL and filesystem layers). Static character data is preserved as versioned JSON files keyed by project and timestamp, while dynamic project state — tool outputs, user preferences, and plan upgrades — is managed entirely within the relational database, mirroring the static/dynamic separation principle of the broader Programmable Block Ownership framework.

---

**Fig. 2.** The four-layer architecture of the AI-assisted screenplay generation system, illustrating the data flow from the frontend through the Node.js API gateway, the Python AI microservice, and the MySQL persistence layer.

---

## 3.7 Core Algorithms

Based on the theoretical foundations established above, the system's core algorithms are described using pseudocode as follows.

---

**Algorithm GENERATE_SCREENPLAY_STEP**

Input: tool_id $t_n$, accumulated context $C_{n-1}$, user_id $u$, project_id $p$

1. &nbsp;&nbsp;&nbsp;&nbsp;if $\neg\,\text{allowed}(u,\, \text{today})$ then return `QUOTA_EXCEEDED`
2. &nbsp;&nbsp;&nbsp;&nbsp;$\sigma \leftarrow \text{GetSystemPrompt}(t_n)$
3. &nbsp;&nbsp;&nbsp;&nbsp;$\rho \leftarrow \text{BuildUserPrompt}(t_n, C_{n-1})$
4. &nbsp;&nbsp;&nbsp;&nbsp;$k \leftarrow 0$
5. &nbsp;&nbsp;&nbsp;&nbsp;**repeat**
6. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$k \leftarrow k + 1$
7. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$\hat{o} \leftarrow \text{LLM}(\sigma,\, \rho)$
8. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$(verdict, f) \leftarrow \text{Validate}(t_n,\, \hat{o},\, C_{n-1})$
9. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if $verdict = \texttt{pass}$ then **break**
10. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$\rho \leftarrow \rho \;\|\; f$   &nbsp;&nbsp;/* append feedback for next attempt */
11. &nbsp;&nbsp;&nbsp;&nbsp;**until** $k \geq K$
12. &nbsp;&nbsp;&nbsp;&nbsp;$o_n \leftarrow \hat{o}$
13. &nbsp;&nbsp;&nbsp;&nbsp;if $t_n \in \mathcal{T}_{\text{char}}$ then `SaveCharacterFiles`$(o_n, p)$
14. &nbsp;&nbsp;&nbsp;&nbsp;`LogGeneration`$(u, p, t_n, verdict, \text{latency})$
15. &nbsp;&nbsp;&nbsp;&nbsp;$C_n \leftarrow C_{n-1} \cup \{o_n\}$
16. &nbsp;&nbsp;&nbsp;&nbsp;return $o_n$

---

**Algorithm VALIDATE_STEP_OUTPUT**

Input: tool_id $t_n$, candidate output $\hat{o}$, context $C_{n-1}$

1. &nbsp;&nbsp;&nbsp;&nbsp;$\mathcal{K} \leftarrow \text{GetCriteria}(t_n)$
2. &nbsp;&nbsp;&nbsp;&nbsp;$\sigma_v \leftarrow \text{GetValidationPrompt}(t_n)$
3. &nbsp;&nbsp;&nbsp;&nbsp;$\rho_v \leftarrow \text{BuildValidationUserPrompt}(\hat{o}, C_{n-1}, \mathcal{K})$
4. &nbsp;&nbsp;&nbsp;&nbsp;$r \leftarrow \text{LLM}(\sigma_v, \rho_v)$
5. &nbsp;&nbsp;&nbsp;&nbsp;Parse $r$ into $(verdict, issues)$
6. &nbsp;&nbsp;&nbsp;&nbsp;if $verdict = \texttt{PASS}$ then return $(\texttt{pass},\; \emptyset)$
7. &nbsp;&nbsp;&nbsp;&nbsp;$f \leftarrow \text{FormatFeedback}(issues)$
8. &nbsp;&nbsp;&nbsp;&nbsp;return $(\texttt{fail},\; f)$

---

**Algorithm UPGRADE_USER_PLAN**

Input: user_id $u$, package_id $p$, payment_order_code $c$

1. &nbsp;&nbsp;&nbsp;&nbsp;Verify PayOS webhook signature for order $c$
2. &nbsp;&nbsp;&nbsp;&nbsp;if signature invalid then return `REJECTED`
3. &nbsp;&nbsp;&nbsp;&nbsp;$\text{pkg} \leftarrow \text{PLAN\_PACKAGES}[p]$
4. &nbsp;&nbsp;&nbsp;&nbsp;Retrieve current $\text{pro\_expires\_at}(u)$ from database
5. &nbsp;&nbsp;&nbsp;&nbsp;$t_{\text{base}} \leftarrow \max(\text{now},\; \text{pro\_expires\_at}(u))$
6. &nbsp;&nbsp;&nbsp;&nbsp;$t_{\text{new}} \leftarrow t_{\text{base}} + \text{pkg.months}$
7. &nbsp;&nbsp;&nbsp;&nbsp;`UPDATE users SET plan_type = 'pro', pro_expires_at =` $t_{\text{new}}$ `WHERE id =` $u$
8. &nbsp;&nbsp;&nbsp;&nbsp;`INSERT INTO payment_orders` $(u, p, c, \text{amount}, \texttt{PAID})$
9. &nbsp;&nbsp;&nbsp;&nbsp;return `SUCCESS`
