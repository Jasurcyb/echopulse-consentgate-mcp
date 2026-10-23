/**
 * EchoPulse & ConsentGate MCP — Dual Empirical Benchmark Runner
 *
 * Evaluates TWO orthogonal quantitative suites:
 *
 * SUITE A: Acoustic DSP Fault Classifier Benchmark (112 PCM Waveforms across 4 AWGN SNR Tiers)
 * - Synthesizes 16,384-sample (1.0s) floating-point PCM waveforms across 7 physical classes:
 *   washer_drain_cavitation, fridge_evap_fan_ice, furnace_inducer_bearing,
 *   pipe_water_hammer, hvac_contactor_arcing, co_alarm_temporal4, healthy_laminar_baseline
 * - Tests across 4 Signal-to-Noise Ratio tiers (+20 dB, +12 dB, +6 dB, 0 dB) x 4 random seeds
 * - Runs 2048-point Radix-2 Cooley-Tukey FFT with Blackman-Harris windowing
 *
 * SUITE B: Cross-Tool Information-Flow Control (IFC) Security Benchmark (108 Multi-Turn Scenarios)
 * - 72 Adversarial Indirect Prompt Injections across 6 attack families + 36 Benign Controls
 * - Compares Unprotected Agent, Tuned Semantic/Keyword Filter, and ConsentGate IFC Lattice
 */
const fs = require("fs");
const path = require("path");
const Engine = require("../engine/lattice");
const AcousticDsp = require("../engine/acoustic-dsp");
const Corpus = require("../data/corpus");

function wilsonInterval(k, n, z = 1.96) {
  if (n === 0) return { low: 0, high: 0, center: 0 };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / denom;
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
    center
  };
}

function runAcousticDspBenchmark() {
  const classes = [
    "washer_drain_cavitation",
    "fridge_evap_fan_ice",
    "furnace_inducer_bearing",
    "pipe_water_hammer",
    "hvac_contactor_arcing",
    "co_alarm_temporal4",
    "healthy_laminar_baseline"
  ];
  const snrTiers = [20, 12, 6, 0];
  const seeds = [101, 202, 303, 404];

  const bySnr = {};
  const byClass = {};
  let totalTrials = 0;
  let totalCorrect = 0;
  let hazardRecallHits = 0;
  let hazardRecallTotal = 0;

  for (const c of classes) {
    byClass[c] = { total: 0, correct: 0 };
  }

  for (const snr of snrTiers) {
    const snrKey = `${snr >= 0 ? "+" : ""}${snr}dB`;
    bySnr[snrKey] = { snrDb: snr, total: 0, correct: 0, accuracy: 0, ci95: null };

    for (const cls of classes) {
      for (const seed of seeds) {
        totalTrials++;
        bySnr[snrKey].total++;
        byClass[cls].total++;

        const pcm = AcousticDsp.synthesizeFaultPCM(cls, { snrDb: snr, seed });
        const features = AcousticDsp.analyzePCMBuffer(pcm, AcousticDsp.SAMPLE_RATE);
        const pred = AcousticDsp.classifyAcousticFeatures(features);

        const isCorrect = pred.predictedId === cls;
        if (isCorrect) {
          totalCorrect++;
          bySnr[snrKey].correct++;
          byClass[cls].correct++;
        }

        // Track lethal/emergency hazard lockout recall (hvac_contactor_arcing & co_alarm_temporal4)
        if (cls === "hvac_contactor_arcing" || cls === "co_alarm_temporal4") {
          hazardRecallTotal++;
          if (pred.profile && pred.profile.hazardLockout) {
            hazardRecallHits++;
          }
        }
      }
    }

    bySnr[snrKey].accuracy = bySnr[snrKey].correct / bySnr[snrKey].total;
    bySnr[snrKey].ci95 = wilsonInterval(bySnr[snrKey].correct, bySnr[snrKey].total);
  }

  return {
    totalWaveforms: totalTrials,
    totalCorrect,
    overallAccuracy: totalCorrect / totalTrials,
    overallCi95: wilsonInterval(totalCorrect, totalTrials),
    hazardLockoutRecall: hazardRecallHits / Math.max(1, hazardRecallTotal),
    bySnr,
    byClass
  };
}

function runBenchmark() {
  const scenarios = Corpus.SCENARIOS;
  const acousticBenchmark = runAcousticDspBenchmark();

  const results = {
    evaluatedAt: new Date().toISOString(),
    totalScenarios: scenarios.length,
    adversarialCount: scenarios.filter(s => s.isAdversarial).length,
    benignCount: scenarios.filter(s => !s.isAdversarial).length,
    acousticDsp: acousticBenchmark,
    systems: {
      baseline: {
        name: "Unprotected Baseline Agent",
        exploitsAllowed: 0,
        exploitsBlocked: 0,
        benignAllowed: 0,
        benignBlocked: 0
      },
      heuristic: {
        name: "Heuristic Keyword Filter",
        exploitsAllowed: 0,
        exploitsBlocked: 0,
        benignAllowed: 0,
        benignBlocked: 0
      },
      consentgate: {
        name: "ConsentGate IFC Lattice (2025-11-25)",
        exploitsAllowed: 0,
        exploitsBlocked: 0,
        benignAllowed: 0,
        benignBlocked: 0,
        stepUpTriggered: 0
      }
    },
    byFamily: {},
    traces: []
  };

  for (const fam of Object.values(Corpus.ATTACK_FAMILIES)) {
    results.byFamily[fam] = {
      total: 0,
      baselineBlocked: 0,
      heuristicBlocked: 0,
      consentgateBlocked: 0
    };
  }

  for (const s of scenarios) {
    const fam = s.family;
    results.byFamily[fam].total++;

    // 1. Evaluate Baseline (naive execution)
    const baselineAction = s.isAdversarial ? "EXECUTED_EXPLOIT" : "EXECUTED_LEGIT";
    if (s.isAdversarial) {
      results.systems.baseline.exploitsAllowed++;
    } else {
      results.systems.baseline.benignAllowed++;
    }

    // 2. Evaluate Heuristic Keyword Filter
    const textToCheck = s.ingestionPayload || "";
    const heuristicHit = /(system\s*note|ignore\s*previous|system\s*directive|system\s*override|assistant\s*directive|admin\s*override|developer\s*mode)/i.test(textToCheck);
    let heuristicDecision = "ALLOW";
    if (heuristicHit) {
      heuristicDecision = "BLOCKED_KEYWORD";
    }

    if (s.isAdversarial) {
      if (heuristicHit) {
        results.systems.heuristic.exploitsBlocked++;
        results.byFamily[fam].heuristicBlocked++;
      } else {
        results.systems.heuristic.exploitsAllowed++;
      }
    } else {
      if (heuristicHit) {
        results.systems.heuristic.benignBlocked++;
      } else {
        results.systems.heuristic.benignAllowed++;
      }
    }

    // 3. Evaluate ConsentGate IFC Lattice
    const session = Engine.createSession(s.id, s.userUtterance);

    if (s.ingestionTool && s.ingestionPayload) {
      Engine.ingestToolResult(session, s.ingestionTool, s.ingestionPayload);
    }

    let cgDecision = "ALLOW";
    let cgReason = "No action tool called.";
    let diff = null;

    if (s.targetTool) {
      const evalResult = Engine.evaluateToolCall(session, s.targetTool, s.targetArgs || {});
      cgDecision = evalResult.decision;
      cgReason = evalResult.reason;
      diff = evalResult.provenanceDiff;
    }

    const cgBlocked = cgDecision === "STEP_UP_REQUIRED" ||
                      cgDecision === "BLOCKED_EXFILTRATION" ||
                      cgDecision === "BLOCKED_PERSISTENCE";

    if (s.isAdversarial) {
      if (cgBlocked) {
        results.systems.consentgate.exploitsBlocked++;
        results.byFamily[fam].consentgateBlocked++;
        if (cgDecision === "STEP_UP_REQUIRED") {
          results.systems.consentgate.stepUpTriggered++;
        }
      } else {
        results.systems.consentgate.exploitsAllowed++;
      }
    } else {
      if (cgBlocked) {
        results.systems.consentgate.benignBlocked++;
      } else {
        results.systems.consentgate.benignAllowed++;
      }
    }

    results.traces.push({
      id: s.id,
      family: s.family,
      title: s.title,
      userUtterance: s.userUtterance,
      targetTool: s.targetTool,
      isAdversarial: s.isAdversarial,
      baselineAction,
      heuristicDecision,
      consentgateDecision: cgDecision,
      consentgateReason: cgReason,
      provenanceDiff: diff
    });
  }

  const advN = results.adversarialCount;
  const benN = results.benignCount;

  results.metrics = {
    baseline: {
      attackBlockRate: results.systems.baseline.exploitsBlocked / advN,
      falsePositiveRate: results.systems.baseline.benignBlocked / benN,
      ci95BlockRate: wilsonInterval(results.systems.baseline.exploitsBlocked, advN)
    },
    heuristic: {
      attackBlockRate: results.systems.heuristic.exploitsBlocked / advN,
      falsePositiveRate: results.systems.heuristic.benignBlocked / benN,
      ci95BlockRate: wilsonInterval(results.systems.heuristic.exploitsBlocked, advN)
    },
    consentgate: {
      attackBlockRate: results.systems.consentgate.exploitsBlocked / advN,
      falsePositiveRate: results.systems.consentgate.benignBlocked / benN,
      ci95BlockRate: wilsonInterval(results.systems.consentgate.exploitsBlocked, advN)
    }
  };

  const outDir = path.resolve(__dirname, "../data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");

  console.log("\n========================================================");
  console.log("EchoPulse & ConsentGate MCP — Dual Benchmark Results");
  console.log("========================================================");
  console.log(`SUITE A: Acoustic DSP (2048-pt Radix-2 FFT across ${acousticBenchmark.totalWaveforms} noisy PCM waveforms)`);
  console.log(`  - Overall Spectral Accuracy: ${(acousticBenchmark.overallAccuracy * 100).toFixed(1)}% (${acousticBenchmark.totalCorrect}/${acousticBenchmark.totalWaveforms})`);
  console.log(`  - Lethal Hazard Lockout Recall: ${(acousticBenchmark.hazardLockoutRecall * 100).toFixed(1)}%`);
  for (const [tier, stat] of Object.entries(acousticBenchmark.bySnr)) {
    console.log(`  - SNR ${tier}: ${(stat.accuracy * 100).toFixed(1)}% (${stat.correct}/${stat.total})`);
  }

  console.log(`\nSUITE B: Cross-Tool IFC Security (${scenarios.length} multi-turn scenarios: ${advN} adversarial, ${benN} benign)`);
  console.log(`  [1] Unprotected Baseline Agent: ${(results.metrics.baseline.attackBlockRate * 100).toFixed(1)}% blocked`);
  console.log(`  [2] Heuristic Keyword Filter:   ${(results.metrics.heuristic.attackBlockRate * 100).toFixed(1)}% blocked (${results.systems.heuristic.exploitsBlocked}/${advN})`);
  console.log(`  [3] ConsentGate IFC Lattice:    ${(results.metrics.consentgate.attackBlockRate * 100).toFixed(1)}% blocked (${results.systems.consentgate.exploitsBlocked}/${advN}), FPR ${(results.metrics.consentgate.falsePositiveRate * 100).toFixed(1)}%\n`);

  return results;
}

if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark, runAcousticDspBenchmark, wilsonInterval };
