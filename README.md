# ⚡🛡️ EchoPulse & ConsentGate MCP — Multimodal Acoustic Home Triage & Information-Flow Firewall for Alexa+

> **"Hear the mechanical fault. See the X-Ray blueprint. Stage the exact \$28 Amazon Prime OEM part. Block lethal hazards and Confused Deputy prompt injections at the MCP transport boundary."**

[![Live Demo: Echo Show 15 Wall Hub](https://img.shields.io/badge/🌐_Live_Interactive_Demo-Echo_Show_15_Wall_Hub-f59e0b?style=for-the-badge)](https://jasurcyb.github.io/echopulse-consentgate-mcp/)
[![Track: Alexa+ ($25,000)](https://img.shields.io/badge/Track-Alexa%2B_Agent_Skills-0284c7?style=for-the-badge&logo=amazon-alexa)](#%EF%B8%8F-hackathon-track--mini-challenge-verification-matrix)
[![AWS Builder Mini-Challenge](https://img.shields.io/badge/AWS_Builder-Bedrock_%2B_DynamoDB-ff9900?style=for-the-badge&logo=amazon-aws)](#%EF%B8%8F-hackathon-track--mini-challenge-verification-matrix)
[![MCP Protocol: 2025-11-25](https://img.shields.io/badge/MCP_Spec-2025--11--25_Streamable_HTTP-06b6d4?style=for-the-badge)](#-live-mcp-2025-11-25-streamable-http-api-verification)
[![DSP Engine: Radix-2 FFT](https://img.shields.io/badge/DSP-2048pt_Radix--2_Cooley--Tukey_FFT-10b981?style=for-the-badge)](#-mathematical--algorithmic-formulation)
[![Zero Dependencies](https://img.shields.io/badge/Supply_Chain-0_npm_Dependencies-8b5cf6?style=for-the-badge)](#-quickstart-zero-dependencies--nodejs-built-ins-only)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](./LICENSE)

---

## 🌐 Try It Immediately (Zero Setup Required)

- **🖥️ Live Interactive Echo Show 15 Wall Hub (GitHub Pages):** **[https://jasurcyb.github.io/echopulse-consentgate-mcp/](https://jasurcyb.github.io/echopulse-consentgate-mcp/)**
  - Includes **Studio Neural AI Voiceover** (`en-US-AvaNeural` & `en-US-GuyNeural`), **8 Physics-Synthesized Appliance & Hazard Presets**, **Live Microphone FFT Capture (`🎙️ Live Mic`)**, **Interactive SVG X-Ray Appliance Blueprints**, **Confused Deputy Attack Arena**, and **Live MCP `2025-11-25` JSON-RPC Inspector**.
- **⚡ Local Streamable HTTP MCP Server + Automated Verification:**
  ```bash
  git clone https://github.com/Jasurcyb/echopulse-consentgate-mcp.git
  cd echopulse-consentgate-mcp
  npm test            # Runs 9 automated verification suites in < 550ms
  npm run benchmark   # Executes all 220 quantitative evaluations (112 PCM waveforms + 108 IFC scenarios)
  npm start           # Starts MCP 2025-11-25 Streamable HTTP server + Web UI on http://localhost:8080
  ```

---

## 🏛️ Hackathon Track & Mini-Challenge Verification Matrix

For judges reviewing across the primary track and mini-challenges, every requirement maps directly to self-contained, verifiable modules in this repository:

| Category | Official Requirement | Implementation & Verification in This Repository |
|---|---|---|
| **Primary Track: Alexa+** | Working **MCP (`2025-11-25` Streamable HTTP)** integration + **Open Agent Skills** + **Simulated Alexa+ Web Experience** | • **MCP `2025-11-25` Server:** [`server.js`](./server.js) & [`mcp/server-core.js`](./mcp/server-core.js) (`POST /mcp`, `GET /mcp` SSE, `DELETE /mcp`, `Mcp-Session-Id`)<br>• **Agent Skill Manifest:** [`SKILL.md`](./SKILL.md) (16 tools, acoustic triage procedures, deterministic safety invariants)<br>• **Echo Show 15 Wall Hub:** [`index.html`](./index.html) & [`js/app.js`](./js/app.js) (60 FPS FFT spectrogram, X-Ray blueprints, neural voiceover) |
| **Mini-Challenge 1: AWS Builder** | Documented AWS integration (**Amazon Bedrock**, AgentCore, **Amazon DynamoDB**, etc.) | • **Amazon Bedrock Converse API + DynamoDB Ledger:** [`mcp/aws-adapter.js`](./mcp/aws-adapter.js) (`anthropic.claude-3-5-sonnet-20241022-v2:0` semantic intent anchor extraction + `ConsentGateAuditLedger` provenance storage)<br>• **100% Zero-Key Offline Fallback:** Judges can run and verify all tests immediately without configuring AWS credentials |
| **Mini-Challenge 2: Open Source** | Public, reusable open-source contribution during the hackathon window + Developer Friction Feedback | • **Zero-Dependency UMD Libraries:** [`engine/acoustic-dsp.js`](./engine/acoustic-dsp.js) & [`engine/lattice.js`](./engine/lattice.js) (MIT-licensed, run identically in Node.js and browsers with 0 transitive npm packages)<br>• **Amazon Developer Friction Log & RFC:** [`FRICTION-LOG.md`](./FRICTION-LOG.md) (3 concrete protocol RFCs for Alexa+ Agent Skills & MCP `2025-11-25`) |

---

## 🎯 Why EchoPulse & ConsentGate Exists

Every year, **68 million U.S. households** hear an unfamiliar mechanical sound from a washing machine, refrigerator, furnace, or water main—and face a costly dilemma:
1. **Pay \$185–\$280 just for an emergency technician visit** to diagnose a **\$22–\$39 OEM part** they could replace in 20 minutes.
2. **Ask a baseline text LLM**, which fails in two critical ways:
   - **Deaf to Mechanical Physics:** Text LLMs cannot compute a 2048-point Fast Fourier Transform, measure Total Harmonic Distortion ($\text{THD}\%$), distinguish a $2,424\text{ Hz}$ outer-race bearing screech from a $180\text{ Hz}$ rotor hum, or detect a lethal **240V Contactor Plasma Arc**.
   - **Vulnerable to Confused Deputy Hijacking:** When an autonomous Alexa+ agent scrapes third-party repair bulletins, calendar invites, emails, or courier notes over **MCP**, hidden **Indirect Prompt Injections** can hijack high-consequence tools—ordering counterfeit \$349 parts (`place_amazon_order`), unlocking smart deadbolts (`unlock_front_door`), or disarming Ring alarms (`disarm_ring_alarm`).

**EchoPulse & ConsentGate MCP** solves both problems deterministically:
1. **🎧 Real-Time 2048-Point Radix-2 Cooley-Tukey FFT (`engine/acoustic-dsp.js`):** Extracts exact harmonic signatures from live microphone audio or synthesized mechanical waveforms, identifies the failing component, and stages the exact **Amazon Prime OEM replacement part** (`#WPW10348269` — **\$28.40**, saving **\$186.60**).
2. **📐 Interactive X-Ray Appliance Blueprints:** Renders animated SVG cross-sections on the **Echo Show 15 Wall Hub** pinpointing the faulty sub-assembly in real time.
3. **🛡️ Deterministic Hazard Lockout & Information-Flow Control Firewall (`engine/lattice.js`):**
   - Automatically locks out DIY instructions and trips smart breakers/valves when **240V Electrical Arcing** or **UL-2034 Carbon Monoxide Temporal-4 ($3,104\text{ Hz}$)** hazards are detected.
   - Enforces formal capability triples $(\tau, \kappa, \sigma)$ across all **16 Alexa+ MCP tools**, intercepting Confused Deputy attacks at the MCP transport boundary with a visual **Provenance Diff** and **2-Word Phonetic Voice Step-Up Challenge** (`"Echo Falcon"`).

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph EchoShow["🖥️ Amazon Echo Show 15 Wall Hub (Voice + Mic + 60 FPS Display)"]
        Mic["🎙️ 16.384 kHz Live Mic / Web Audio Physics Synth"]
        Voice["🗣️ Verified User Voice Utterance (Intent Anchor)"]
        Screen["📐 Live 60 FPS FFT Spectrogram + X-Ray Blueprint + Voice Step-Up UI"]
    end

    subgraph MCPServer["⚡ EchoPulse & ConsentGate MCP Server (Spec 2025-11-25 Streamable HTTP)"]
        FFT["1. Radix-2 Cooley-Tukey FFT & Blackman-Harris Spectral Classifier"]
        Hazard["2. Life-Safety Hazard Lockout (240V Plasma Arc & UL-2034 CO T4)"]
        Lattice["3. ConsentGate IFC Taint Lattice (τ, κ, σ) & Provenance Diff"]
    end

    subgraph Ecosystem["🏠 Amazon Home, Commerce & Cloud Ecosystem"]
        Prime["🛒 Amazon Prime Verified OEM Part Staging (#WPW10348269)"]
        SmartHome["🔌 Ring Alarm, Smart Locks, Smart Water Valve & 240V Breaker"]
        AWS["☁️ Amazon Bedrock Converse API + DynamoDB Audit Ledger"]
    end

    Mic --> FFT
    Voice --> Lattice
    FFT --> Hazard
    Hazard -->|"Safe DIY Fault"| Prime
    Hazard -->|"Lethal 240V / CO T4"| SmartHome
    FFT --> Screen
    Lattice -->|"BLOCKED / STEP_UP_REQUIRED"| Screen
    Lattice -->|"ALLOWED (Clean or Voice Token Verified)"| SmartHome
    Lattice --> AWS
```

---

## 🔬 Mathematical & Algorithmic Formulation

### 1. 4-Term Blackman-Harris Windowed Radix-2 FFT (`engine/acoustic-dsp.js`)
To eliminate spectral leakage between adjacent $8\text{ Hz}$ frequency bins ($f_s = 16,384\text{ Hz}, N = 2048$), each time-domain frame $x[n]$ is weighted by the 4-term Blackman-Harris window ($-92\text{ dB}$ sidelobe floor) prior to in-place Cooley-Tukey bit-reversal decimation:

$$w[n] = 0.35875 - 0.48829\cos\left(\frac{2\pi n}{N-1}\right) + 0.14128\cos\left(\frac{4\pi n}{N-1}\right) - 0.01168\cos\left(\frac{6\pi n}{N-1}\right)$$

From the Welch-averaged power spectrum $P[k] = |X[k]|^2$, EchoPulse extracts:
- **Total Harmonic Distortion ($\text{THD}\%$):**
  $$\text{THD}(\%) = 100 \times \frac{\sqrt{\sum_{m=2}^{6} P[m \cdot k_0]}}{P[k_0]}$$
- **Time-Domain Crest Factor ($\text{dB}$) & Pulse Duty Ratio:** Distinguishes continuous mechanical hums from transient copper-pipe water-hammer shockwaves ($\text{Crest} > 11.5\text{ dB}$) and **UL-2034 Temporal-4** Carbon Monoxide alarms ($3,104\text{ Hz}$ carrier with 4-chirp cadence).
- **High-Frequency Plasma/Arc Energy Ratio ($R_{\text{HF}}$):** Detects broadband $>3.5\text{ kHz}$ sputter characteristic of 240V contactor arcing ($R_{\text{HF}} > 8.5\%$) combined with $120/180/300\text{ Hz}$ line-frequency intermodulation.

### 2. ConsentGate Information-Flow Control (IFC) Lattice (`engine/lattice.js`)
Every MCP tool $T_i$ is assigned a static capability triple $(\tau_i, \kappa_i, \sigma_i)$ over a bounded lattice $(\mathcal{L}, \sqsubseteq)$:
- **Trust Level $\tau \in \{0:\text{UNTRUSTED\_EXTERNAL},\; 1:\text{SEMI\_TRUSTED\_SKILL},\; 2:\text{VERIFIED\_USER\_VOICE}\}$**
- **Consequence Class $\kappa \in \{0:\text{READ\_ONLY},\; 1:\text{REVERSIBLE\_WRITE},\; 2:\text{CRITICAL\_EXTERNAL},\; 3:\text{PHYSICAL\_FINANCIAL}\}$**
- **Scope Domain $\sigma \in \{\text{INFO}, \text{DIAGNOSTICS}, \text{COMMERCE}, \text{FINANCE}, \text{PHYSICAL\_ACCESS}, \text{LIFE\_SAFETY}, \text{COMMS}, \text{AUTOMATION}\}$**

As an Alexa+ session executes a sequence of tool calls $T_1, T_2, \dots, T_t$, the session context taint evolves monotonically:

$$\tau_{\text{ctx}}^{(t)} = \max\left(\tau_{\text{ctx}}^{(t-1)},\; \tau_{\text{source}}(T_t)\right)$$

Whenever a tool with $\kappa(T_t) \ge 2$ is invoked while $\tau_{\text{ctx}}^{(t)}$ is tainted by untrusted data (`fetch_repair_bulletin`, `read_calendar_invite`, `read_delivery_instructions`, `read_email`) and lacks an explicit user **Intent Anchor** ($T_t \notin \mathcal{A}(u_0)$), execution is deterministically halted at the MCP boundary until the user speaks a cryptographic **HMAC-SHA256 2-Word Voice Step-Up Token**.

---

## 📊 Dual Reproducible Benchmark Results (220 Total Evaluations)

Run `npm run benchmark` to execute both quantitative suites from scratch in under 250ms and regenerate [`data/results.json`](./data/results.json):

### Suite A: Radix-2 FFT Acoustic Fault Classification Across AWGN Noise Tiers (112 PCM Waveforms)
Evaluates 16,384-sample floating-point PCM waveforms synthesized across **7 physical fault & baseline classes** (`washer_drain_pump_cavitation`, `fridge_evap_fan_frost_rub`, `hvac_capacitor_60hz_hum`, `furnace_inducer_bearing_wear`, `plumbing_water_hammer_transient`, `electrical_panel_240v_arc_hazard`, `carbon_monoxide_ul2034_temporal4`) at **4 calibrated Additive White Gaussian Noise (AWGN) SNR levels** (`+20 dB`, `+12 dB`, `+6 dB`, `0 dB` × 4 seeds):

| Noise Condition (AWGN) | Waveforms Tested | Spectral Classification Accuracy | Wilson 95% Confidence Interval | Lethal Hazard Lockout Recall (240V Arc & CO T4) |
|---|---|---|---|---|
| **+20 dB SNR (Quiet Room)** | 28 | **`100.0%` (28 / 28)** | `[87.9% — 100.0%]` | **`100.0%` (8 / 8)** |
| **+12 dB SNR (Moderate Ambient)** | 28 | **`100.0%` (28 / 28)** | `[87.9% — 100.0%]` | **`100.0%` (8 / 8)** |
| **+6 dB SNR (Heavy Household Noise)** | 28 | **`100.0%` (28 / 28)** | `[87.9% — 100.0%]` | **`100.0%` (8 / 8)** |
| **0 dB SNR (Extreme Noise Power = Signal)** | 28 | **`100.0%` (28 / 28)** | `[87.9% — 100.0%]` | **`100.0%` (8 / 8)** |
| **Pooled Total (All SNR Tiers)** | **112** | **`100.0%` (112 / 112)** | **`[96.7% — 100.0%]`** | **`100.0%` (32 / 32)** |

### Suite B: Cross-Tool Indirect Prompt Injection Benchmark (108 Multi-Turn Scenarios)
Evaluates **72 adversarial Confused Deputy attacks** across 6 families (`calendar_trojan`, `delivery_note_hijack`, `commerce_skimming`, `pii_exfiltration`, `routine_persistence`, `acoustic_tv_spoof`) + **36 legitimate multi-step household controls**:

| Execution Paradigm | Attack Block Rate (Recall) | False Positive Rate (FPR) | Voice Step-Up Challenges | Wilson 95% Confidence Interval |
|---|---|---|---|---|
| **Unprotected Baseline Agent** | `0.0%` (0 / 72) | `0.0%` (0 / 36) | 0 | `[0.0% — 5.1%]` |
| **Heuristic Keyword Filter** | `6.9%` (5 / 72) | `0.0%` (0 / 36) | 0 | `[2.7% — 15.3%]` |
| **ConsentGate IFC Lattice (`2025-11-25`)** | **`100.0%` (72 / 72)** | **`0.0%` (0 / 36)** | **40** | **`[94.9% — 100.0%]`** |

---

## 🔌 Live MCP `2025-11-25` Streamable HTTP API Verification

Once `npm start` is running on `http://localhost:8080`, you can verify the **Model Context Protocol (`2025-11-25`)** endpoint directly via `curl`:

### 1. Initialize an MCP `2025-11-25` Session
```bash
curl -i -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","clientInfo":{"name":"alexa-plus-verifier","version":"1.0.0"}}}'
```

### 2. Run an Acoustic FFT Appliance Diagnostic (`echopulse_scan_appliance`)
```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echopulse_scan_appliance","arguments":{"presetId":"washer_drain_pump_cavitation","snrDb":18},"_meta":{"utterance":"Alexa, listen to my noisy washing machine and diagnose the part"}}}'
```

### 3. Verify Confused Deputy Interception (`CONSENTGATE_INTERCEPT`)
```bash
curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_delivery_instructions","arguments":{"packageId":"TBA-992"},"_meta":{"sessionId":"demo-hijack","utterance":"Alexa, check my delivery instructions"}}}'

curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"unlock_front_door","arguments":{"lockId":"front-deadbolt"},"_meta":{"sessionId":"demo-hijack"}}}'
```

---

## 🚀 Quickstart (Zero Dependencies — Node.js Built-ins Only)

In strict compliance with supply-chain security standards, this repository uses **0 external npm packages** (`package.json` has zero `dependencies` or `devDependencies`—100% immune to third-party npm supply-chain compromise).

```bash
# 1. Run the automated test suite (9 test suites covering FFT DSP, IFC Lattice, 220 benchmarks, and MCP 2025-11-25)
npm test

# 2. Run the dual quantitative benchmark (112 PCM waveforms + 108 security scenarios)
npm run benchmark

# 3. Start the Streamable HTTP MCP 2025-11-25 Server + Echo Show 15 Wall Hub UI
npm start
# Open http://localhost:8080 in your browser (or open index.html directly!)
```

---

## 📂 Repository Structure

```text
echopulse-consentgate-mcp/
├── engine/
│   ├── acoustic-dsp.js        # 2048-pt Radix-2 Cooley-Tukey FFT, Blackman-Harris window & PCM fault synth
│   └── lattice.js             # Deterministic Information-Flow Control (IFC) Lattice (16 Alexa+ MCP tools)
├── data/
│   ├── corpus.js              # 108 multi-turn scenarios (72 attacks across 6 families + 36 controls)
│   └── results.json           # Generated dual benchmark output (112 PCM waveforms + 108 IFC traces)
├── mcp/
│   ├── server-core.js         # Universal MCP Spec 2025-11-25 Engine (Streamable HTTP & In-Browser Loopback)
│   └── aws-adapter.js         # Amazon Bedrock Converse & DynamoDB audit adapter (zero-key offline fallback)
├── audio/                     # 11 studio-grade neural AI voiceover assets (en-US-AvaNeural & GuyNeural)
├── scripts/
│   └── run-benchmark.js       # Dual benchmark runner (Acoustic FFT SNR + Cross-Tool IFC + Wilson CIs)
├── tests/
│   └── consentgate.test.js    # Node.js native automated verification suite (9 test suites via node --test)
├── index.html                 # Echo Show 15 Acoustic & X-Ray Wall Hub + Confused Deputy Arena
├── css/styles.css             # Echo Show 15 hardware bezel, 60 FPS canvas & X-Ray SVG animations
├── js/app.js                  # 60 FPS spectrogram renderer, Web Audio synth, live mic & MCP inspector
├── server.js                  # Streamable HTTP MCP Server (POST /mcp, GET /mcp SSE, DELETE /mcp)
├── SKILL.md                   # Open Agent Skill manifest for Alexa+
├── FRICTION-LOG.md            # Engineering feedback & RFC for Amazon Alexa+ / MCP teams
├── vercel.json                # Zero-config deployment manifest
└── LICENSE                    # MIT License
```
