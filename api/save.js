async function saveToKV(url, token, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['SET', 'texts', JSON.stringify(data)])
  });
  if (!res.ok) throw new Error(`KV response status: ${res.status}`);
  return await res.json();
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!Array.isArray(body)) {
    return res.status(400).json({ error: 'Body must be an array of text objects' });
  }

  // Якщо підключено Vercel KV — записуємо в хмарну базу
  if (kvUrl && kvToken) {
    try {
      await saveToKV(kvUrl, kvToken, body);
      return res.status(200).json({
        status: 'ok',
        storage: 'kv',
        count: body.length,
        message: 'Дані успішно збережено у Vercel KV'
      });
    } catch (err) {
      console.error('[KV Save Error]:', err.message);
      return res.status(500).json({ error: 'Помилка збереження у Vercel KV: ' + err.message });
    }
  }

  // Якщо KV ще не підключено в Vercel Dashboard
  return res.status(200).json({
    status: 'warning',
    storage: 'none',
    kvConfigured: false,
    count: body.length,
    message: 'Vercel KV ще не підключено у вашому проєкті Vercel.'
  });
};

