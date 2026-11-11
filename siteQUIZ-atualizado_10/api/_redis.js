// Pequeno cliente para o Upstash Redis (REST). Sem dependências.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

exports.configured = () => Boolean(URL_ && TOKEN);

exports.pipeline = async (commands) => {
  const r = await fetch(URL_.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return r.json();
};

// Dia no fuso de São Paulo (AAAA-MM-DD)
exports.dayKey = (date) =>
  (date || new Date()).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

exports.cleanSrc = (s) =>
  String(s || 'direto').toLowerCase().replace(/[^a-z0-9_.\- ]/g, '_').trim().slice(0, 50) || 'direto';
