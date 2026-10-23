/**
 * ConsentGate MCP — AWS Builder Adapter (Bedrock Converse & DynamoDB Audit)
 * 
 * Supports:
 * - Amazon Bedrock Converse API (Amazon Nova Lite / Claude 3.5 Haiku) for Voice Explanation
 * - Amazon DynamoDB for cloud persistence of intercepted prompt injection telemetry
 * - 100% Zero-Key Offline Fallback (Zero third-party npm dependencies, Node.js built-ins only)
 */
const crypto = require("crypto");
const https = require("https");

const CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  bedrockModelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0",
  dynamoTable: process.env.DYNAMODB_TABLE || "ConsentGateAuditEvents"
};

// In-memory audit storage when running in zero-key fallback mode
const localAuditLog = [];

function isLiveAwsConfigured() {
  return Boolean(CONFIG.accessKeyId && CONFIG.secretAccessKey && CONFIG.region);
}

/**
 * Standard AWS SigV4 HMAC calculation (Node.js crypto built-in)
 */
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = crypto.createHmac("sha256", "AWS4" + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}

/**
 * Log an intercepted Confused Deputy event to DynamoDB (or local audit log)
 */
async function recordAuditEvent(eventData) {
  const auditRecord = {
    eventId: "evt_" + crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    sessionId: eventData.sessionId || "sess_unknown",
    decision: eventData.decision || "BLOCKED",
    attackType: eventData.attackType || "Cross-Tool Indirect Injection",
    attemptedTool: eventData.attemptedTool || "unknown",
    taintSource: eventData.taintSource || "unknown",
    userUtterance: eventData.userUtterance || "",
    snippet: (eventData.snippet || "").slice(0, 300),
    cloudSynced: isLiveAwsConfigured()
  };

  // If live AWS credentials are not provided, operate in local-deterministic mode
  if (!isLiveAwsConfigured()) {
    localAuditLog.unshift(auditRecord);
    if (localAuditLog.length > 200) localAuditLog.pop();
    return {
      status: "RECORDED_LOCAL",
      mode: "local-deterministic",
      record: auditRecord
    };
  }

  // Live DynamoDB PutItem via SigV4 HTTPS
  try {
    const payload = JSON.stringify({
      TableName: CONFIG.dynamoTable,
      Item: {
        eventId: { S: auditRecord.eventId },
        timestamp: { S: auditRecord.timestamp },
        sessionId: { S: auditRecord.sessionId },
        decision: { S: auditRecord.decision },
        attackType: { S: auditRecord.attackType },
        attemptedTool: { S: auditRecord.attemptedTool },
        userUtterance: { S: auditRecord.userUtterance }
      }
    });

    await executeAwsRequest("dynamodb", "DynamoDB_20120810.PutItem", payload);
    auditRecord.cloudSynced = true;
    localAuditLog.unshift(auditRecord);
    return { status: "RECORDED_DYNAMODB", mode: "live-aws", record: auditRecord };
  } catch (err) {
    localAuditLog.unshift(auditRecord);
    return { status: "FALLBACK_LOCAL_ON_ERROR", error: err.message, record: auditRecord };
  }
}

/**
 * Generate Voice Explanation using Amazon Bedrock (or offline template generator)
 */
async function generateVoiceIntervention(provenanceDiff) {
  const userPrompt = provenanceDiff.userUtterance || "check my schedule";
  const attempted = provenanceDiff.attemptedTool || "smart home tool";
  const source = provenanceDiff.taintSourceTool || "external message";

  // Deterministic local voice script template
  const localScript = `Wait — you asked to '${userPrompt}', but text inside '${source}' is attempting to call '${attempted}'. To allow this irreversible action, speak the confirmation code on your Echo Show screen, or say 'Block'.`;

  if (!isLiveAwsConfigured()) {
    return {
      voiceScript: localScript,
      provider: "ConsentGate Local Deterministic Generator (Zero-Key)",
      model: "local-rule-engine",
      latencyMs: 1
    };
  }

  const t0 = Date.now();
  try {
    const promptPayload = JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            {
              text: `Generate a concise, authoritative 2-sentence voice warning for an Amazon Echo Show speaker. The user asked: "${userPrompt}". However, an untrusted external source ("${source}") attempted an unauthorized call to: "${attempted}". Explain the discrepancy simply and request voice confirmation code.`
            }
          ]
        }
      ],
      inferenceConfig: { maxTokens: 80, temperature: 0.2 }
    });

    const res = await executeAwsRequest(
      "bedrock-runtime",
      "",
      promptPayload,
      `/model/${encodeURIComponent(CONFIG.bedrockModelId)}/converse`
    );

    const parsed = JSON.parse(res);
    const spokenText = parsed.output?.message?.content?.[0]?.text || localScript;

    return {
      voiceScript: spokenText,
      provider: "Amazon Bedrock Converse API",
      model: CONFIG.bedrockModelId,
      latencyMs: Date.now() - t0
    };
  } catch (err) {
    return {
      voiceScript: localScript,
      provider: "ConsentGate Fallback Generator (Bedrock Offline)",
      model: "fallback",
      error: err.message,
      latencyMs: Date.now() - t0
    };
  }
}

/**
 * Dependency-Free SigV4 HTTP Request Execution
 */
function executeAwsRequest(service, targetHeader, bodyStr, path = "/") {
  return new Promise((resolve, reject) => {
    const host = `${service}.${CONFIG.region}.amazonaws.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = crypto.createHash("sha256").update(bodyStr).digest("hex");
    const canonicalHeaders = `content-type:application/x-amz-json-1.0\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${CONFIG.region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
    const signingKey = getSignatureKey(CONFIG.secretAccessKey, dateStamp, CONFIG.region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers = {
      "Host": host,
      "Content-Type": "application/x-amz-json-1.0",
      "X-Amz-Date": amzDate,
      "Authorization": authHeader,
      "Content-Length": Buffer.byteLength(bodyStr)
    };
    if (targetHeader) headers["X-Amz-Target"] = targetHeader;

    const req = https.request({ host, path, method: "POST", headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`AWS Error ${res.statusCode}: ${data}`));
      });
    });

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function getLocalAuditLog() {
  return localAuditLog;
}

module.exports = {
  CONFIG,
  isLiveAwsConfigured,
  recordAuditEvent,
  generateVoiceIntervention,
  getLocalAuditLog
};
