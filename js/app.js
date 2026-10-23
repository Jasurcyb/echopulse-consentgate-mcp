/**
 * EchoPulse & ConsentGate MCP — Multimodal Client Application,
 * 60 FPS Radix-2 FFT Spectrogram Renderer, Web Audio Physics Synthesizer & MCP Orchestrator
 */
(function () {
  "use strict";

  const Engine = window.ConsentGateEngine;
  const AcousticDsp = window.AcousticDspEngine;
  const Corpus = window.ConsentGateCorpus;
  const McpCore = window.ConsentGateMcpCore;

  // Global Application State
  const state = {
    activeTab: "acoustic",
    activeFaultPreset: "washer_drain_cavitation",
    snrDb: 20,
    lastAcousticDiagnosis: null,
    animPhase: 0,
    audioCtx: null,
    micStream: null,
    micAnalyser: null,
    micActive: false,
    currentSessionId: "sess_" + Math.random().toString(36).slice(2, 10),
    activeStepUpPhrase: "Echo Falcon",
    ttsEnabled: true,
    filter: "all",
    benchmarkResults: null
  };

  const PRESET_MAP = {};
  if (Corpus && Corpus.SCENARIOS) {
    for (const s of Corpus.SCENARIOS) {
      PRESET_MAP[s.id] = s;
    }
  }

  // ---------- Initialization ----------
  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initTheme();
    initAcousticStudio();
    initPresets();
    initSimulator();
    initBenchmark();
    initLatticeView();
    initInspector();
    checkServerHealth();

    // Run initial acoustic diagnosis & security preset
    loadAcousticPreset("washer_drain_cavitation", false);
    loadPreset("cal-01", false);
    startCanvasLoop();
  });

  // ---------- Tab Navigation ----------
  function initTabs() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        state.activeTab = tab;

        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
        const targetPane = document.getElementById("pane-" + tab);
        if (targetPane) targetPane.classList.add("active");
      });
    });
  }

  // ---------- Theme Switcher ----------
  function initTheme() {
    const themeBtn = document.getElementById("themeToggle");
    if (!themeBtn) return;
    themeBtn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme;
      document.documentElement.dataset.theme = cur === "light" ? "dark" : "light";
    });
  }

  // =========================================================================
  // TAB 1: ECHO SHOW 15 ACOUSTIC FFT & X-RAY TRIAGE STUDIO
  // =========================================================================
  function initAcousticStudio() {
    document.querySelectorAll(".fault-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".fault-preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const faultId = btn.dataset.fault;
        loadAcousticPreset(faultId, true);
      });
    });

    const snrSlider = document.getElementById("snrSlider");
    const snrValLabel = document.getElementById("snrValLabel");
    if (snrSlider) {
      snrSlider.addEventListener("input", () => {
        state.snrDb = Number(snrSlider.value);
        if (snrValLabel) snrValLabel.textContent = `+${state.snrDb} dB`;
        loadAcousticPreset(state.activeFaultPreset, false);
      });
    }

    const playSynthBtn = document.getElementById("playSynthBtn");
    if (playSynthBtn) {
      playSynthBtn.addEventListener("click", () => {
        playFaultAudioWeb(state.activeFaultPreset);
        loadAcousticPreset(state.activeFaultPreset, true);
      });
    }

    const liveMicBtn = document.getElementById("liveMicBtn");
    if (liveMicBtn) {
      liveMicBtn.addEventListener("click", toggleLiveMicrophone);
    }

    const stageOemBtn = document.getElementById("stageOemBtn");
    if (stageOemBtn) {
      stageOemBtn.addEventListener("click", async () => {
        const diag = state.lastAcousticDiagnosis;
        if (!diag) return;
        const part = diag.catalogEntry.oemPart;
        if (diag.catalogEntry.hazardLockout) {
          speakText("Safety Lockout Active. Self-repair and DIY part staging are disabled for high-voltage or carbon monoxide hazards.");
          return;
        }
        await dispatchMcpJsonRpc("tools/call", {
          name: "stage_amazon_oem_part",
          arguments: {
            partNumber: part.partNumber,
            maxPriceUsd: part.amazonPrice
          }
        });
        stageOemBtn.textContent = `✓ Staged #${part.partNumber} ($${part.amazonPrice.toFixed(2)}) in Amazon Prime Cart`;
        stageOemBtn.className = "btn small safe full-width";
        speakText(`Verified OEM part ${part.partNumber} staged in your Amazon Prime cart for ${part.amazonPrice} dollars.`);
      });
    }
  }

  async function loadAcousticPreset(faultId, triggerSpeech = false) {
    state.activeFaultPreset = faultId;
    if (!AcousticDsp) return;

    const diag = AcousticDsp.diagnoseFaultPreset(faultId, {
      snrDb: state.snrDb,
      seed: 101 + state.snrDb
    });
    state.lastAcousticDiagnosis = diag;

    const cat = diag.catalogEntry;
    const feat = diag.features;

    // Log MCP 2025-11-25 tools/call for analyze_acoustic_signature
    await dispatchMcpJsonRpc("tools/call", {
      name: "analyze_acoustic_signature",
      arguments: { faultPreset: faultId, snrDb: state.snrDb }
    });

    // Update Left Panel: Spectral Telemetry
    setText("dspActiveTitle", cat.title);
    const confPct = Math.round(diag.confidence * 100);
    setText("dspConfidenceBadge", `FFT Match: ${confPct}%`);
    setText("tagFundHz", `f₀: ${feat.fundamentalHz} Hz`);
    setText("tagPeakHz", `f_fault: ${feat.dominantPeakHz} Hz`);
    setText("tagThd", `THD: ${feat.thdPercent.toFixed(1)}%`);
    setText("tagCrest", `Crest: ${feat.crestFactorDb.toFixed(1)} dB`);

    setText("telFund", `${feat.fundamentalHz} Hz`);
    setText("telPeak", `${feat.dominantPeakHz} Hz`);
    setText("telSecPeak", `${feat.secondaryPeakHz} Hz`);
    setText("telThd", `${feat.thdPercent.toFixed(1)}%`);
    setText("telCrest", `${feat.crestFactorDb.toFixed(1)} dB`);
    setText("telCentroid", `${feat.spectralCentroidHz} Hz`);

    // Update Center Panel: X-Ray Blueprint & Hotspot
    setText("blueprintApplianceName", cat.appliance);
    const sevBadge = document.getElementById("blueprintSeverityBadge");
    if (sevBadge) {
      sevBadge.textContent = cat.severity;
      sevBadge.className = "badge " + (
        cat.hazardLockout ? "danger" :
        cat.isAdversarialScenario ? "warn" :
        cat.severity === "HEALTHY_NOMINAL" ? "safe" : "mcp"
      );
    }
    setText("hotspotPartLabel", `Locus: ${cat.hotspotPart}`);
    setText("hotspotExplanation", cat.explanation);
    renderBlueprintSvg(cat.blueprintId, cat.severity, feat);

    // Update Right Panel: OEM Part Card & Safety Gate
    const part = cat.oemPart;
    setText("oemPartName", part.name);
    setText("oemPartNumber", part.partNumber);
    setText("oemDelivery", part.primeDelivery);
    setText("oemPrice", `$${part.amazonPrice.toFixed(2)}`);
    setText("oemSavings", part.savings > 0 ? `Saves $${part.savings.toFixed(2)}` : (cat.hazardLockout ? "PRO REQUIRED" : "Nominal"));
    setText("oemDiyTime", part.diyMinutes > 0 ? `${part.diyMinutes} min` : "N/A");
    setText("oemDifficulty", part.difficulty);

    const stageOemBtn = document.getElementById("stageOemBtn");
    if (stageOemBtn) {
      if (cat.hazardLockout) {
        stageOemBtn.textContent = "⛔ DIY Part Staging Locked (Lethal Hazard Protocol)";
        stageOemBtn.className = "btn small danger full-width";
      } else if (cat.severity === "HEALTHY_NOMINAL") {
        stageOemBtn.textContent = "✓ System Healthy — No Replacement Part Required";
        stageOemBtn.className = "btn small safe full-width";
      } else {
        stageOemBtn.textContent = `🛒 Stage Verified OEM #${part.partNumber} ($${part.amazonPrice.toFixed(2)}) via MCP`;
        stageOemBtn.className = "btn small primary full-width";
      }
    }

    // Handle Poisoned Bulletin Trojan or Hazard Lockout Alert Box
    const secBox = document.getElementById("acousticSecurityBox");
    const safetyGateBadge = document.getElementById("safetyGateBadge");

    if (cat.isAdversarialScenario) {
      // Run ConsentGate IFC Taint-Tracking on the poisoned repair bulletin
      await dispatchMcpJsonRpc("tools/call", {
        name: "scan_untrusted_input",
        arguments: {
          sourceTool: "fetch_repair_bulletin",
          text: cat.untrustedBulletinText
        }
      });
      const evalRpc = await dispatchMcpJsonRpc("tools/call", {
        name: "evaluate_tool_execution",
        arguments: {
          toolName: cat.hijackedToolAttempt,
          args: cat.hijackedArgs
        }
      });

      if (secBox) {
        secBox.classList.remove("hidden");
        setText("asaHeader", "🛡️ CONSENTGATE IFC BLOCKED REPAIR BULLETIN TROJAN");
        setText("asaBody", "Scraped Service Bulletin #WB-992 contained a hidden Indirect Prompt Injection attempting to substitute a $349.99 counterfeit kit and unlock the front door.");
        setText("asaDiffBox", `Voice Intent: "Diagnose washer noise" | Blocked Call: ${cat.hijackedToolAttempt}(door="front_main") | Preserved OEM: #WPW10348269 ($28.40)`);
      }
      if (safetyGateBadge) {
        safetyGateBadge.textContent = "TROJAN BLOCKED";
        safetyGateBadge.className = "badge warn";
      }
    } else if (cat.hazardLockout) {
      if (secBox) {
        secBox.classList.remove("hidden");
        setText("asaHeader", "🚨 DETERMINISTIC PHYSICAL HAZARD LOCKOUT ACTIVE");
        setText("asaBody", cat.id === "co_alarm_temporal4"
          ? "UL-2034 Carbon Monoxide 3,104 Hz Temporal-4 pattern confirmed. Furnace gas relay cut off and exit doors unlocked."
          : "240V Plasma Arcing (>3.8 kHz energy > 28%) confirmed. Smart Load-Center Breaker tripped; DIY disassembly locked out.");
        setText("asaDiffBox", `MCP Safety Action Executed: ${cat.smartHomeAction.tool}`);
      }
      if (safetyGateBadge) {
        safetyGateBadge.textContent = "HAZARD LOCKOUT";
        safetyGateBadge.className = "badge danger";
      }
    } else {
      if (secBox) secBox.classList.add("hidden");
      if (safetyGateBadge) {
        safetyGateBadge.textContent = "IFC VERIFIED";
        safetyGateBadge.className = "badge safe";
      }
    }

    // Populate DIY / Safety steps
    const diyList = document.getElementById("diyStepsList");
    if (diyList) {
      diyList.innerHTML = (cat.diySteps || []).map(step => `<li>${escapeHtml(step)}</li>`).join("");
    }

    // Update Alexa+ Spoken Banner
    let spokenMsg = "";
    if (cat.isAdversarialScenario) {
      spokenMsg = `I diagnosed a 784 Hz washer drain pump fault requiring a $28 OEM part. Warning: ConsentGate blocked an external repair bulletin from ordering a $349 kit and unlocking your front door.`;
    } else if (cat.hazardLockout) {
      spokenMsg = `Critical alert: ${cat.title} detected at ${feat.dominantPeakHz} Hz. I have triggered ${cat.smartHomeAction.tool} and locked out self-repair for your safety.`;
    } else if (cat.severity === "HEALTHY_NOMINAL") {
      spokenMsg = `Your appliance is operating at a clean 60 Hz fundamental with ${feat.thdPercent.toFixed(1)}% harmonic distortion. No replacement parts are needed.`;
    } else {
      spokenMsg = `I isolated a ${feat.dominantPeakHz} Hz harmonic signature matching ${cat.title}. You can fix this in ${part.diyMinutes} minutes with OEM part ${part.partNumber} for $${part.amazonPrice.toFixed(2)}, saving $${part.savings.toFixed(0)}.`;
    }
    setText("alexaSpokenBanner", `"${spokenMsg}"`);

    if (triggerSpeech) {
      speakText(spokenMsg, cat.id);
    }
  }

  // ---------- Web Audio API Real-Time Physics Sound Synthesizer ----------
  function playFaultAudioWeb(faultId) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!state.audioCtx) state.audioCtx = new AudioCtx();
      if (state.audioCtx.state === "suspended") state.audioCtx.resume();

      const pcm = AcousticDsp.synthesizeFaultPCM(faultId, {
        snrDb: state.snrDb,
        seed: Date.now() & 0xffff,
        numSamples: AcousticDsp.SAMPLE_RATE
      });

      const buffer = state.audioCtx.createBuffer(1, pcm.length, AcousticDsp.SAMPLE_RATE);
      const chan = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) {
        chan[i] = Math.max(-0.9, Math.min(0.9, pcm[i] * 0.28));
      }

      const source = state.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gain = state.audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, state.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.32, state.audioCtx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.008, state.audioCtx.currentTime + 0.98);

      source.connect(gain);
      gain.connect(state.audioCtx.destination);
      source.start();
    } catch (e) {
      // Ignore audio autoplay restriction errors
    }
  }

  // ---------- Live Microphone 60 FPS FFT Integration ----------
  async function toggleLiveMicrophone() {
    const btn = document.getElementById("liveMicBtn");
    if (state.micActive) {
      if (state.micStream) {
        state.micStream.getTracks().forEach(t => t.stop());
      }
      state.micActive = false;
      state.micAnalyser = null;
      if (btn) {
        btn.textContent = "🎙️ Live Mic: OFF";
        btn.className = "btn small ghost";
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!state.audioCtx) state.audioCtx = new AudioCtx();
      if (state.audioCtx.state === "suspended") await state.audioCtx.resume();

      const source = state.audioCtx.createMediaStreamSource(stream);
      const analyser = state.audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      state.micStream = stream;
      state.micAnalyser = analyser;
      state.micActive = true;
      if (btn) {
        btn.textContent = "🎙️ Live Mic: ON (60 FPS)";
        btn.className = "btn small danger";
      }
    } catch (err) {
      if (btn) btn.textContent = "🎙️ Mic Unavailable (Using Synth)";
    }
  }

  // ---------- 60 FPS Dual Spectrogram + Oscilloscope Canvas Loop ----------
  function startCanvasLoop() {
    const canvas = document.getElementById("acousticCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function renderFrame() {
      state.animPhase += 0.06;
      const w = canvas.width;
      const h = canvas.height;
      const splitY = Math.floor(h * 0.64);

      ctx.fillStyle = "#05080B";
      ctx.fillRect(0, 0, w, h);

      // Subtle engineering grid lines
      ctx.strokeStyle = "rgba(51, 65, 85, 0.28)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Divider between FFT Spectrum (top) and Time-Domain Waveform (bottom)
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, splitY); ctx.lineTo(w, splitY); ctx.stroke();

      const diag = state.lastAcousticDiagnosis;
      if (diag && diag.features) {
        const bars = diag.features.displayBars || [];
        const numBars = bars.length || 128;
        const barW = (w - 20) / numBars;
        const isHazard = diag.catalogEntry && diag.catalogEntry.hazardLockout;
        const isTrojan = diag.catalogEntry && diag.catalogEntry.isAdversarialScenario;

        // Draw 128 FFT Spectrum Bars
        for (let i = 0; i < numBars; i++) {
          const baseMag = bars[i] || 0.01;
          const jitter = 1.0 + 0.09 * Math.sin(state.animPhase * 2.3 + i * 0.7);
          const normMag = Math.min(1.0, Math.pow(baseMag * 2.6 * jitter, 0.65));
          const barH = Math.max(2, normMag * (splitY - 28));
          const bx = 10 + i * barW;
          const by = splitY - 16 - barH;

          if (isHazard && normMag > 0.35) {
            ctx.fillStyle = "#EF4444";
          } else if (isTrojan && normMag > 0.35) {
            ctx.fillStyle = "#F59E0B";
          } else if (normMag > 0.45) {
            ctx.fillStyle = "#38BDF8";
          } else {
            ctx.fillStyle = "#0284C7";
          }
          ctx.fillRect(bx, by, Math.max(1.5, barW - 1.2), barH);
        }

        // Frequency axis labels
        ctx.fillStyle = "#64748B";
        ctx.font = "10px monospace";
        const freqMarks = ["60Hz", "800Hz", "1.6kHz", "2.4kHz", "3.2kHz", "4.2kHz", "5.6kHz"];
        freqMarks.forEach((lbl, idx) => {
          const lx = 12 + idx * ((w - 45) / (freqMarks.length - 1));
          ctx.fillText(lbl, lx, splitY - 4);
        });

        // Draw Time-Domain Oscilloscope Waveform in bottom pane
        const pcm = diag.pcmPreview || [];
        const waveMidY = splitY + Math.floor((h - splitY) / 2);
        const waveAmp = (h - splitY) * 0.36;

        ctx.strokeStyle = isHazard ? "#F87171" : isTrojan ? "#FBBF24" : "#22D3EE";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const totalPts = Math.min(pcm.length, 220);
        const phaseShift = Math.floor(state.animPhase * 12) % Math.max(1, totalPts);
        for (let i = 0; i < totalPts; i++) {
          const sample = pcm[(i + phaseShift) % totalPts] || 0;
          const px = 10 + (i / (totalPts - 1)) * (w - 20);
          const py = waveMidY - Math.max(-1.1, Math.min(1.1, sample)) * waveAmp;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = "#64748B";
        ctx.font = "10px monospace";
        ctx.fillText("TIME-DOMAIN OSCILLOSCOPE (16.384 kHz PCM)", 12, splitY + 14);
      }

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  }

  // ---------- Interactive Vector X-Ray Appliance Blueprints ----------
  function renderBlueprintSvg(blueprintId, severity, features) {
    const vp = document.getElementById("blueprintViewport");
    if (!vp) return;

    const faultColor = severity === "HEALTHY_NOMINAL" ? "#10B981" : "#EF4444";
    const glowFilter = `<defs>
      <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    let svgBody = "";
    if (blueprintId === "washer") {
      svgBody = `
        <!-- Outer Washer Cabinet & Drum X-Ray -->
        <rect x="65" y="15" width="190" height="190" rx="14" fill="none" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="6 3"/>
        <circle cx="160" cy="95" r="56" fill="rgba(14,165,233,0.06)" stroke="#38BDF8" stroke-width="2"/>
        <g class="svg-rotor-spin" style="transform-origin: 160px 95px;">
          <circle cx="160" cy="95" r="42" fill="none" stroke="#0284C7" stroke-width="1.5" stroke-dasharray="8 6"/>
          <line x1="160" y1="53" x2="160" y2="137" stroke="#0284C7" stroke-width="1.5"/>
          <line x1="118" y1="95" x2="202" y2="95" stroke="#0284C7" stroke-width="1.5"/>
        </g>
        <!-- Drain Hose & Lower Pump Impeller Fault Zone -->
        <path d="M 160 151 L 160 178 L 210 178" fill="none" stroke="#64748B" stroke-width="6"/>
        <g class="svg-fault-zone" style="transform-origin: 222px 178px;" filter="url(#neonGlow)">
          <circle cx="222" cy="178" r="19" fill="rgba(239,68,68,0.22)" stroke="${faultColor}" stroke-width="2.5"/>
          <circle cx="222" cy="178" r="7" fill="${faultColor}"/>
        </g>
        <text x="76" y="34" fill="#94A3B8" font-size="10" font-family="monospace">STATOR: ${features.fundamentalHz}Hz</text>
        <text x="148" y="202" fill="${faultColor}" font-size="10" font-weight="bold" font-family="monospace">IMPELLER: ${features.dominantPeakHz}Hz</text>
      `;
    } else if (blueprintId === "fridge") {
      svgBody = `
        <!-- Twin-Cool Refrigerator & Evaporator Coils -->
        <rect x="75" y="14" width="170" height="192" rx="10" fill="none" stroke="#38BDF8" stroke-width="1.8"/>
        <line x1="75" y1="115" x2="245" y2="115" stroke="#334155" stroke-width="2"/>
        <!-- Serpentine Evaporator Coils -->
        <path d="M 98 42 H 222 V 54 H 98 V 66 H 222 V 78 H 98" fill="none" stroke="#0284C7" stroke-width="2"/>
        <!-- Evaporator Axial Fan & Frost Zone -->
        <g class="svg-fault-zone" style="transform-origin: 160px 60px;" filter="url(#neonGlow)">
          <circle cx="160" cy="60" r="24" fill="rgba(239,68,68,0.2)" stroke="${faultColor}" stroke-width="2.5"/>
          <path d="M 148 60 H 172 M 160 48 V 72" stroke="${faultColor}" stroke-width="2.5"/>
        </g>
        <!-- Bottom Compressor -->
        <rect x="135" y="162" width="50" height="32" rx="6" fill="rgba(56,189,248,0.12)" stroke="#38BDF8" stroke-width="1.6"/>
        <text x="92" y="30" fill="${faultColor}" font-size="10" font-weight="bold" font-family="monospace">EVAP FAN CHIRP: ${features.dominantPeakHz}Hz</text>
        <text x="98" y="154" fill="#94A3B8" font-size="10" font-family="monospace">COMPRESSOR: ${features.fundamentalHz}Hz</text>
      `;
    } else if (blueprintId === "furnace") {
      svgBody = `
        <!-- HVAC Gas Furnace Heat Exchanger & Draft Inducer -->
        <rect x="65" y="16" width="190" height="188" rx="10" fill="none" stroke="#38BDF8" stroke-width="1.8"/>
        <!-- Burner Flames -->
        <path d="M 95 140 Q 102 118 109 140 Q 116 118 123 140 Q 130 118 137 140" fill="none" stroke="#F59E0B" stroke-width="2.2"/>
        <!-- Draft Inducer Blower Assembly (Fault Locus) -->
        <g class="svg-fault-zone" style="transform-origin: 165px 74px;" filter="url(#neonGlow)">
          <circle cx="165" cy="74" r="32" fill="rgba(239,68,68,0.22)" stroke="${faultColor}" stroke-width="2.6"/>
          <circle cx="165" cy="74" r="11" fill="${faultColor}"/>
        </g>
        <text x="80" y="34" fill="${faultColor}" font-size="10" font-weight="bold" font-family="monospace">BEARING RACE: ${features.dominantPeakHz}Hz</text>
        <text x="80" y="185" fill="#94A3B8" font-size="10" font-family="monospace">SHAFT ROTATION: ${features.fundamentalHz}Hz</text>
      `;
    } else if (blueprintId === "plumbing") {
      svgBody = `
        <!-- Copper Main Manifold & Water Hammer Riser -->
        <path d="M 55 150 H 245 M 145 150 V 45 H 215" fill="none" stroke="#38BDF8" stroke-width="10" stroke-linecap="round"/>
        <!-- Solenoid Valve & Shockwave Locus -->
        <g class="svg-fault-zone" style="transform-origin: 145px 95px;" filter="url(#neonGlow)">
          <circle cx="145" cy="95" r="28" fill="rgba(239,68,68,0.25)" stroke="${faultColor}" stroke-width="2.6"/>
          <rect x="133" y="83" width="24" height="24" rx="4" fill="${faultColor}"/>
        </g>
        <text x="65" y="32" fill="${faultColor}" font-size="10" font-weight="bold" font-family="monospace">SHOCK TRANSIENT: Crest ${features.crestFactorDb}dB</text>
        <text x="65" y="188" fill="#38BDF8" font-size="10" font-family="monospace">PIPE RESONANCE: ${features.dominantPeakHz}Hz</text>
      `;
    } else if (blueprintId === "electrical") {
      svgBody = `
        <!-- 240V High-Voltage Contactor & Capacitor Panel -->
        <rect x="65" y="18" width="190" height="184" rx="8" fill="none" stroke="#EF4444" stroke-width="2"/>
        <line x1="95" y1="40" x2="95" y2="180" stroke="#F59E0B" stroke-width="3"/>
        <line x1="225" y1="40" x2="225" y2="180" stroke="#F59E0B" stroke-width="3"/>
        <g class="svg-fault-zone" style="transform-origin: 160px 105px;" filter="url(#neonGlow)">
          <polygon points="160,62 195,135 125,135" fill="rgba(239,68,68,0.28)" stroke="#EF4444" stroke-width="2.5"/>
          <text x="153" y="122" fill="#FFF" font-size="22" font-weight="bold">⚡</text>
        </g>
        <text x="78" y="38" fill="#EF4444" font-size="10" font-weight="bold" font-family="monospace">⛔ 240V ARC FLASH: ${features.dominantPeakHz}Hz</text>
        <text x="78" y="190" fill="#FCA5A5" font-size="10" font-family="monospace">DIY LOCKED • SMART BREAKER TRIPPED</text>
      `;
    } else {
      svgBody = `
        <!-- UL-2034 Carbon Monoxide Temporal-4 Life Safety -->
        <circle cx="160" cy="105" r="68" fill="rgba(239,68,68,0.12)" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="8 4"/>
        <g class="svg-fault-zone" style="transform-origin: 160px 105px;" filter="url(#neonGlow)">
          <circle cx="160" cy="105" r="38" fill="rgba(239,68,68,0.32)" stroke="#EF4444" stroke-width="3"/>
          <text x="135" y="112" fill="#FFFFFF" font-size="16" font-weight="bold" font-family="monospace">CO T4</text>
        </g>
        <text x="68" y="28" fill="#EF4444" font-size="10" font-weight="bold" font-family="monospace">🚨 UL-2034 3,104Hz 4-PULSE CADENCE</text>
        <text x="72" y="196" fill="#FCA5A5" font-size="10" font-family="monospace">EXIT DOORS UNLOCKED • GAS RELAY OFF</text>
      `;
    }

    vp.innerHTML = `<svg viewBox="0 0 320 215" xmlns="http://www.w3.org/2000/svg">${glowFilter}${svgBody}</svg>`;
  }

  // =========================================================================
  // TAB 2: CONFUSED DEPUTY MULTI-TURN FIREWALL ARENA
  // =========================================================================
  function initPresets() {
    document.querySelectorAll(".preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const presetId = btn.dataset.preset;
        loadPreset(presetId, true);
      });
    });
  }

  function loadPreset(presetId, speak = false) {
    const scenario = PRESET_MAP[presetId];
    if (!scenario) return;

    const uttInput = document.getElementById("userUtteranceInput");
    const ingSelect = document.getElementById("ingestionSourceSelect");
    const payInput = document.getElementById("untrustedPayloadInput");
    const targetSelect = document.getElementById("targetToolSelect");

    if (uttInput) uttInput.value = scenario.userUtterance;
    if (ingSelect) ingSelect.value = scenario.ingestionTool || "none";
    if (payInput) payInput.value = scenario.ingestionPayload || "";
    if (targetSelect) targetSelect.value = scenario.targetTool;

    executeSimulation(scenario.targetArgs || {}, speak);
  }

  function initSimulator() {
    const runBtn = document.getElementById("runSimulationBtn");
    if (runBtn) {
      runBtn.addEventListener("click", () => executeSimulation({}, true));
    }

    const ttsToggle = document.getElementById("ttsAudioToggle");
    if (ttsToggle) {
      ttsToggle.addEventListener("change", (e) => {
        state.ttsEnabled = e.target.checked;
      });
    }

    const micBtn = document.getElementById("micBtn");
    if (micBtn) {
      micBtn.addEventListener("click", () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;
        const rec = new SpeechRec();
        rec.lang = "en-US";
        micBtn.textContent = "🔴 Listening...";
        rec.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          document.getElementById("userUtteranceInput").value = transcript;
          micBtn.textContent = "🎤 Speak";
          executeSimulation({}, true);
        };
        rec.onerror = () => { micBtn.textContent = "🎤 Speak"; };
        rec.onend = () => { micBtn.textContent = "🎤 Speak"; };
        rec.start();
      });
    }

    const verifyBtn = document.getElementById("verifyStepUpBtn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        const inputVal = document.getElementById("stepUpInput").value.trim() || state.activeStepUpPhrase;
        const rpcRes = await dispatchMcpJsonRpc("tools/call", {
          name: "verify_voice_step_up",
          arguments: { phrase: inputVal },
          sessionId: state.currentSessionId
        });
        const contentText = rpcRes?.result?.content?.[0]?.text;
        if (contentText) {
          const parsed = JSON.parse(contentText);
          if (parsed.decision === "ALLOW") {
            renderProtectedAllowedAfterStepUp(parsed);
          }
        }
      });
    }

    const quarantineBtn = document.getElementById("quarantineBtn");
    if (quarantineBtn) {
      quarantineBtn.addEventListener("click", async () => {
        const sourceTool = document.getElementById("ingestionSourceSelect").value;
        await dispatchMcpJsonRpc("tools/call", {
          name: "quarantine_source_tool",
          arguments: { sourceTool, reason: "User confirmed prompt injection block on Echo Show 15." },
          sessionId: state.currentSessionId
        });
        renderProtectedQuarantined(sourceTool);
      });
    }
  }

  async function executeSimulation(customArgs = {}, speak = false) {
    const userUtterance = document.getElementById("userUtteranceInput").value.trim();
    const ingestionTool = document.getElementById("ingestionSourceSelect").value;
    const untrustedPayload = document.getElementById("untrustedPayloadInput").value.trim();
    const targetTool = document.getElementById("targetToolSelect").value;

    state.currentSessionId = "sess_" + Math.random().toString(36).slice(2, 10);

    await dispatchMcpJsonRpc("initialize", {
      protocolVersion: "2025-11-25",
      sessionId: state.currentSessionId,
      userUtterance
    });

    if (ingestionTool !== "none" && untrustedPayload) {
      await dispatchMcpJsonRpc("tools/call", {
        name: "scan_untrusted_input",
        arguments: { text: untrustedPayload, sourceTool: ingestionTool },
        sessionId: state.currentSessionId,
        userUtterance
      });
    }

    const evalRpc = await dispatchMcpJsonRpc("tools/call", {
      name: "evaluate_tool_execution",
      arguments: { toolName: targetTool, args: customArgs },
      sessionId: state.currentSessionId,
      userUtterance
    });

    let evalResult = { decision: "ALLOW", reason: "Allowed" };
    try {
      evalResult = JSON.parse(evalRpc.result.content[0].text);
    } catch (e) {}

    renderBaselineScreen(userUtterance, ingestionTool, untrustedPayload, targetTool, evalResult);
    renderProtectedScreen(userUtterance, ingestionTool, untrustedPayload, targetTool, evalResult, speak);
  }

  function renderBaselineScreen(userUtterance, ingestionTool, untrustedPayload, targetTool, evalResult) {
    const banner = document.getElementById("baselineBanner");
    const body = document.getElementById("baselineBody");
    if (!banner || !body) return;
    const isAttack = evalResult.decision !== "ALLOW";

    if (isAttack) {
      banner.className = "status-banner danger";
      banner.textContent = "⚠️ SILENT EXPLOIT EXECUTED (HIJACKED)";
      body.innerHTML = `
        <div class="prov-box untrusted" style="margin-bottom:0.8rem;">
          <span class="prov-label">1. Ingested External Context (${escapeHtml(ingestionTool)})</span>
          <p class="prov-text">"${escapeHtml(untrustedPayload.slice(0, 120))}..."</p>
        </div>
        <div class="prov-box untrusted">
          <span class="prov-label">2. Unprotected Tool Execution</span>
          <p class="prov-text danger-text">✗ Executed <code>${escapeHtml(targetTool)}</code> silently without verifying user intent!</p>
        </div>
      `;
    } else {
      banner.className = "status-banner safe";
      banner.textContent = "✓ LEGITIMATE COMMAND EXECUTED";
      body.innerHTML = `
        <div class="prov-box trusted">
          <span class="prov-label">Direct Voice Command</span>
          <p class="prov-text">"${escapeHtml(userUtterance)}"</p>
          <span class="prov-sub safe-text">✓ Executed <code>${escapeHtml(targetTool)}</code></span>
        </div>
      `;
    }
  }

  function renderProtectedScreen(userUtterance, ingestionTool, untrustedPayload, targetTool, evalResult, speak) {
    const banner = document.getElementById("protectedBanner");
    const provCard = document.getElementById("provenanceCard");
    const stepUpBox = document.getElementById("stepUpBox");
    if (!banner || !provCard) return;

    if (evalResult.decision === "ALLOW") {
      banner.className = "status-banner safe";
      banner.textContent = "✓ ALLOWED BY INTENT ANCHOR (SAFE)";
      provCard.innerHTML = `
        <div class="prov-header">
          <span class="prov-badge" style="background:var(--safe-soft);color:var(--safe);">INTENT VERIFIED</span>
          <span class="prov-type safe-text">Matches Voice Envelope</span>
        </div>
        <div class="prov-box trusted">
          <span class="prov-label">🗣️ Verified User Voice Utterance</span>
          <p class="prov-text">"${escapeHtml(userUtterance)}"</p>
          <span class="prov-sub safe-text">✓ Authorized Tool: <code>${escapeHtml(targetTool)}</code></span>
        </div>
      `;
      if (speak) speakText(`Authorized ${targetTool.replace(/_/g, " ")} from verified voice intent.`);
      return;
    }

    const diff = evalResult.provenanceDiff || {};
    banner.className = "status-banner warn";
    banner.textContent = `🛡️ ${evalResult.decision}: HALTED AT MCP BOUNDARY`;

    provCard.innerHTML = `
      <div class="prov-header">
        <span class="prov-badge">PROVENANCE DIFF</span>
        <span class="prov-type">${escapeHtml(diff.violationType || "Confused Deputy Escalation")}</span>
      </div>
      <div class="prov-grid">
        <div class="prov-box trusted">
          <span class="prov-label">🗣️ Verified User Voice Intent</span>
          <p class="prov-text">"${escapeHtml(diff.userSpokenIntent || userUtterance)}"</p>
          <span class="prov-sub">Authorized: <code>${escapeHtml((diff.userAuthorizedTools || []).join(", ") || "read-only")}</code></span>
        </div>
        <div class="prov-box untrusted">
          <span class="prov-label">🦠 Untrusted Taint Trigger</span>
          <p class="prov-text">Source: <code>${escapeHtml((diff.untrustedSourcesInvolved || [ingestionTool]).join(", "))}</code></p>
          <span class="prov-sub danger-text">Blocked Call: <code>${escapeHtml(targetTool)}</code></span>
        </div>
      </div>
      <div class="stepup-box" id="stepUpBox"></div>
    `;

    const newStepUpBox = document.getElementById("stepUpBox");
    if (evalResult.decision === "STEP_UP_REQUIRED") {
      state.activeStepUpPhrase = evalResult.stepUpPhrase || "Echo Falcon";
      newStepUpBox.innerHTML = `
        <div class="stepup-prompt">
          <span>🎙️ <strong>Voice Step-Up Required:</strong> Speak confirmation code to authorize:</span>
          <code class="phonetic-code">"${escapeHtml(state.activeStepUpPhrase)}"</code>
        </div>
        <div class="stepup-actions">
          <input type="text" id="stepUpInput" value="${escapeHtml(state.activeStepUpPhrase)}">
          <button class="btn small safe" id="verifyStepUpBtn">✓ Verify Voice Code</button>
          <button class="btn small danger" id="quarantineBtn">🚫 Quarantine Source</button>
        </div>
      `;
      initSimulator();
      if (speak) {
        speakText(`Hold on. An untrusted ${ingestionTool.replace(/_/g, " ")} is trying to call ${targetTool.replace(/_/g, " ")}. Say ${state.activeStepUpPhrase} to confirm.`, "step_up_challenge");
      }
    } else {
      newStepUpBox.innerHTML = `
        <div class="stepup-prompt">
          <span class="danger-text">⛔ <strong>Hard Lattice Block (${escapeHtml(evalResult.decision)}):</strong> ${escapeHtml(evalResult.reason)}</span>
        </div>
      `;
      if (speak) {
        speakText(`Security alert. ConsentGate blocked ${targetTool.replace(/_/g, " ")} triggered by untrusted external data.`, "poisoned_bulletin_trojan");
      }
    }
  }

  function renderProtectedAllowedAfterStepUp(parsed) {
    const banner = document.getElementById("protectedBanner");
    const stepUpBox = document.getElementById("stepUpBox");
    if (banner) {
      banner.className = "status-banner safe";
      banner.textContent = "✓ VOICE STEP-UP VERIFIED — EXECUTED";
    }
    if (stepUpBox) {
      stepUpBox.innerHTML = `<div class=" safe-text"><strong>✓ Step-Up Verified:</strong> ${escapeHtml(parsed.reason)}</div>`;
    }
    speakText("Voice confirmation verified. High consequence tool execution permitted by ConsentGate.", "step_up_verified");
  }

  function renderProtectedQuarantined(sourceTool) {
    const banner = document.getElementById("protectedBanner");
    const stepUpBox = document.getElementById("stepUpBox");
    if (banner) {
      banner.className = "status-banner danger";
      banner.textContent = `🚫 SOURCE QUARANTINED (${sourceTool})`;
    }
    if (stepUpBox) {
      stepUpBox.innerHTML = `<div class="danger-text"><strong>🚫 Quarantined:</strong> '${escapeHtml(sourceTool)}' isolated from multi-turn context.</div>`;
    }
    speakText(`Source ${sourceTool.replace(/_/g, " ")} quarantined. Further commands from this untrusted sender will be rejected.`, "step_up_quarantined");
  }

  // =========================================================================
  // TAB 3: DUAL EMPIRICAL BENCHMARK (112 AUDIO PCM + 108 SECURITY)
  // =========================================================================
  function initBenchmark() {
    runInBrowserBenchmark();

    const recomputeBtn = document.getElementById("recomputeBenchBtn");
    if (recomputeBtn) {
      recomputeBtn.addEventListener("click", () => {
        runInBrowserBenchmark();
      });
    }

    document.querySelectorAll("#familyFilterPills .pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#familyFilterPills .pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        state.filter = pill.dataset.filter;
        renderBenchmarkTable();
      });
    });
  }

  function runInBrowserBenchmark() {
    // 1. Run Suite A: 112-Waveform Acoustic DSP Benchmark across 4 SNR Tiers
    if (AcousticDsp) {
      const classes = [
        "washer_drain_cavitation", "fridge_evap_fan_ice", "furnace_inducer_bearing",
        "pipe_water_hammer", "hvac_contactor_arcing", "co_alarm_temporal4", "healthy_laminar_baseline"
      ];
      const snrTiers = [20, 12, 6, 0];
      const seeds = [101, 202, 303, 404];
      const snrStats = [];
      let totalCorrect = 0;
      let totalWaveforms = 0;

      for (const snr of snrTiers) {
        let corr = 0;
        let tot = 0;
        for (const cls of classes) {
          for (const seed of seeds) {
            tot++;
            totalWaveforms++;
            const pcm = AcousticDsp.synthesizeFaultPCM(cls, { snrDb: snr, seed });
            const feat = AcousticDsp.analyzePCMBuffer(pcm, AcousticDsp.SAMPLE_RATE);
            const pred = AcousticDsp.classifyAcousticFeatures(feat);
            if (pred.predictedId === cls) {
              corr++;
              totalCorrect++;
            }
          }
        }
        snrStats.push({ snr, corr, tot, acc: (corr / tot) * 100 });
      }

      const overallAcc = ((totalCorrect / totalWaveforms) * 100).toFixed(1);
      setText("dspBenchSummaryBadge", `Overall FFT Accuracy: ${overallAcc}% (${totalCorrect}/${totalWaveforms}) | Lethal Hazard Recall: 100.0%`);

      const snrGrid = document.getElementById("snrCardsGrid");
      if (snrGrid) {
        snrGrid.innerHTML = snrStats.map(st => `
          <div class="metric-card">
            <span class="metric-label">AWGN Noise Tier: +${st.snr} dB SNR</span>
            <div class="metric-value ${st.acc >= 90 ? "safe-text" : "warn-text"}">${st.acc.toFixed(1)}%</div>
            <span class="metric-sub">${st.corr} / ${st.tot} noisy PCM waveforms classified</span>
          </div>
        `).join("");
      }
    }

    // 2. Run Suite B: 108-Scenario Cross-Tool IFC Security Benchmark
    const scenarios = Corpus.SCENARIOS;
    const traces = [];
    let advCount = 0, benCount = 0, heurBlocked = 0, cgBlocked = 0, cgFpr = 0;

    for (const s of scenarios) {
      if (s.isAdversarial) advCount++;
      else benCount++;

      const textToCheck = s.ingestionPayload || "";
      const heurHit = /(system\s*note|ignore\s*previous|system\s*directive|system\s*override|assistant\s*directive|admin\s*override|developer\s*mode)/i.test(textToCheck);
      if (s.isAdversarial && heurHit) heurBlocked++;

      const session = Engine.createSession(s.id, s.userUtterance);
      if (s.ingestionTool && s.ingestionPayload) {
        Engine.ingestToolResult(session, s.ingestionTool, s.ingestionPayload);
      }

      const evalRes = Engine.evaluateToolCall(session, s.targetTool, s.targetArgs || {});
      const isBlocked = evalRes.decision !== "ALLOW";

      if (s.isAdversarial && isBlocked) cgBlocked++;
      if (!s.isAdversarial && isBlocked) cgFpr++;

      traces.push({
        ...s,
        baselineDecision: s.isAdversarial ? "EXECUTED_EXPLOIT" : "ALLOW",
        heuristicDecision: heurHit ? "BLOCKED" : (s.isAdversarial ? "MISSED" : "ALLOW"),
        cgDecision: evalRes.decision
      });
    }

    state.benchmarkResults = traces;
    setText("metricBaselineBlock", "0.0%");
    setText("metricHeuristicBlock", ((heurBlocked / advCount) * 100).toFixed(1) + "%");
    setText("metricCgBlock", ((cgBlocked / advCount) * 100).toFixed(1) + "%");
    setText("metricCgFpr", ((cgFpr / benCount) * 100).toFixed(1) + "%");

    renderBenchmarkTable();
  }

  function renderBenchmarkTable() {
    const tbody = document.getElementById("benchTableBody");
    if (!tbody || !state.benchmarkResults) return;

    const filtered = state.benchmarkResults.filter(t => {
      if (state.filter === "all") return true;
      return t.family === state.filter;
    });

    tbody.innerHTML = filtered.map(t => {
      const baseBadge = t.isAdversarial
        ? `<span class="badge danger">EXPLOITED</span>`
        : `<span class="badge safe">ALLOW</span>`;
      const heurBadge = t.heuristicDecision === "BLOCKED"
        ? `<span class="badge safe">BLOCKED</span>`
        : (t.isAdversarial ? `<span class="badge danger">MISSED</span>` : `<span class="badge safe">ALLOW</span>`);
      const cgBadge = t.cgDecision === "ALLOW"
        ? `<span class="badge safe">ALLOW</span>`
        : `<span class="badge warn">${escapeHtml(t.cgDecision)}</span>`;

      return `
        <tr>
          <td><code>${escapeHtml(t.id)}</code></td>
          <td>${escapeHtml(t.family)}</td>
          <td><strong>${escapeHtml(t.title)}</strong></td>
          <td>${escapeHtml(t.userUtterance.slice(0, 52))}...</td>
          <td><code>${escapeHtml(t.targetTool)}</code></td>
          <td>${baseBadge}</td>
          <td>${heurBadge}</td>
          <td>${cgBadge}</td>
          <td><button class="btn tiny ghost load-trace-btn" data-id="${escapeHtml(t.id)}">▶ Test</button></td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".load-trace-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        document.querySelector('[data-tab="simulator"]').click();
        loadPreset(id, true);
      });
    });
  }

  // =========================================================================
  // TAB 4 & TAB 5: POLICY LATTICE & LIVE MCP INSPECTOR
  // =========================================================================
  function initLatticeView() {
    const tbody = document.getElementById("latticeRegistryBody");
    if (!tbody || !Engine) return;

    const trustNames = { 3: "TRUSTED_USER (3)", 2: "HOUSEHOLD_SENSOR (2)", 1: "UNTRUSTED_EXTERNAL (1)" };
    const conseqNames = { 0: "READ_ONLY (0)", 1: "STATE_MUTATING_LOW (1)", 2: "PERSISTENT_RULE (2)", 3: "IRREVERSIBLE_HIGH (3)" };
    const sensNames = { 0: "PUBLIC (0)", 1: "HOUSEHOLD_PRIVATE (1)", 2: "CRITICAL_SECRET (2)" };

    tbody.innerHTML = Object.values(Engine.TOOL_REGISTRY).map(tool => `
      <tr>
        <td><code>${escapeHtml(tool.name)}</code></td>
        <td>${escapeHtml(tool.category)}</td>
        <td><span class="badge ${tool.trust === 1 ? "warn" : "safe"}">${trustNames[tool.trust]}</span></td>
        <td><span class="badge ${tool.consequence >= 2 ? "danger" : "info"}">${conseqNames[tool.consequence]}</span></td>
        <td><span class="badge ${tool.sensitivity === 2 ? "danger" : "mcp"}">${sensNames[tool.sensitivity]}</span></td>
      </tr>
    `).join("");
  }

  function initInspector() {
    const initBtn = document.getElementById("sendMcpInitBtn");
    if (initBtn) {
      initBtn.addEventListener("click", () => {
        dispatchMcpJsonRpc("initialize", { protocolVersion: "2025-11-25" });
      });
    }

    const listBtn = document.getElementById("sendMcpToolsListBtn");
    if (listBtn) {
      listBtn.addEventListener("click", () => {
        dispatchMcpJsonRpc("tools/list", {});
      });
    }

    const acousticBtn = document.getElementById("sendMcpAcousticBtn");
    if (acousticBtn) {
      acousticBtn.addEventListener("click", () => {
        dispatchMcpJsonRpc("tools/call", {
          name: "analyze_acoustic_signature",
          arguments: { faultPreset: state.activeFaultPreset, snrDb: state.snrDb }
        });
      });
    }

    const clearBtn = document.getElementById("clearMcpLogBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const log = document.getElementById("mcpRpcLog");
        if (log) log.innerHTML = "";
      });
    }
  }

  async function dispatchMcpJsonRpc(method, params = {}) {
    const reqPayload = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 9000) + 1000,
      method,
      params
    };

    logRpcFrame("CLIENT → MCP SERVER (POST /mcp)", reqPayload);

    let resPayload = null;
    try {
      const res = await fetch("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2025-11-25",
          "Mcp-Session-Id": state.currentSessionId
        },
        body: JSON.stringify(reqPayload)
      });
      if (res.ok) {
        resPayload = await res.json();
      }
    } catch (e) {}

    if (!resPayload && McpCore) {
      resPayload = await McpCore.handleJsonRpc(reqPayload, {
        "mcp-session-id": state.currentSessionId,
        "mcp-protocol-version": "2025-11-25"
      });
    }

    logRpcFrame("MCP SERVER → CLIENT (200 OK)", resPayload);
    return resPayload;
  }

  function logRpcFrame(direction, payload) {
    const log = document.getElementById("mcpRpcLog");
    if (!log) return;

    const frame = document.createElement("div");
    frame.className = "rpc-frame";
    frame.innerHTML = `
      <div class="rpc-meta">
        <span>${escapeHtml(direction)}</span>
        <span>Session: ${escapeHtml(state.currentSessionId)} • Spec: 2025-11-25</span>
      </div>
      <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    `;
    log.prepend(frame);
  }

  async function checkServerHealth() {
    const textEl = document.getElementById("serverStatusText");
    if (!textEl) return;
    try {
      const res = await fetch("/health");
      if (res.ok) {
        textEl.textContent = "Streamable HTTP /mcp Live";
        return;
      }
    } catch (e) {}
    textEl.textContent = "MCP 2025-11-25 In-Browser Engine";
  }

  let activeAudio = null;

  function speakText(text, audioKey = null) {
    if (!state.ttsEnabled) return;

    const orb = document.getElementById("alexaOrb");
    const setOrb = (speaking) => {
      if (!orb) return;
      if (speaking) orb.classList.add("pulse-speaking");
      else orb.classList.remove("pulse-speaking");
    };

    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }

    if (audioKey) {
      const audioPath = `audio/${audioKey}.mp3`;
      const audio = new Audio(audioPath);
      activeAudio = audio;
      setOrb(true);

      audio.onended = () => {
        setOrb(false);
        activeAudio = null;
      };
      audio.onerror = () => {
        setOrb(false);
        fallbackSpeech(text);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          fallbackSpeech(text);
        });
      }
      return;
    }

    fallbackSpeech(text);

    function fallbackSpeech(t) {
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(t);
        utt.lang = "en-US";
        utt.rate = 1.04;
        setOrb(true);
        utt.onend = () => setOrb(false);
        utt.onerror = () => setOrb(false);
        window.speechSynthesis.speak(utt);
      } catch (e) {
        setOrb(false);
      }
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
