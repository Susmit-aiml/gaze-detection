const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const { initSqlite } = require("./config/sqlite");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");

dotenv.config();
connectDB();

try {
  const sqliteState = initSqlite();
  console.log(`SQLite connected: ${sqliteState.path}`);
} catch (error) {
  console.error("SQLite initialization failed:", error.message);
  process.exit(1);
}

const app = express();

const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        clientUrls.includes("*") ||
        clientUrls.length === 0 ||
        clientUrls.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
  res.send("Gaze Detection Auth API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
