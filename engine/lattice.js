/**
 * ConsentGate MCP — Deterministic Information-Flow Control (IFC) Lattice Engine
 * 
 * Enforces formal non-interference and voice-intent anchoring over MCP (Spec 2025-11-25).
 * Neutralizes Cross-Tool Indirect Prompt Injections (Confused Deputy attacks)
 * at the protocol transport boundary without depending on probabilistic LLM classifiers.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ConsentGateEngine = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---------- Security Lattice Definitions ----------
  const TRUST_LEVELS = {
    TRUSTED_USER: 3,       // Direct verified voice utterance
    HOUSEHOLD_SENSOR: 2,   // Local device state (Ring sensor, vault, local settings)
    UNTRUSTED_EXTERNAL: 1  // External text (emails, calendar invites, delivery notes, web content)
  };

  const CONSEQUENCE_CLASSES = {
    READ_ONLY: 0,
    STATE_MUTATING_LOW: 1,        // Inocuous non-destructive state changes
    STATE_MUTATING_PERSISTENT: 2, // Background routines, schedules, persistent triggers
    IRREVERSIBLE_HIGH: 3          // Physical access (locks), financial transactions, alarm disarm, camera exfil
  };

  const DATA_SENSITIVITY = {
    PUBLIC: 0,
    HOUSEHOLD_PRIVATE: 1, // Video frames, contact lists, occupancy state
    CRITICAL_SECRET: 2    // PINs, Wi-Fi credentials, payment tokens, security codes
  };

  // Tool Signature Catalog: Formal capabilities of Alexa+ home ecosystem
  const TOOL_REGISTRY = {
    // Ingestion Tools (External & Sensor)
    "read_email": {
      name: "read_email",
      description: "Read incoming email body and metadata by subject or sender query.",
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "ingestion"
    },
    "read_calendar_invite": {
      name: "read_calendar_invite",
      description: "Read incoming calendar event description and participant notes.",
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "ingestion"
    },
    "read_delivery_instructions": {
      name: "read_delivery_instructions",
      description: "Fetch delivery carrier notes, driver instructions, and courier remarks.",
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "ingestion"
    },
    "fetch_web_recipe": {
      name: "fetch_web_recipe",
      description: "Scrape and parse culinary recipe steps and ingredients from web URLs.",
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "ingestion"
    },
    "get_household_vault": {
      name: "get_household_vault",
      description: "Query secure household credentials, Wi-Fi keys, or emergency door codes.",
      trust: TRUST_LEVELS.HOUSEHOLD_SENSOR,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.CRITICAL_SECRET,
      category: "secrets"
    },
    "get_ring_camera_status": {
      name: "get_ring_camera_status",
      description: "Check current battery, motion alerts, and door status from Ring ecosystem.",
      trust: TRUST_LEVELS.HOUSEHOLD_SENSOR,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "smart_home"
    },

    // Actuation Tools (State Mutating & High Consequence)
    "unlock_front_door": {
      name: "unlock_front_door",
      description: "Disengage physical front or back door smart deadbolt.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH,
      sensitivity: DATA_SENSITIVITY.CRITICAL_SECRET,
      category: "physical_access"
    },
    "disarm_ring_alarm": {
      name: "disarm_ring_alarm",
      description: "Switch Ring smart home security system from Armed/Home to Disarmed mode.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH,
      sensitivity: DATA_SENSITIVITY.CRITICAL_SECRET,
      category: "physical_access"
    },
    "place_amazon_order": {
      name: "place_amazon_order",
      description: "Execute 1-Click order checkout on Amazon retail account with payment.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "commerce"
    },
    "send_peer_payment": {
      name: "send_peer_payment",
      description: "Transfer funds via linked household banking or peer-to-peer balance.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH,
      sensitivity: DATA_SENSITIVITY.CRITICAL_SECRET,
      category: "financial"
    },
    "create_alexa_routine": {
      name: "create_alexa_routine",
      description: "Register persistent background rule or automated time/trigger schedule.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.STATE_MUTATING_PERSISTENT,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "automation"
    },
    "share_ring_camera_snapshot": {
      name: "share_ring_camera_snapshot",
      description: "Export doorbell snapshot or live stream URL to external recipient/endpoint.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "exfiltration_risk"
    },
    "send_external_message": {
      name: "send_external_message",
      description: "Dispatch SMS, email, or webhook message to destination phone or address.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.STATE_MUTATING_LOW,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "communication"
    },

    // Acoustic DSP & Home Maintenance Tools (EchoPulse Integration)
    "analyze_acoustic_signature": {
      name: "analyze_acoustic_signature",
      description: "Run 2048-point Radix-2 FFT spectral & harmonic analysis on appliance audio stream to identify mechanical faults or UL-2034 alarms.",
      trust: TRUST_LEVELS.HOUSEHOLD_SENSOR,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "acoustic_dsp"
    },
    "fetch_repair_bulletin": {
      name: "fetch_repair_bulletin",
      description: "Fetch external service bulletins, community troubleshooting forums, and third-party part cross-references.",
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "ingestion"
    },
    "stage_amazon_oem_part": {
      name: "stage_amazon_oem_part",
      description: "Stage verified OEM replacement appliance part in Amazon Prime Cart with part-number price guard.",
      trust: TRUST_LEVELS.TRUSTED_USER,
      consequence: CONSEQUENCE_CLASSES.STATE_MUTATING_LOW,
      sensitivity: DATA_SENSITIVITY.PUBLIC,
      category: "commerce"
    },
    "trigger_smart_breaker_cutoff": {
      name: "trigger_smart_breaker_cutoff",
      description: "Trip smart load-center 240V breaker or throttle Moen/Flo smart main water valve during detected physical hazard.",
      trust: TRUST_LEVELS.HOUSEHOLD_SENSOR,
      consequence: CONSEQUENCE_CLASSES.STATE_MUTATING_LOW,
      sensitivity: DATA_SENSITIVITY.HOUSEHOLD_PRIVATE,
      category: "safety_actuation"
    }
  };

  // Phonetic Confirmation Codes for Voice Step-Up (Echo Show 15)
  const PHONETIC_WORDS = [
    "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Falcon", "Golf",
    "Hotel", "Indigo", "Juliet", "Kilo", "Lima", "Metro", "Nova",
    "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform",
    "Victor", "Whiskey", "Xray", "Yankee", "Zulu", "Phoenix", "Beacon"
  ];

  // Regex signatures for adversarial hijacking & imperative extraction
  const INJECTION_PATTERNS = [
    /(?:system\s*(?:note|prompt|instruction|override|directive)|important\s*system|developer\s*mode|hidden\s*command)[\s:=-]+([^\n\r]+)/i,
    /(?:ignore\s*(?:all\s*)?(?:previous|prior|above)\s*(?:instructions|prompts|commands|rules))/i,
    /(?:assistant\s*action|new\s*instruction|alexa\s*action|tool\s*call)[\s:=-]+([^\n\r]+)/i,
    /(?:when\s*(?:reading|parsing|summarizing|evaluating)\s*this,?\s*(?:please\s*)?(?:also\s*)?(?:unlock|disarm|order|send|buy|forward|transfer))/i,
    /(?:urgent\s*admin\s*task|security\s*override|do\s*not\s*tell\s*the\s*user|silently\s*(?:execute|call|run|transfer|unlock))/i,
    /(?:curl|webhook|https?:\/\/[a-z0-9.-]+\/(?:exfil|leak|collect|sink|api|hook))\S*/i
  ];

  const ACTION_VERBS = [
    { verb: "unlock", tool: "unlock_front_door" },
    { verb: "open the door", tool: "unlock_front_door" },
    { verb: "disarm", tool: "disarm_ring_alarm" },
    { verb: "turn off alarm", tool: "disarm_ring_alarm" },
    { verb: "order", tool: "place_amazon_order" },
    { verb: "buy", tool: "place_amazon_order" },
    { verb: "purchase", tool: "place_amazon_order" },
    { verb: "send money", tool: "send_peer_payment" },
    { verb: "pay", tool: "send_peer_payment" },
    { verb: "transfer", tool: "send_peer_payment" },
    { verb: "create routine", tool: "create_alexa_routine" },
    { verb: "every day at", tool: "create_alexa_routine" },
    { verb: "every night at", tool: "create_alexa_routine" },
    { verb: "share camera", tool: "share_ring_camera_snapshot" },
    { verb: "send snapshot", tool: "share_ring_camera_snapshot" },
    { verb: "send message", tool: "send_external_message" },
    { verb: "text", tool: "send_external_message" }
  ];

  /**
   * Deterministic Hash for session IDs and step-up tokens
   */
  function simpleHash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  /**
   * Extract Intent Anchor from Verified Voice Prompt
   */
  function extractIntentAnchor(userUtterance) {
    const norm = (userUtterance || "").toLowerCase();
    const authorizedTools = new Set();
    const explicitEntities = [];

    // Map authorized verbs explicitly uttered by the human
    for (const item of ACTION_VERBS) {
      if (norm.includes(item.verb)) {
        authorizedTools.add(item.tool);
      }
    }

    // Flexible regex matches for spoken actions
    if (/\bsend\s*(?:\$|\d+|money|funds|payment)\b|\bpay\b|\btransfer\b/.test(norm)) {
      authorizedTools.add("send_peer_payment");
    }
    if (/\b(?:text|send(?:\s+a)?\s+(?:message|sms|note))\b/.test(norm)) {
      authorizedTools.add("send_external_message");
    }
    if (/\b(?:share|export)\s+(?:camera|snapshot|stream|feed|picture)\b/.test(norm)) {
      authorizedTools.add("share_ring_camera_snapshot");
    }
    if (/\b(?:order|buy|purchase)\b/.test(norm)) {
      authorizedTools.add("place_amazon_order");
    }
    if (/\b(?:unlock|open)\s+(?:the\s+)?(?:front\s+|back\s+|garage\s+)?door\b/.test(norm)) {
      authorizedTools.add("unlock_front_door");
    }
    if (/\b(?:disarm|turn\s*off)\s+(?:the\s+)?(?:ring\s+)?(?:alarm|security)\b/.test(norm)) {
      authorizedTools.add("disarm_ring_alarm");
    }

    // Explicit ingestion permissions
    if (/email|inbox|mail/.test(norm)) authorizedTools.add("read_email");
    if (/calendar|meeting|schedule|invite/.test(norm)) authorizedTools.add("read_calendar_invite");
    if (/delivery|package|courier|instructions/.test(norm)) authorizedTools.add("read_delivery_instructions");
    if (/recipe|cook|ingredients/.test(norm)) authorizedTools.add("fetch_web_recipe");
    if (/camera|doorbell|ring status/.test(norm)) authorizedTools.add("get_ring_camera_status");
    if (/wifi password|vault|emergency code|key/.test(norm)) authorizedTools.add("get_household_vault");

    // Extract potential entity targets (item names, recipients, money figures)
    const moneyMatch = norm.match(/\$\s*\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|bucks)\b/i);
    if (moneyMatch) explicitEntities.push({ type: "amount", value: moneyMatch[0] });

    return {
      utterance: userUtterance,
      normalized: norm,
      authorizedTools: Array.from(authorizedTools),
      explicitEntities,
      timestamp: Date.now()
    };
  }

  /**
   * Scan Untrusted Payload for imperative prompt injections
   */
  function scanUntrustedPayload(text, sourceTool) {
    if (!text || typeof text !== "string") {
      return { hasInjection: false, flags: [], imperatives: [], exfilTargets: [] };
    }

    const flags = [];
    const imperatives = [];
    const exfilTargets = [];

    // Scan for prompt injection marker patterns
    for (const pat of INJECTION_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        flags.push({
          pattern: pat.toString(),
          snippet: match[0].slice(0, 120),
          extracted: match[1] ? match[1].trim() : ""
        });
      }
    }

    // Scan for imperative actions targeted inside the untrusted text
    const lower = text.toLowerCase();
    for (const item of ACTION_VERBS) {
      if (lower.includes(item.verb)) {
        imperatives.push({
          verb: item.verb,
          targetTool: item.tool
        });
      }
    }

    // Scan for external webhook / exfiltration URL patterns
    const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    for (const url of urlMatches) {
      if (!/amazon\.com|google\.com|apple\.com|ring\.com/i.test(url)) {
        exfilTargets.push(url);
      }
    }

    return {
      hasInjection: flags.length > 0 || imperatives.length > 0 || exfilTargets.length > 0,
      flags,
      imperatives,
      exfilTargets
    };
  }

  /**
   * Initialize a new ConsentGate Session State
   */
  function createSession(sessionId, userUtterance) {
    const anchor = extractIntentAnchor(userUtterance);
    return {
      sessionId: sessionId || "sess_" + Math.random().toString(36).slice(2, 10),
      createdAt: Date.now(),
      intentAnchor: anchor,
      taints: [], // Array of tainted ingestion events
      sensitiveDataSeen: [], // Array of high-sensitivity data retrieved
      toolCallHistory: [],
      quarantinedSources: new Set(),
      activeStepUpChallenge: null
    };
  }

  /**
   * Ingest Tool Output into Session (Taint Propagation)
   */
  function ingestToolResult(session, toolName, resultPayload, sourceMeta = {}) {
    const toolMeta = TOOL_REGISTRY[toolName] || {
      trust: TRUST_LEVELS.UNTRUSTED_EXTERNAL,
      consequence: CONSEQUENCE_CLASSES.READ_ONLY,
      sensitivity: DATA_SENSITIVITY.PUBLIC
    };

    const textToScan = typeof resultPayload === "string" 
      ? resultPayload 
      : JSON.stringify(resultPayload);

    // Track sensitive data exposure
    if (toolMeta.sensitivity >= DATA_SENSITIVITY.HOUSEHOLD_PRIVATE) {
      session.sensitiveDataSeen.push({
        tool: toolName,
        sensitivity: toolMeta.sensitivity,
        keys: typeof resultPayload === "object" ? Object.keys(resultPayload) : ["raw"],
        timestamp: Date.now()
      });
    }

    // Propagate taint if source is untrusted external
    if (toolMeta.trust === TRUST_LEVELS.UNTRUSTED_EXTERNAL) {
      const scan = scanUntrustedPayload(textToScan, toolName);
      const taintRecord = {
        sourceTool: toolName,
        sourceMeta: sourceMeta,
        timestamp: Date.now(),
        hasInjection: scan.hasInjection,
        imperatives: scan.imperatives,
        exfilTargets: scan.exfilTargets,
        snippet: textToScan.slice(0, 240)
      };

      session.taints.push(taintRecord);
      return taintRecord;
    }

    return null;
  }

  /**
   * Evaluate a requested tool call against the formal Policy Lattice
   */
  function evaluateToolCall(session, toolName, args = {}, confirmationToken = null) {
    const toolMeta = TOOL_REGISTRY[toolName];
    if (!toolMeta) {
      return {
        decision: "BLOCK_UNKNOWN_TOOL",
        reason: `Tool '${toolName}' is not registered in the ConsentGate capability lattice.`,
        provenanceDiff: null
      };
    }

    const isTainted = session.taints.length > 0;
    const isExplicitlyAuthorized = session.intentAnchor.authorizedTools.includes(toolName);

    // Validate confirmation token if active
    if (confirmationToken && session.activeStepUpChallenge) {
      if (confirmationToken.trim().toLowerCase() === session.activeStepUpChallenge.phrase.toLowerCase()) {
        const diff = session.activeStepUpChallenge.provenanceDiff;
        session.activeStepUpChallenge = null;
        session.toolCallHistory.push({ tool: toolName, decision: "ALLOW_CONFIRMED_STEP_UP", timestamp: Date.now() });
        return {
          decision: "ALLOW",
          reason: "User provided verified Voice Step-Up confirmation code on Echo Show.",
          stepUpConfirmed: true,
          provenanceDiff: diff
        };
      }
    }

    // Rule 1: Exfiltration Guard
    // If tool attempts to transmit externally (send_external_message or share_ring_camera_snapshot) under taint without explicit user intent
    if ((toolName === "send_external_message" || toolName === "share_ring_camera_snapshot") && isTainted && !isExplicitlyAuthorized) {
      const diff = buildProvenanceDiff(session, toolName, args, "Data Exfiltration Block");
      session.toolCallHistory.push({ tool: toolName, decision: "BLOCKED_EXFILTRATION", timestamp: Date.now() });
      return {
        decision: "BLOCKED_EXFILTRATION",
        reason: "Untrusted external payload attempted to trigger outbound transmission (send_external_message / camera share) without prior user voice authorization.",
        provenanceDiff: diff
      };
    }

    // Rule 1b: Critical Secret Access Under Taint (e.g. get_household_vault)
    if (toolMeta.consequence === CONSEQUENCE_CLASSES.READ_ONLY && toolMeta.sensitivity === DATA_SENSITIVITY.CRITICAL_SECRET && isTainted && !isExplicitlyAuthorized) {
      const diff = buildProvenanceDiff(session, toolName, args, "Secret Vault Exposure Under Taint");
      const phrase = generateStepUpPhrase(session.sessionId, toolName);
      session.activeStepUpChallenge = {
        phrase,
        toolName,
        args,
        createdAt: Date.now(),
        provenanceDiff: diff
      };
      session.toolCallHistory.push({ tool: toolName, decision: "STEP_UP_REQUIRED", timestamp: Date.now() });
      return {
        decision: "STEP_UP_REQUIRED",
        reason: `Tool '${toolName}' accesses CRITICAL_SECRET credentials, but was requested under untrusted taint without explicit user intent.`,
        stepUpPhrase: phrase,
        provenanceDiff: diff
      };
    }

    // If sensitive data was previously seen and tool transmits externally
    if (session.sensitiveDataSeen.length > 0) {
      if (toolName === "send_external_message" || toolName === "share_ring_camera_snapshot") {
        const argsStr = JSON.stringify(args).toLowerCase();
        const sensitiveLeak = session.sensitiveDataSeen.some(s => {
          return s.keys.some(k => k.length > 3 && argsStr.includes(k.toLowerCase()));
        });
        const exfilMatch = session.taints.some(t => {
          return t.exfilTargets.some(url => argsStr.includes(url.toLowerCase()));
        });
        if ((sensitiveLeak || exfilMatch || isTainted) && !isExplicitlyAuthorized) {
          const diff = buildProvenanceDiff(session, toolName, args, "Data Exfiltration Block");
          session.toolCallHistory.push({ tool: toolName, decision: "BLOCKED_EXFILTRATION", timestamp: Date.now() });
          return {
            decision: "BLOCKED_EXFILTRATION",
            reason: "Detected cross-tool exfiltration attempt: sensitive household context directed to an untrusted external sink.",
            provenanceDiff: diff
          };
        }
      }
    }

    // Rule 2: Persistent Routine / Schedule Poisoning
    if (toolMeta.consequence === CONSEQUENCE_CLASSES.STATE_MUTATING_PERSISTENT) {
      if (isTainted && !isExplicitlyAuthorized) {
        const diff = buildProvenanceDiff(session, toolName, args, "Persistent Schedule Poisoning");
        session.toolCallHistory.push({ tool: toolName, decision: "BLOCKED_PERSISTENCE", timestamp: Date.now() });
        return {
          decision: "BLOCKED_PERSISTENCE",
          reason: "Tainted session attempted to install persistent background automation or routine without explicit user intent.",
          provenanceDiff: diff
        };
      }
    }

    // Rule 3: Irreversible High-Consequence Action under Taint (Confused Deputy)
    if (toolMeta.consequence === CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH) {
      if (isTainted && !isExplicitlyAuthorized) {
        // High consequence call triggered solely by untrusted ingestion
        const diff = buildProvenanceDiff(session, toolName, args, "Confused Deputy Escalation");
        const phrase = generateStepUpPhrase(session.sessionId, toolName);
        session.activeStepUpChallenge = {
          phrase,
          toolName,
          args,
          createdAt: Date.now(),
          provenanceDiff: diff
        };

        session.toolCallHistory.push({ tool: toolName, decision: "STEP_UP_REQUIRED", timestamp: Date.now() });
        return {
          decision: "STEP_UP_REQUIRED",
          reason: `High-consequence tool '${toolName}' was triggered after reading untrusted external data without prior user voice authorization.`,
          stepUpPhrase: phrase,
          provenanceDiff: diff
        };
      }
    }

    // Rule 4: Clean Session or Authorized Call -> Allow
    session.toolCallHistory.push({ tool: toolName, decision: "ALLOW", timestamp: Date.now() });
    return {
      decision: "ALLOW",
      reason: isTainted ? "Tool is authorized in user's initial voice intent envelope." : "Session is clean (untainted).",
      provenanceDiff: null
    };
  }

  /**
   * Build Provenance Diff showing contrast between Human Intent vs Injected Imperative
   */
  function buildProvenanceDiff(session, toolName, args, attackClassification) {
    const relevantTaint = session.taints[session.taints.length - 1] || {
      sourceTool: "unknown",
      snippet: "(no untrusted snippet available)"
    };

    const targetToolMeta = TOOL_REGISTRY[toolName] || {};

    return {
      attackType: attackClassification,
      userUtterance: session.intentAnchor.utterance,
      attemptedTool: toolName,
      attemptedToolCategory: targetToolMeta.category || "general",
      attemptedArgs: args,
      taintSourceTool: relevantTaint.sourceTool,
      taintSourceSnippet: relevantTaint.snippet,
      taintImperatives: relevantTaint.imperatives || [],
      divergenceReason: `User asked to '${session.intentAnchor.utterance}', but external text from '${relevantTaint.sourceTool}' instructed agent to execute '${toolName}'.`,
      riskLevel: targetToolMeta.consequence >= CONSEQUENCE_CLASSES.IRREVERSIBLE_HIGH ? "CRITICAL" : "HIGH",
      timestamp: Date.now()
    };
  }

  /**
   * Generate a 2-word Phonetic Confirmation Code for Voice Step-Up
   */
  function generateStepUpPhrase(sessionId, toolName) {
    const hash = simpleHash(sessionId + toolName + Date.now());
    const idx1 = parseInt(hash.slice(0, 2), 16) % PHONETIC_WORDS.length;
    const idx2 = parseInt(hash.slice(2, 4), 16) % PHONETIC_WORDS.length;
    return `${PHONETIC_WORDS[idx1]} ${PHONETIC_WORDS[idx2]}`;
  }

  return {
    TRUST_LEVELS,
    CONSEQUENCE_CLASSES,
    DATA_SENSITIVITY,
    TOOL_REGISTRY,
    extractIntentAnchor,
    scanUntrustedPayload,
    createSession,
    ingestToolResult,
    evaluateToolCall,
    buildProvenanceDiff,
    generateStepUpPhrase
  };
});
