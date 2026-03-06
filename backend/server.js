require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { OpenAI } = require('openai');

const app  = express();
const port = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ─────────────────────────────────────────────
// In production the frontend is served from the same origin, so no CORS needed.
// In development allow the Vite dev server on :3000.
if (!isProd) {
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
}

app.use(express.json({ limit: '2mb' }));

// ── Serve Vite build (production only) ───────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

function getOpenAI(req) {
  const key = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No OpenAI API key. Add it in Settings or set OPENAI_API_KEY in .env');
  return new OpenAI({ apiKey: key });
}

async function chat(client, system, user) {
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 4000,
    messages: [{ role:'system', content:system }, { role:'user', content:user }],
  });
  return res.choices[0].message.content;
}

function safeJson(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g,'').trim()); }
  catch { return {}; }
}

// ── Health ──────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status:'ok' }));

// ── Snowflake: return .env config (no password) ─────
app.get('/api/snowflake/config', (_req, res) => {
  const cfg = {
    account:   process.env.SNOWFLAKE_ACCOUNT   || '',
    user:      process.env.SNOWFLAKE_USER      || '',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database:  process.env.SNOWFLAKE_DATABASE  || '',
    schema:    process.env.SNOWFLAKE_SCHEMA    || 'PUBLIC',
    role:      process.env.SNOWFLAKE_ROLE      || 'SYSADMIN',
    // password is deliberately omitted — frontend knows to use **** if set
    hasPassword: !!process.env.SNOWFLAKE_PASSWORD,
  };
  res.json(cfg);
});

// ── Snowflake: test real connection ─────────────────
app.post('/api/snowflake/test', async (req, res) => {
  // Use UI-submitted values if provided, else fall back to .env
  const account   = req.body.account   || process.env.SNOWFLAKE_ACCOUNT;
  const username  = req.body.user      || process.env.SNOWFLAKE_USER;
  const password  = req.body.password  || process.env.SNOWFLAKE_PASSWORD;
  const warehouse = req.body.warehouse || process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH';
  const database  = req.body.database  || process.env.SNOWFLAKE_DATABASE;
  const schema    = req.body.schema    || process.env.SNOWFLAKE_SCHEMA    || 'PUBLIC';
  const role      = req.body.role      || process.env.SNOWFLAKE_ROLE      || 'SYSADMIN';

  if (!account || !username || !password) {
    return res.status(400).json({ ok: false, error: 'Missing account, user, or password. Set in .env or fill the form.' });
  }

  let snowflake;
  try { snowflake = require('snowflake-sdk'); }
  catch {
    return res.status(500).json({ ok: false, error: 'snowflake-sdk not installed. Run: npm install snowflake-sdk' });
  }

  const conn = snowflake.createConnection({ account, username, password, warehouse, database, schema, role });

  try {
    await new Promise((resolve, reject) => {
      conn.connect((err, c) => {
        if (err) reject(err);
        else resolve(c);
      });
    });

    // Quick test query
    await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: 'SELECT CURRENT_VERSION() AS v, CURRENT_USER() AS u, CURRENT_DATABASE() AS db',
        complete: (err, _stmt, rows) => {
          if (err) reject(err); else resolve(rows);
        },
      });
    }).then(rows => {
      res.json({ ok: true, version: rows[0]?.V, user: rows[0]?.U, database: rows[0]?.DB });
    });

    conn.destroy(() => {});
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Step 1: Intent Extraction ───────────────────────
app.post('/api/extract-intent', async (req, res) => {
  const { brd } = req.body;
  if (!brd) return res.status(400).json({ error:'BRD text required' });
  const SYS = `You are a senior data architect. Extract structured intent from a BRD.
Detect if this is ENHANCEMENT (modifying existing tables) or NEW (all new tables).
Respond ONLY with valid JSON:
{
  "brd_type": "NEW|ENHANCEMENT",
  "objectives": ["string"],
  "entities": [{"name":"string","attributes":["string"],"rules":["string"],"is_existing":boolean,"action":"CREATE|ALTER"}],
  "reporting_needs": ["string"],
  "procedures_needed": ["string"],
  "tasks_needed": ["string"],
  "streams_needed": ["string"],
  "complexity": "Low|Medium|High",
  "estimated_tables": number
}`;
  try {
    const client = getOpenAI(req);
    res.json(safeJson(await chat(client, SYS, `Extract intent from:\n\n${brd}`)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Step 2: Semantic Mapping ────────────────────────
app.post('/api/semantic-mapping', async (req, res) => {
  const { entities, existingSchema, brdType } = req.body;
  const count = (entities||[]).length;
  const names = (entities||[]).map(e=>e.name).join(', ');
  const SYS = `You are a Snowflake architect. Map BRD entities to schema objects.
BRD type: ${brdType||'NEW'}
- ENHANCEMENT: existing tables → reused_tables (ALTER), new tables → new_tables (CREATE)
- NEW: all tables → new_tables
- ALWAYS produce at least ${Math.max(1,count-1)} relationships.
Respond ONLY with valid JSON:
{
  "reused_tables":  [{"table_name":"string","schema":"string","reason":"string","alterations":["ADD COLUMN x TYPE DEFAULT y"]}],
  "new_tables":     [{"table_name":"string","purpose":"string","columns":["string"],"schema":"string"}],
  "relationships":  [{"from_table":"string","to_table":"string","type":"string","key":"string"}],
  "duplication_avoided": number
}
Entities: ${names}`;
  try {
    const client = getOpenAI(req);
    const result = safeJson(await chat(client, SYS,
      `Entities: ${JSON.stringify(entities)}\nSchema: ${JSON.stringify(existingSchema||{})}`));
    if (!result.relationships?.length && entities?.length > 1) {
      result.relationships = entities.slice(1).map(e => ({
        from_table: e.name.toUpperCase().replace(/ /g,'_'),
        to_table:   entities[0].name.toUpperCase().replace(/ /g,'_'),
        type: 'many-to-one', key: `${entities[0].name.toLowerCase().replace(/ /g,'_')}_id`,
      }));
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Step 3: DDL Generation ──────────────────────────
app.post('/api/generate-ddl', async (req, res) => {
  const { brd, newTables, reusedTables, relationships, brdType, proceduresNeeded, tasksNeeded, streamsNeeded } = req.body;
  const isEnh = (brdType==='ENHANCEMENT') || /enhancement|alter|add column|existing/i.test(brd||'');
  const SYS = `You are a Snowflake SQL expert. Generate complete production-ready Snowflake DDL.
${isEnh
  ? `ENHANCEMENT mode:\n- Existing tables: ALTER TABLE ... ADD COLUMN only (never CREATE TABLE for them)\n- New tables only: CREATE TABLE IF NOT EXISTS\n- Always add DEFAULT values on new columns`
  : `NEW BUILD mode:\n- CREATE DATABASE IF NOT EXISTS, CREATE SCHEMA IF NOT EXISTS, CREATE TABLE IF NOT EXISTS`}
ALWAYS generate:
- VIEWS: CREATE OR REPLACE VIEW for each reporting need
- If procedures_needed list: CREATE OR REPLACE PROCEDURE (LANGUAGE SQL)
- If tasks_needed list: CREATE OR REPLACE TASK with CRON schedule
- If streams_needed list: CREATE OR REPLACE STREAM
- PRIMARY KEY, FOREIGN KEY, NOT NULL, COMMENT ON TABLE/COLUMN
- CLUSTER BY on large fact tables
Group output: -- SECTION headers for: DATABASE/SCHEMA, TABLES, ALTER STATEMENTS, VIEWS, PROCEDURES, TASKS, STREAMS
Respond with ONLY executable SQL.`;
  try {
    const client = getOpenAI(req);
    const ddl = await chat(client, SYS,
      `BRD: ${(brd||'').slice(0,1500)}\nType: ${isEnh?'ENHANCEMENT':'NEW'}\n` +
      `New: ${JSON.stringify(newTables)}\nAlter: ${JSON.stringify(reusedTables)}\n` +
      `Rels: ${JSON.stringify(relationships)}\nProcs: ${JSON.stringify(proceduresNeeded||[])}\n` +
      `Tasks: ${JSON.stringify(tasksNeeded||[])}\nStreams: ${JSON.stringify(streamsNeeded||[])}`);
    res.json({ ddl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SPA fallback (production) — must come AFTER all /api routes ──
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`\n🧭 SchemaPilot AI  →  http://0.0.0.0:${port}`);
  console.log(`   Mode:      ${isProd ? '🚀 production' : '🛠  development'}`);
  console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY    ? '✅ configured' : '⚠  not set (use Settings UI)'}`);
  console.log(`   Snowflake: ${process.env.SNOWFLAKE_ACCOUNT ? '✅ ' + process.env.SNOWFLAKE_ACCOUNT : '⚠  not configured'}\n`);
});
