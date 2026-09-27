/**
 * FIELDPROOF — Backend Server (v2 — sqlite + sqlite3 async)
 * Express + sqlite/sqlite3 + bcryptjs + JWT
 *
 * Run: tsx server/index.ts   (or: concurrently "tsx server/index.ts" "vite")
 * Binds to 127.0.0.1:3001  (Vite proxy: /api → :3001)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.SESSION_SECRET || 'FIELDPROOF_DEV_SECRET_CHANGE_IN_PRODUCTION';
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'fieldproof.db');
const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = '8h';

if (!process.env.SESSION_SECRET) {
  console.warn('[WARN] SESSION_SECRET not set — using insecure default. Set it in .env');
}

// ─── Simple ID generator (no external dep needed) ────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─── DB singleton ─────────────────────────────────────────────────────────────
let db: Database;

async function initDB(): Promise<void> {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.run('PRAGMA journal_mode = WAL');
  await db.run('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      username         TEXT UNIQUE NOT NULL,
      email            TEXT UNIQUE NOT NULL,
      password_hash    TEXT NOT NULL,
      full_name        TEXT NOT NULL,
      operator_id      TEXT NOT NULL,
      role             TEXT NOT NULL DEFAULT 'FIELD_OPERATOR',
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      last_login_at    TEXT,
      is_active        INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tests (
      id                      TEXT PRIMARY KEY,
      test_id                 TEXT UNIQUE NOT NULL,
      protocol_id             TEXT NOT NULL DEFAULT 'PROTOCOL-001',
      operator_id             TEXT NOT NULL,
      user_id                 TEXT NOT NULL,
      created_at              TEXT NOT NULL,
      completed_at            TEXT,
      result                  TEXT,
      confidence_score        REAL,
      evidence_quality_score  REAL,
      calibration_status      TEXT,
      test_image_data         TEXT,
      reference_image_data    TEXT,
      test_image_hash         TEXT,
      reference_image_hash    TEXT,
      test_image_quality      REAL,
      reference_image_quality REAL,
      environment_consistency REAL,
      latitude                REAL,
      longitude               REAL,
      location_accuracy       REAL,
      location_timestamp      TEXT,
      location_simulated      INTEGER DEFAULT 0,
      evidence_hash           TEXT,
      evidence_status         TEXT DEFAULT 'PENDING',
      verification_status     TEXT DEFAULT 'UNVERIFIED',
      analysis_version        TEXT DEFAULT '1.0.0',
      software_version        TEXT DEFAULT '2.0.0',
      evidence_package        TEXT,
      tampered                INTEGER DEFAULT 0,
      updated_at              TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id          TEXT PRIMARY KEY,
      test_id     TEXT,
      user_id     TEXT,
      operator_id TEXT,
      category    TEXT NOT NULL,
      action      TEXT NOT NULL,
      detail      TEXT,
      timestamp   TEXT NOT NULL
    );
  `);

  await seedDemoUser();
  console.log(`[DB] Initialised at ${DB_PATH}`);
}

async function seedDemoUser() {
  const existing = await db.get('SELECT id FROM users WHERE username = ?', ['fieldoperator']);
  if (existing) return;

  const hash = await bcrypt.hash('FieldProof@2026!', BCRYPT_ROUNDS);
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO users (id,username,email,password_hash,full_name,operator_id,role,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [uid(), 'fieldoperator', 'demo@fieldproof.gov', hash,
     'Field Operator Demo', 'OP-104', 'FIELD_OPERATOR', now, now]
  );
  console.log('[SEED] Demo account created: fieldoperator / FieldProof@2026!');
}

async function generateTestId(): Promise<string> {
  const year = new Date().getFullYear();
  const row = await db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM tests WHERE test_id LIKE 'FP-${year}-%'`
  );
  const seq = String((row?.c ?? 0) + 1).padStart(5, '0');
  return `FP-${year}-${seq}`;
}

// ─── Express setup ────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ─── Auth middleware ──────────────────────────────────────────────────────────
interface JWTPayload {
  id: string;
  username: string;
  operator_id: string;
  role: string;
  full_name: string;
}
interface AuthRequest extends Request {
  user?: JWTPayload;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please sign in again.' });
  }
}

// ─── Routes: Auth ─────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, full_name, operator_id } = req.body ?? {};

    if (!username?.trim() || !email?.trim() || !password || !full_name?.trim()) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email address.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9!@#$%^&*]/.test(password)) {
      res.status(400).json({
        error: 'Password must contain at least one uppercase letter and one number or symbol.',
      });
      return;
    }

    const conflict = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.trim().toLowerCase(), email.trim().toLowerCase()]
    );
    if (conflict) {
      res.status(409).json({ error: 'Username or email is already registered.' });
      return;
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    const opId = (operator_id?.trim() || `OP-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();

    await db.run(
      `INSERT INTO users (id,username,email,password_hash,full_name,operator_id,role,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid(), username.trim().toLowerCase(), email.trim().toLowerCase(),
       password_hash, full_name.trim(), opId, 'FIELD_OPERATOR', now, now]
    );

    res.status(201).json({ message: 'Account created successfully. Please sign in.' });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const user = await db.get<any>(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [String(username).trim().toLowerCase()]
    );

    // Always run bcrypt to prevent timing attacks on unknown users
    const hashToCheck = user?.password_hash ?? '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const valid = await bcrypt.compare(String(password), hashToCheck);

    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
      [now, now, user.id]
    );

    // Audit login
    await db.run(
      `INSERT INTO audit_events (id,user_id,operator_id,category,action,detail,timestamp)
       VALUES (?,?,?,?,?,?,?)`,
      [uid(), user.id, user.operator_id, 'SYSTEM', 'USER_LOGIN',
       `User ${user.username} authenticated`, now]
    );

    const tokenPayload: JWTPayload = {
      id: user.id,
      username: user.username,
      operator_id: user.operator_id,
      role: user.role,
      full_name: user.full_name,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_TTL });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        operator_id: user.operator_id,
        role: user.role,
        last_login_at: now,
      },
    });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await db.get<any>(
      'SELECT id,username,email,full_name,operator_id,role,created_at,last_login_at FROM users WHERE id = ?',
      [req.user!.id]
    );
    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
    res.json({ user });
  } catch (e) {
    console.error('[/me]', e);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── Routes: Tests ────────────────────────────────────────────────────────────

// GET /api/tests
app.get('/api/tests', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tests = await db.all<any[]>(
      `SELECT id, test_id, protocol_id, operator_id, user_id, created_at, completed_at,
              result, confidence_score, evidence_quality_score, calibration_status,
              test_image_hash, reference_image_hash, test_image_quality, reference_image_quality,
              environment_consistency, latitude, longitude, location_accuracy, location_timestamp,
              location_simulated, evidence_hash, evidence_status, verification_status,
              analysis_version, software_version, tampered, updated_at, evidence_package
       FROM tests WHERE operator_id = ? ORDER BY created_at DESC`,
      [req.user!.operator_id]
    );
    const parsed = tests.map(t => ({
      ...t,
      evidence_package: t.evidence_package ? JSON.parse(t.evidence_package) : null,
      location_simulated: !!t.location_simulated,
      tampered: !!t.tampered,
    }));
    res.json({ tests: parsed });
  } catch (e) {
    console.error('[GET /tests]', e);
    res.status(500).json({ error: 'Failed to load tests.' });
  }
});

// POST /api/tests
app.post('/api/tests', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const d = req.body ?? {};
    const id = uid();
    const test_id = await generateTestId();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO tests (
        id, test_id, protocol_id, operator_id, user_id,
        created_at, completed_at, result, confidence_score, evidence_quality_score,
        calibration_status, test_image_data, reference_image_data,
        test_image_hash, reference_image_hash, test_image_quality, reference_image_quality,
        environment_consistency, latitude, longitude, location_accuracy, location_timestamp,
        location_simulated, evidence_hash, evidence_status, verification_status,
        analysis_version, software_version, evidence_package, tampered, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      [
        id, test_id,
        d.protocol_id || 'PROTOCOL-001',
        req.user!.operator_id,
        req.user!.id,
        now,
        d.completed_at || now,
        d.result ?? null,
        d.confidence_score ?? null,
        d.evidence_quality_score ?? null,
        d.calibration_status || 'PASSED',
        d.test_image_data ?? null,
        d.reference_image_data ?? null,
        d.test_image_hash ?? null,
        d.reference_image_hash ?? null,
        d.test_image_quality ?? null,
        d.reference_image_quality ?? null,
        d.environment_consistency ?? null,
        d.latitude ?? null,
        d.longitude ?? null,
        d.location_accuracy ?? null,
        d.location_timestamp ?? null,
        d.location_simulated ? 1 : 0,
        d.evidence_hash ?? null,
        d.evidence_status || 'SEALED',
        d.verification_status || 'UNVERIFIED',
        d.analysis_version || '1.0.0',
        d.software_version || '2.0.0',
        d.evidence_package ? JSON.stringify(d.evidence_package) : null,
        now,
      ]
    );

    // Insert audit events from client
    const auditEvents: any[] = Array.isArray(d.audit_events) ? d.audit_events : [];
    for (const evt of auditEvents) {
      await db.run(
        `INSERT INTO audit_events (id,test_id,user_id,operator_id,category,action,detail,timestamp)
         VALUES (?,?,?,?,?,?,?,?)`,
        [uid(), id, req.user!.id, req.user!.operator_id,
         evt.category ?? 'SYSTEM', evt.action ?? 'UNKNOWN',
         evt.detail ?? '', evt.timestamp ?? now]
      );
    }

    // Server-side audit event
    await db.run(
      `INSERT INTO audit_events (id,test_id,user_id,operator_id,category,action,detail,timestamp)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uid(), id, req.user!.id, req.user!.operator_id,
       'OPERATOR', 'TEST_CREATED',
       `Test ${test_id} created — result: ${d.result ?? 'PENDING'}`, now]
    );

    const saved = await db.get<any>('SELECT * FROM tests WHERE id = ?', [id]);
    res.status(201).json({
      test: {
        ...saved,
        evidence_package: saved?.evidence_package ? JSON.parse(saved.evidence_package) : null,
        location_simulated: !!saved?.location_simulated,
        tampered: !!saved?.tampered,
        test_id,
      },
    });
  } catch (e) {
    console.error('[POST /tests]', e);
    res.status(500).json({ error: 'Failed to save test record.' });
  }
});

// GET /api/tests/:id  (accepts FP-YYYY-##### or internal id)
app.get('/api/tests/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await db.get<any>(
      'SELECT * FROM tests WHERE test_id = ? OR id = ?',
      [req.params.id, req.params.id]
    );
    if (!test) { res.status(404).json({ error: 'Test not found.' }); return; }

    const auditEvents = await db.all<any[]>(
      'SELECT * FROM audit_events WHERE test_id = ? ORDER BY timestamp ASC',
      [test.id]
    );

    res.json({
      test: {
        ...test,
        evidence_package: test.evidence_package ? JSON.parse(test.evidence_package) : null,
        location_simulated: !!test.location_simulated,
        tampered: !!test.tampered,
      },
      audit_events: auditEvents,
    });
  } catch (e) {
    console.error('[GET /tests/:id]', e);
    res.status(500).json({ error: 'Failed to load test.' });
  }
});

// PATCH /api/tests/:id  (tamper demo / verification update)
app.patch('/api/tests/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const test = await db.get<any>(
      'SELECT * FROM tests WHERE test_id = ? OR id = ?',
      [req.params.id, req.params.id]
    );
    if (!test) { res.status(404).json({ error: 'Test not found.' }); return; }

    const updates: string[] = [];
    const params: any[] = [];

    if (typeof req.body.tampered === 'boolean') {
      updates.push('tampered = ?');
      params.push(req.body.tampered ? 1 : 0);
    }
    if (req.body.verification_status) {
      updates.push('verification_status = ?');
      params.push(req.body.verification_status);
    }

    if (updates.length > 0) {
      const now = new Date().toISOString();
      params.push(now, test.id);
      await db.run(
        `UPDATE tests SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );

      await db.run(
        `INSERT INTO audit_events (id,test_id,user_id,operator_id,category,action,detail,timestamp)
         VALUES (?,?,?,?,?,?,?,?)`,
        [uid(), test.id, req.user!.id, req.user!.operator_id,
         'INTEGRITY',
         req.body.tampered ? 'TAMPER_DEMO_APPLIED' : 'VERIFICATION_UPDATED',
         req.body.tampered
           ? 'Demo tamper flag set for integrity demonstration'
           : `Status updated: ${req.body.verification_status}`,
         now]
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[PATCH /tests/:id]', e);
    res.status(500).json({ error: 'Failed to update test.' });
  }
});

// GET /api/audit
app.get('/api/audit', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await db.all<any[]>(
      `SELECT ae.*, t.test_id AS test_ref_id
       FROM audit_events ae
       LEFT JOIN tests t ON ae.test_id = t.id
       WHERE ae.operator_id = ?
       ORDER BY ae.timestamp DESC
       LIMIT 500`,
      [req.user!.operator_id]
    );
    res.json({ events });
  } catch (e) {
    console.error('[GET /audit]', e);
    res.status(500).json({ error: 'Failed to load audit log.' });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', db: DB_PATH });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`\n🛡  FIELDPROOF API  →  http://127.0.0.1:${PORT}`);
      console.log(`   DB:  ${DB_PATH}`);
      console.log(`   JWT: ${TOKEN_TTL} TTL\n`);
    });
  })
  .catch(e => {
    console.error('[FATAL] Failed to initialise:', e);
    process.exit(1);
  });
