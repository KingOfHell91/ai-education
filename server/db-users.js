const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'users.sqlite');

function ensureDatabaseDir() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
}

ensureDatabaseDir();

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('[UsersDB] Failed to open SQLite database', err);
        throw err;
    }

    db.serialize(() => {
        // Users Tabelle
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                birth_date TEXT,
                email_verified INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT,
                profile_data TEXT,
                settings TEXT
            )
        `, (createErr) => {
            if (createErr) {
                console.error('[UsersDB] Failed to create users table', createErr);
                throw createErr;
            }
            console.log('[UsersDB] Users table ready');
        });

        // Sessions Tabelle
        db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                remember_me INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `, (createErr) => {
            if (createErr) {
                console.error('[UsersDB] Failed to create sessions table', createErr);
                throw createErr;
            }
            console.log('[UsersDB] Sessions table ready');
        });

        console.log('[UsersDB] SQLite ready @', DB_FILE);
    });
});

// ==================== Helper Functions ====================

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
            resolve(row ? deserializeUser(row) : null);
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
            resolve(rows.map(deserializeUser));
        });
    });
}

function deserializeUser(row) {
    if (!row) return row;
    const parsed = { ...row };
    
    // Parse JSON-Felder
    if (parsed.profile_data) {
        try {
            parsed.profile_data = JSON.parse(parsed.profile_data);
        } catch {
            parsed.profile_data = null;
        }
    }
    if (parsed.settings) {
        try {
            parsed.settings = JSON.parse(parsed.settings);
        } catch {
            parsed.settings = null;
        }
    }
    
    // Boolean conversion
    parsed.email_verified = !!parsed.email_verified;
    
    return parsed;
}

// Einfaches Passwort-Hashing (für Production sollte bcrypt verwendet werden)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

// ==================== User Operations ====================

async function createUser({ email, password, name, birthDate = null, profileData = null }) {
    const id = generateUserId();
    const passwordHash = hashPassword(password);
    const profileDataJson = profileData ? JSON.stringify(profileData) : null;

    await run(`
        INSERT INTO users (id, email, password_hash, name, birth_date, profile_data)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [id, email.toLowerCase(), passwordHash, name, birthDate, profileDataJson]);

    return getUserById(id);
}

async function getUserById(id) {
    const user = await get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (user) {
        delete user.password_hash; // Nie das Passwort-Hash zurückgeben
    }
    return user;
}

async function getUserByEmail(email) {
    return get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()]);
}

async function userExists(email) {
    const row = await get(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    return !!row;
}

async function validateCredentials(email, password) {
    const user = await getUserByEmail(email);
    if (!user) {
        return null;
    }
    
    if (!verifyPassword(password, user.password_hash)) {
        return null;
    }
    
    // Update last_login
    await run(`UPDATE users SET last_login = ? WHERE id = ?`, [new Date().toISOString(), user.id]);
    
    // Entferne password_hash vor Rückgabe
    delete user.password_hash;
    return user;
}

async function updateUser(id, updates) {
    const allowedFields = ['name', 'birth_date', 'profile_data', 'settings'];
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        const dbKey = key === 'birthDate' ? 'birth_date' : 
                      key === 'profileData' ? 'profile_data' : key;
        
        if (allowedFields.includes(dbKey)) {
            setClause.push(`${dbKey} = ?`);
            if (dbKey === 'profile_data' || dbKey === 'settings') {
                values.push(value ? JSON.stringify(value) : null);
            } else {
                values.push(value);
            }
        }
    }
    
    if (setClause.length === 0) {
        return getUserById(id);
    }
    
    values.push(id);
    await run(`UPDATE users SET ${setClause.join(', ')} WHERE id = ?`, values);
    
    return getUserById(id);
}

async function changePassword(id, oldPassword, newPassword) {
    const user = await get(`SELECT password_hash FROM users WHERE id = ?`, [id]);
    if (!user) {
        throw new Error('Benutzer nicht gefunden');
    }
    
    if (!verifyPassword(oldPassword, user.password_hash)) {
        throw new Error('Altes Passwort ist falsch');
    }
    
    const newHash = hashPassword(newPassword);
    await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, id]);
    
    return true;
}

// ==================== Session Operations ====================

async function createSession(userId, email, rememberMe = false) {
    const token = generateToken();
    const expiryDays = rememberMe ? 30 : 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    
    await run(`
        INSERT INTO sessions (token, user_id, email, expires_at, remember_me)
        VALUES (?, ?, ?, ?, ?)
    `, [token, userId, email.toLowerCase(), expiresAt.toISOString(), rememberMe ? 1 : 0]);
    
    return {
        token,
        expiresAt: expiresAt.toISOString(),
        rememberMe
    };
}

async function validateSession(token) {
    const session = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM sessions WHERE token = ?`, [token], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
    
    if (!session) {
        return null;
    }
    
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
        // Session abgelaufen, löschen
        await deleteSession(token);
        return null;
    }
    
    // Hole User-Daten
    const user = await getUserById(session.user_id);
    if (!user) {
        await deleteSession(token);
        return null;
    }
    
    return {
        user,
        session: {
            token: session.token,
            expiresAt: session.expires_at,
            rememberMe: !!session.remember_me
        }
    };
}

async function deleteSession(token) {
    await run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

async function deleteAllUserSessions(userId) {
    await run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
}

async function cleanupExpiredSessions() {
    const result = await run(`DELETE FROM sessions WHERE expires_at < ?`, [new Date().toISOString()]);
    if (result.changes > 0) {
        console.log(`[UsersDB] Cleaned ${result.changes} expired sessions`);
    }
    return result.changes;
}

// ==================== Exports ====================

module.exports = {
    // User Operations
    createUser,
    getUserById,
    getUserByEmail,
    userExists,
    validateCredentials,
    updateUser,
    changePassword,
    
    // Session Operations
    createSession,
    validateSession,
    deleteSession,
    deleteAllUserSessions,
    cleanupExpiredSessions,
    
    // Database info
    DB_FILE
};
