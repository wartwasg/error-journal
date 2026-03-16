/*
 * /api/query.js  —  Vercel Serverless Function
 * ─────────────────────────────────────────────
 * This runs on Vercel's servers, NOT in the browser.
 * Server-side code has no CORS restrictions, so it can freely
 * send any headers to Neon (Content-Type, Authorization, etc.).
 *
 * The browser calls THIS endpoint (/api/query) instead of Neon
 * directly. This file proxies the query to Neon and returns
 * the result. That's the entire solution to the CORS problem.
 *
 * Flow:
 *   Browser  →  POST /api/query  →  Neon /sql  →  back to browser
 */

const CONN =
  'postgresql://neondb_owner:npg_eLT6d5RNUxWy@ep-jolly-wind-amrwqrqo-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function getNeonEndpoint(conn) {
  const url = new URL(conn.replace(/^postgres(?:ql)?:\/\//, 'https://'));
  return `https://${url.hostname}/sql`;
}

function getBasicAuth(conn) {
  const url = new URL(conn.replace(/^postgres(?:ql)?:\/\//, 'https://'));
  return 'Basic ' + Buffer.from(
    `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
  ).toString('base64');
}

const NEON_ENDPOINT = getNeonEndpoint(CONN);
const NEON_AUTH     = getBasicAuth(CONN);

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, params = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query' });
    }

    // Forward to Neon — no CORS issues here because this is server-side
    const neonRes = await fetch(NEON_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'Authorization':          NEON_AUTH,
        'Neon-Connection-String': CONN,
      },
      body: JSON.stringify({ query, params }),
    });

    const data = await neonRes.json();

    if (!neonRes.ok) {
      return res.status(neonRes.status).json({
        error: data.message || data.error || `Neon error ${neonRes.status}`,
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('[/api/query]', err);
    return res.status(500).json({ error: err.message });
  }
}
