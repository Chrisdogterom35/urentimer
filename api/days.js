import { createClient } from '@libsql/client/http';

async function getDb() {
  const db = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  });
  await db.execute(`
    CREATE TABLE IF NOT EXISTS days (
      date TEXT PRIMARY KEY,
      start_time TEXT,
      end_time TEXT,
      hours REAL NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL
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
      const result = await db.execute('SELECT * FROM days ORDER BY date DESC');
      const days = result.rows.map(r => ({
        date: r.date,
        startTime: r.start_time || null,
        endTime: r.end_time || null,
        hours: Number(r.hours),
        label: r.label,
        type: r.type,
      }));
      return res.status(200).json(days);
    }

    if (req.method === 'POST') {
      const { date, startTime, endTime, hours, label, type } = req.body || {};
      if (!date || hours == null || !label || !type) {
        return res.status(400).json({ error: 'Missende velden' });
      }
      await db.execute({
        sql: `INSERT OR REPLACE INTO days (date, start_time, end_time, hours, label, type)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [date, startTime || null, endTime || null, hours, label, type],
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const date = req.query?.date;
      if (!date) return res.status(400).json({ error: 'Datum ontbreekt' });
      await db.execute({ sql: 'DELETE FROM days WHERE date = ?', args: [date] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
