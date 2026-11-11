// Entrega os números para o painel (protegido por senha).
const crypto = require('crypto');
const { configured, pipeline, dayKey, cleanSrc } = require('./_redis');

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pass = process.env.PAINEL_SENHA;
  if (!pass) return res.status(500).json({ ok: false, erro: 'Falta criar a variável PAINEL_SENHA na Vercel.' });

  const key = req.headers['x-painel-senha'] || (req.query && req.query.key) || '';
  if (!same(key, pass)) return res.status(401).json({ ok: false, erro: 'Senha incorreta.' });
  if (!configured()) return res.status(500).json({ ok: false, erro: 'Banco de dados não conectado (Upstash Redis).' });

  try {
    const q = req.query || {};
    const days = Math.min(Math.max(parseInt(q.days, 10) || 7, 1), 90);
    const src = q.src && q.src !== 'all' ? cleanSrc(q.src) : 'all';

    const list = [];
    for (let k = 0; k < days; k++) list.push(dayKey(new Date(Date.now() - k * 86400000)));

    const cmds = list.map((d) => ['HGETALL', src === 'all' ? `q:${d}:all` : `q:${d}:s:${src}`]);
    cmds.push(['SMEMBERS', 'q:sources']);
    const out = await pipeline(cmds);

    const rows = list.map((d, i) => {
      const flat = out[i].result || [];
      const c = {};
      for (let j = 0; j < flat.length; j += 2) c[flat[j]] = parseInt(flat[j + 1], 10) || 0;
      return { day: d, c };
    });
    const sources = (out[out.length - 1].result || []).sort();
    return res.status(200).json({ ok: true, days: rows, sources });
  } catch (err) {
    return res.status(500).json({ ok: false, erro: 'Falha ao ler os dados.' });
  }
};
