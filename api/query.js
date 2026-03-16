const CONN =
  'postgresql://neondb_owner:npg_eLT6d5RNUxWy@ep-jolly-wind-amrwqrqo-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function getNeonEndpoint(conn) {
  const url = new URL(conn.replace(/^postgres(?:ql)?:\/\//, 'https://'));
  return `https://${url.hostname}/sql`;
}

function getBasicAuth(conn) {
  const url = new URL(conn.replace(/^postgres(?:ql)?:\/\//, 'https://'));
  return (
    'Basic ' +
    Buffer.from(
      `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
    ).toString('base64')
  );
}

const NEON_ENDPOINT = getNeonEndpoint(CONN);
const NEON_AUTH = getBasicAuth(CONN);

module.exports = async function handler(req, res) {
  // Vercel sometimes sends OPTIONS preflight — handle it
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { query, params = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query' });
    }

    const neonRes = await fetch(NEON_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: NEON_AUTH,
        'Neon-Connection-String': CONN,
      },
      body: JSON.stringify({ query, params }),
    });

    const data = await neonRes.json();

    if (!neonRes.ok) {
      return res
        .status(neonRes.status)
        .json({ error: data.message || data.error || `Neon ${neonRes.status}` });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[api/query]', err);
    return res.status(500).json({ error: err.message });
  }
};