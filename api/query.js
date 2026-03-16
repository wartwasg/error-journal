/*
 * api/query.js — Vercel Serverless Function
 *
 * @neondatabase/serverless: neon() returns a tagged-template function.
 * To run parameterised queries use sql.query(string, params[]) — but
 * that method is only on the Pool/Client class, not the neon() shorthand.
 *
 * Correct pattern for parameterised queries:
 *   import { Pool } from '@neondatabase/serverless';
 *   const pool = new Pool({ connectionString });
 *   await pool.query('SELECT $1', [value]);
 */

const { Pool } = require('@neondatabase/serverless');

const CONNECTION_STRING =
  'postgresql://neondb_owner:npg_eLT6d5RNUxWy@ep-jolly-wind-amrwqrqo-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Create a pool per request (Vercel functions are stateless)
  const pool = new Pool({ connectionString: CONNECTION_STRING });

  try {
    const { query, params = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query field' });
    }

    // pool.query(text, params) — standard pg-compatible API
    const result = await pool.query(query, params);

    return res.status(200).json({
      rows:     result.rows     || [],
      rowCount: result.rowCount ?? null,
      fields:   result.fields   || [],
    });

  } catch (err) {
    console.error('[api/query]', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    // Always release the pool connection
    await pool.end();
  }
};