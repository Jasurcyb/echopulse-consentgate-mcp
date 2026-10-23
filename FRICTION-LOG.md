# Amazon Product Team Friction Log & Security Architecture Proposal
## Track: Alexa+ & Model Context Protocol (Spec 2025-11-25)

**Author:** Jasurcyb  
**Project:** ConsentGate MCP  
**Event:** Build, Ship, Shape: Amazon Developer Hackathon (`amazonappdev2026`)  
**Target Teams:** Alexa+ Developer Platform, Amazon Devices Security, MCP Standards Working Group  

---

## 1. Executive Summary

As Amazon pioneers the transition from rigid intent-slot Alexa Skills to autonomous, tool-calling **Agent Skills** powered by the open **Model Context Protocol (MCP)**, a fundamental security blindspot emerges in multi-tool consumer personal assistants: **The Confused Deputy / Cross-Tool Indirect Prompt Injection Vulnerability**.

When Alexa+ connects to an **untrusted ingestion tool** (`read_email`, `read_calendar_invite`, `read_delivery_instructions`, `fetch_web_recipe`) in the same execution context as an **irreversible physical or financial actuation tool** (`unlock_front_door`, `place_amazon_order`, `send_peer_payment`, `disarm_ring_alarm`), external untrusted text can program the assistant to act against the user's interests.

During the development and testing of `ConsentGate MCP` across our **108-scenario benchmark**, we observed that:
- Standard prompt guardrails and LLM system prompts fail to reliably prevent cross-tool escalation (**0.0% block rate** in naive agents; **6.9%** in keyword filters).
- The current **MCP Specification (`2025-11-25`)** lacks native metadata for tool consequence levels and data sensitivity.
- Below is our detailed friction log, protocol observations, and a backwards-compatible RFC proposal for the Amazon Developer Platform.

---

## 2. Friction Points & Protocol Observations

### Friction 1: Tool Schemas Lack Capability & Consequence Metadata
* **Current State:** The MCP tool definition schema (`tools/list`) defines `name`, `description`, and `inputSchema` (JSON Schema). There is no standard mechanism for an MCP server to declare:
  - Is this tool *read-only* or *state-mutating*?
  - Does calling this tool have *physical or financial consequences*?
  - What is the *trust boundary* of the data returned by this tool?
* **Pain Point:** Because consequence levels are opaque, Alexa+ treats all tool calls as peer functions. A call to `read_calendar_invite` and a call to `unlock_front_door` look identical in the JSON-RPC interface.
* **Proposed Extension:** Introduce optional `x-mcp-*` annotation attributes in the tool definition:
  ```json
  {
    "name": "unlock_front_door",
    "description": "Disengage smart deadbolt.",
    "x-mcp-consequence": "irreversible_high",
    "x-mcp-trust-boundary": "trusted_voice_only",
    "x-mcp-sensitivity": "critical_secret",
    "inputSchema": { ... }
  }
  ```

### Friction 2: Streamable HTTP Session Lifecycle & State Persistence
* **Current State:** In MCP Spec `2025-11-25`, sessions are tracked via the `Mcp-Session-Id` HTTP header. 
* **Pain Point:** For consumer devices like Echo Show that frequently sleep, drop Wi-Fi, or transition between access points, maintaining continuous Server-Sent Events (SSE) connections (`GET /mcp`) is fragile. When an SSE connection drops and reconnects, there is no standardized `Last-Event-ID` replay buffer specified in the MCP draft, leading to lost step-up notifications.
* **Developer Recommendation:** Standardize an SSE replay buffer using standard HTTP `Last-Event-ID` headers or explicit event sequence IDs in the MCP transport spec.

### Friction 3: Conversational Interruption & Echo Show Multimodal Synchronization
* **Current State:** When an agent skill detects a policy violation or needs human confirmation, returning a standard JSON-RPC error (`code: -32603`) aborts the conversational turn and results in a generic Alexa voice error (*"Sorry, something went wrong"*).
* **Pain Point:** In consumer voice experiences, an authorization challenge is **not an error** — it is an expected part of a secure workflow!
* **Our Solution in ConsentGate:** We introduced the `STEP_UP_REQUIRED` result envelope containing a **Provenance Diff** and a **2-word Phonetic Confirmation Code**. Alexa+ displays the visual difference on the Echo Show screen while speaking the confirmation phrase without crashing the session.

---

## 3. Recommended Roadmap for Alexa+ Agent Security

1. **Adopt Information-Flow Taint Tracking at the Platform Gateway:**
   Track whether context in an active session contains untrusted external text. If tainted, enforce step-up confirmation before dispatching physical access or financial tools.
2. **Standardize Voice Step-Up Codes for Echo Show:**
   Use phonetically distinct 2-word confirmation tokens (NATO phonetic or memorable adjective-noun pairs) rather than complex numeric PINs, which are difficult for elderly users or noisy rooms.
3. **Publish an Official "Agent Safety Test Corpus":**
   Amazon should release a reference test suite of indirect prompt injection vectors (similar to our 108-scenario corpus) to allow developers to certify their MCP servers and Agent Skills before publishing to the Alexa Skills Store.

---

*ConsentGate MCP was developed for the Amazon Developer Hackathon 2026. Code and reproducibility harness available under the MIT License.*
