const express = require("express");
const mysql = require("mysql2/promise");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 8080;
const HOSTNAME = os.hostname();
const DEFAULT_MESSAGE = "Hello World!";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "helloworld",
});

const log = (level, message, extra = {}) => {
  console.log(JSON.stringify({ level, message, hostname: HOSTNAME, timestamp: new Date().toISOString(), ...extra }));
};

app.use((req, _res, next) => {
  req._startAt = Date.now();
  next();
});

app.use((req, res, next) => {
  res.on("finish", () => {
    const ms = Date.now() - req._startAt;
    log("INFO", "request", { method: req.method, path: req.path, status: res.statusCode, duration_ms: parseFloat(ms) });
  });
  next();
});

app.get("/", async (_req, res) => {
  let message = DEFAULT_MESSAGE;

  try {
    const [rows] = await pool.query("SELECT text FROM messages LIMIT 1");
    message = rows.length ? rows[0].text : DEFAULT_MESSAGE;
  } catch (err) {
    log("WARN", "failed to load message from database, using default", {
      error: err.message,
      fallback_message: DEFAULT_MESSAGE,
    });
  }

  log("INFO", "served message", { message });
  res.send(`${message}\nHostname: ${HOSTNAME}\n`);
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", hostname: HOSTNAME });
  } catch (err) {
    res.status(503).json({ status: "error", hostname: HOSTNAME, error: "database unavailable" });
  }
});

app.use((err, _req, res, _next) => {
  log("ERROR", "unhandled error", { error: err.message, stack: err.stack });
  res.status(500).send("Internal Server Error\n");
});

app.listen(PORT, () => {
  log("INFO", "server started!!", { port: PORT });
});
