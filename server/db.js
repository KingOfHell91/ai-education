const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'abi_tasks.sqlite');

function ensureDatabaseFile() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

ensureDatabaseFile();

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('[DB] Failed to open SQLite database', err);
    throw err;
  }

  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS abi_tasks (
        id TEXT PRIMARY KEY,
        title TEXT,
        year INTEGER,
        subject TEXT,
        tags TEXT,
        pdf_path TEXT NOT NULL,
        original_filename TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      (createErr) => {
        if (createErr) {
          console.error('[DB] Failed to create abi_tasks table', createErr);
          throw createErr;
        }
        console.log('[DB] SQLite ready @', DB_FILE);
      }
    );
  });
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? deserializeRow(row) : null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.map(deserializeRow));
    });
  });
}

function deserializeRow(row) {
  if (!row) return row;
  const parsed = { ...row };
  if (parsed.metadata) {
    try {
      parsed.metadata = JSON.parse(parsed.metadata);
    } catch {
      parsed.metadata = null;
    }
  }
  if (parsed.tags) {
    parsed.tags = parsed.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  } else {
    parsed.tags = [];
  }
  return parsed;
}

async function createAbiTask(task) {
  const {
    id,
    title = null,
    year = null,
    subject = null,
    tags = [],
    pdfPath,
    originalFilename = null,
    metadata = null
  } = task;

  const tagString = tags && tags.length > 0 ? tags.join(',') : null;
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await run(
    `INSERT INTO abi_tasks (
      id,
      title,
      year,
      subject,
      tags,
      pdf_path,
      original_filename,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, year, subject, tagString, pdfPath, originalFilename, metadataJson]
  );

  return getAbiTaskById(id);
}

async function getAbiTaskById(id) {
  return get(`SELECT * FROM abi_tasks WHERE id = ?`, [id]);
}

async function getRandomAbiTask() {
  return get(`SELECT * FROM abi_tasks ORDER BY RANDOM() LIMIT 1`);
}

async function listAbiTasks(limit = 50) {
  return all(
    `SELECT * FROM abi_tasks ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

module.exports = {
  createAbiTask,
  getAbiTaskById,
  getRandomAbiTask,
  listAbiTasks,
  DB_FILE
};

