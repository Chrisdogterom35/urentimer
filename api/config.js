import { createClient } from '@libsql/client/http';

async function getDb() {
  const db = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  });
  await db.execute(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  return db;
}

export default async function handler(req, res) {
  let db;
  try {
    db = await getDb();
  } catch (e) {
    return res.status(500).json({ error: 'DB connection failed' });
  }

  try {
    if (req.method === 'GET') {
      const result = await db.execute(`SELECT value FROM config WHERE key = 'cfg'`);
      if (result.rows.length === 0) return res.status(200).json(null);
      return res.status(200).json(JSON.parse(result.rows[0].value));
    }

    if (req.method === 'PUT') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Ongeldige configuratie' });
      }
      await db.execute({
        sql: `INSERT OR REPLACE INTO config (key, value) VALUES ('cfg', ?)`,
        args: [JSON.stringify(body)],
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
