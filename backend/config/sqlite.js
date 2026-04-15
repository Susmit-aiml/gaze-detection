const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_SQLITE_PATH = path.join(__dirname, "..", "sqlite-data", "gaze_results.sqlite");
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_PATH;

let sqliteDb = null;
let insertGazeRecordStatement = null;

function ensureSqliteReady() {
  if (sqliteDb) {
    return sqliteDb;
  }

  const resolvedPath = path.resolve(SQLITE_DB_PATH);
  const dbDirectory = path.dirname(resolvedPath);

  fs.mkdirSync(dbDirectory, { recursive: true });

  sqliteDb = new DatabaseSync(resolvedPath);
  sqliteDb.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS gaze_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      image_blob BLOB NOT NULL,
      image_size_bytes INTEGER NOT NULL,
      gaze_label TEXT NOT NULL,
      confidence REAL NOT NULL,
      decision_path TEXT DEFAULT '',
      model_version TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gaze_predictions_user_id
      ON gaze_predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_gaze_predictions_created_at
      ON gaze_predictions(created_at);
  `);

  insertGazeRecordStatement = sqliteDb.prepare(`
    INSERT INTO gaze_predictions (
      user_id,
      file_name,
      mime_type,
      image_blob,
      image_size_bytes,
      gaze_label,
      confidence,
      decision_path,
      model_version,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return sqliteDb;
}

function initSqlite() {
  const db = ensureSqliteReady();
  return {
    path: path.resolve(SQLITE_DB_PATH),
    isOpen: Boolean(db && db.isOpen),
  };
}

function insertGazePredictionSql({
  userId,
  fileName,
  mimeType,
  imageBuffer,
  gazeLabel,
  confidence,
  decisionPath,
  modelVersion,
  createdAt,
}) {
  ensureSqliteReady();

  const result = insertGazeRecordStatement.run(
    String(userId),
    String(fileName),
    String(mimeType),
    imageBuffer,
    Number(imageBuffer.length),
    String(gazeLabel),
    Number(confidence),
    String(decisionPath || ""),
    String(modelVersion || ""),
    String(createdAt || new Date().toISOString())
  );

  return {
    id: Number(result.lastInsertRowid),
    changes: Number(result.changes),
  };
}

function countSqlPredictions() {
  ensureSqliteReady();
  const row = sqliteDb.prepare("SELECT COUNT(*) AS total FROM gaze_predictions").get();
  return Number(row.total || 0);
}

module.exports = {
  initSqlite,
  insertGazePredictionSql,
  countSqlPredictions,
};
