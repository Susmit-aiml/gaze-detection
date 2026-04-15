# SQL Integration Guide for Gaze Results

This guide explains what SQL is, what was configured in this project, and what you need to do next.

## 1) SQL in simple words

SQL database stores data in **tables (rows + columns)**.

- Each analysis = one row
- Columns store values like `user_id`, `gaze_label`, `confidence`
- You can query history later using SQL (for reporting/model proof)

In this project, we used **SQLite** (file-based SQL database) so setup stays easy for local development.

## 2) What was configured

### Backend now writes to 2 databases after successful prediction

1. MongoDB (existing flow)
2. SQLite (new flow, for analytics/proof history)

### Files added/updated

- Added: `backend/config/sqlite.js`
- Updated: `backend/controllers/analyzeController.js`
- Updated: `backend/server.js`
- Updated: `backend/.gitignore` (ignores local SQLite data files)

### SQL DB file path

Default SQLite file path:

`backend/sqlite-data/gaze_results.sqlite`

It is auto-created on backend startup.

## 3) SQL table schema used

Table: `gaze_predictions`

Stored fields:

- `id` (auto increment primary key)
- `user_id`
- `file_name`
- `mime_type`
- `image_blob` (the uploaded image bytes)
- `image_size_bytes`
- `gaze_label`
- `confidence`
- `decision_path`
- `model_version`
- `created_at`

So yes: your requirement is implemented, the analyzed image is saved in SQL with result fields.

## 4) Runtime flow now

1. Frontend sends image to backend
2. Backend calls HF `/health`
3. Backend calls HF `/predict`
4. Backend stores result in MongoDB
5. Backend stores image + result in SQLite (`gaze_predictions`)
6. Backend returns response to frontend

## 5) Environment variables

Add these in `backend/.env` if you want custom SQL location:

```env
# Optional (default already works)
SQLITE_DB_PATH=./sqlite-data/gaze_results.sqlite
```

If not set, default path is used.

## 6) How to verify SQL is working

Run from `backend/` folder:

```bash
node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync('./sqlite-data/gaze_results.sqlite'); const row = db.prepare('SELECT COUNT(*) AS total FROM gaze_predictions').get(); console.log(row);"
```

Check latest records:

```bash
node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync('./sqlite-data/gaze_results.sqlite'); const rows = db.prepare('SELECT id, user_id, file_name, gaze_label, confidence, created_at FROM gaze_predictions ORDER BY id DESC LIMIT 10').all(); console.log(rows);"
```

## 7) Important notes

- `node:sqlite` currently shows an experimental warning in Node 22.x.
- SQLite is excellent for local/single-machine analytics.
- For production scaling, move to PostgreSQL/MySQL.
- Image BLOB storage grows DB quickly; monitor file size.

## 8) Next steps (recommended)

1. Add a new protected API endpoint to fetch SQL analytics (`/api/protected/sql/history`).
2. Add endpoint to export CSV summary for model efficiency report.
3. Store image hash + optional compressed preview to reduce DB growth.
4. Move from SQLite to PostgreSQL when multi-user load increases.

## 9) Backup advice

SQLite is one file. Backup regularly:

- file: `backend/sqlite-data/gaze_results.sqlite`

For reproducible reporting, keep periodic backups with timestamped file names.
