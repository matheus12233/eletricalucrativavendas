// Recebe os eventos do quiz e da página de vendas e soma no Redis.
const { configured, pipeline, dayKey, cleanSrc } = require('./_redis');

const VALID = /^(view|a_[1-7]|ans_[1-7]_[0-3]|sales_view|sales_direto|buy_click|buy_direto)$/;
const TTL = 60 * 60 * 24 * 400;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const e = body && body.e;
    if (typeof e !== 'string' || !VALID.test(e)) return res.status(400).end();
    if (!configured()) return res.status(204).end(); // sem banco ainda: ignora em silêncio

    const day = dayKey();
    const src = cleanSrc(body.s);
    const kAll = `q:${day}:all`;
    const cmds = [
      ['HINCRBY', kAll, e, 1],
      ['EXPIRE', kAll, TTL],
    ];
    if (src !== 'all') {
      const kSrc = `q:${day}:s:${src}`;
      cmds.push(['HINCRBY', kSrc, e, 1], ['EXPIRE', kSrc, TTL], ['SADD', 'q:sources', src]);
    }
    await pipeline(cmds);
    return res.status(204).end();
  } catch (err) {
    return res.status(204).end(); // nunca atrapalha o visitante
  }
};
