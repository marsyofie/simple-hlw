const mysql = require("mysql2/promise");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "helloworld";

async function run() {
  const newMessage = process.argv.slice(2).join(" ").trim();

  if (!newMessage) {
    console.error('Usage: node update-message.js "Pesan baru"');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    const [result] = await connection.query(
      "UPDATE messages SET text = ? ORDER BY id ASC LIMIT 1",
      [newMessage]
    );

    if (result.affectedRows === 0) {
      await connection.query("INSERT INTO messages (text) VALUES (?)", [newMessage]);
    }

    console.log(JSON.stringify({
      message: "message updated",
      text: newMessage,
      timestamp: new Date().toISOString(),
    }));
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(JSON.stringify({
    message: "update message failed",
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  }));
  process.exit(1);
});
