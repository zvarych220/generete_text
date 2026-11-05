const fs = require('fs');
const path = require('path');

async function getFromKV(url, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['GET', 'texts'])
  });
  if (!res.ok) throw new Error(`KV response status: ${res.status}`);
  const data = await res.json();
  if (data && data.result) {
    try {
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    } catch (e) {
      return null;
    }
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Спроба завантажити з Vercel KV
  if (kvUrl && kvToken) {
    try {
      const texts = await getFromKV(kvUrl, kvToken);
      if (Array.isArray(texts) && texts.length > 0) {
        return res.status(200).json({ source: 'kv', items: texts });
      }
    } catch (err) {
      console.error('[KV Read Error]:', err.message);
    }
  }

  // 2. Якщо KV ще не налаштовано або там порожньо — віддаємо початковий data.json
  try {
    const filePath = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
      return res.status(200).json({
        source: 'file',
        kvConfigured: Boolean(kvUrl && kvToken),
        items: items
      });
    }
  } catch (err) {
    console.error('[File Read Error]:', err.message);
  }

  return res.status(200).json({ source: 'empty', items: [] });
};

