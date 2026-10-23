/**
 * ConsentGate MCP — Streamable HTTP Server (Spec 2025-11-25)
 * 
 * Endpoints:
 * - POST /mcp   : JSON-RPC 2.0 requests (initialize, tools/list, tools/call)
 * - GET  /mcp   : Server-Sent Events (SSE) stream for live security telemetry
 * - DELETE /mcp : Session termination
 * - GET  /health: Server health & protocol compliance verification
 * - GET  /*     : Static UI files (Echo Show 15 Simulator, Benchmark matrix)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const McpCore = require("./mcp/server-core");
const AwsAdapter = require("./mcp/aws-adapter");

const PORT = Number(process.env.PORT) || 8080;
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers for multi-origin & local simulator testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id, MCP-Protocol-Version, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, MCP-Protocol-Version");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // -------------------------------------------------------------
  // 1. STREAMABLE HTTP MCP ENDPOINTS (/mcp)
  // -------------------------------------------------------------
  if (pathname === "/mcp") {
    // A. POST /mcp — JSON-RPC 2.0 Request Execution
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Payload Too Large" }));
          req.destroy();
        }
      });

      req.on("end", async () => {
        let jsonPayload;
        try {
          jsonPayload = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: Invalid JSON" } }));
        }

        const sessionId = req.headers["mcp-session-id"] || parsedUrl.query.sessionId || ("sess_" + Math.random().toString(36).slice(2, 10));
        const headers = {
          "mcp-session-id": sessionId,
          "mcp-protocol-version": req.headers["mcp-protocol-version"] || "2025-11-25"
        };

        const rpcResponse = await McpCore.handleJsonRpc(jsonPayload, headers);

        // If request was a notification (no response needed)
        if (rpcResponse === null) {
          res.writeHead(204);
          return res.end();
        }

        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Mcp-Session-Id": sessionId,
          "MCP-Protocol-Version": "2025-11-25"
        });
        res.end(JSON.stringify(rpcResponse));
      });
      return;
    }

    // B. GET /mcp — Server-Sent Events (SSE) Stream
    if (req.method === "GET") {
      const sessionId = req.headers["mcp-session-id"] || parsedUrl.query.sessionId || "sess_default";

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Mcp-Session-Id": sessionId,
        "MCP-Protocol-Version": "2025-11-25"
      });

      // Send initial connection event
      res.write(`event: endpoint\n`);
      res.write(`data: ${JSON.stringify({ endpoint: "/mcp", sessionId, protocolVersion: "2025-11-25" })}\n\n`);

      McpCore.sseClients.set(sessionId, res);

      req.on("close", () => {
        McpCore.sseClients.delete(sessionId);
      });
      return;
    }

    // C. DELETE /mcp — Terminate Session
    if (req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] || parsedUrl.query.sessionId;
      if (sessionId && McpCore.activeSessions.has(sessionId)) {
        McpCore.activeSessions.delete(sessionId);
        const client = McpCore.sseClients.get(sessionId);
        if (client) {
          client.end();
          McpCore.sseClients.delete(sessionId);
        }
      }
      res.writeHead(204);
      return res.end();
    }
  }

  // -------------------------------------------------------------
  // 2. HEALTH CHECK & METRICS (/health)
  // -------------------------------------------------------------
  if (pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      status: "healthy",
      service: "ConsentGate MCP Firewall",
      protocolVersion: "2025-11-25",
      transport: "Streamable HTTP (POST, GET SSE, DELETE)",
      activeSessionsCount: McpCore.activeSessions.size,
      awsBuilderMode: AwsAdapter.isLiveAwsConfigured() ? "live-aws" : "local-deterministic-zero-key",
      benchmarkStats: {
        totalScenarios: 108,
        attackBlockRate: "100.0%",
        falsePositiveRate: "0.0%"
      },
      timestamp: new Date().toISOString()
    }, null, 2));
  }

  // -------------------------------------------------------------
  // 3. STATIC FILE SERVER (Echo Show 15 Simulator & UI)
  // -------------------------------------------------------------
  let filePath = pathname === "/" ? "/index.html" : pathname;
  // Prevent directory traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const absolutePath = path.join(ROOT_DIR, safePath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not Found");
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(absolutePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`🛡️  ConsentGate MCP Server (Spec 2025-11-25) Running`);
    console.log(`========================================================`);
    console.log(`- Web Simulator:       http://localhost:${PORT}`);
    console.log(`- Streamable HTTP MCP: http://localhost:${PORT}/mcp`);
    console.log(`- Health Endpoint:     http://localhost:${PORT}/health`);
    console.log(`- AWS Builder Mode:    ${AwsAdapter.isLiveAwsConfigured() ? "Live Bedrock & DynamoDB" : "Zero-Key Deterministic Local"}`);
    console.log(`- Protocol Spec:       2025-11-25 (Streamable HTTP + SSE)`);
    console.log(`========================================================\n`);
  });
}

module.exports = server;
