/* Pobres — 3 versões da foto em preto e branco, estilo editorial de revista (Replicate) */
import { q, json, corpo, erro, falha } from './_lib/util.js';

const MANTER = " Keep the person's face, identity, age, expression, hairstyle and pose exactly the same. Photorealistic, no text, no logos.";
const ESTILOS = [
  'Turn this photo into a black and white editorial magazine portrait: dramatic studio lighting with deep shadows, high contrast, crisp detail, plain dark charcoal background.' + MANTER,
  'Turn this photo into a black and white editorial magazine portrait: soft window light, smooth gradation of grays, subtle film grain, plain light gray seamless background.' + MANTER,
  'Turn this photo into a black and white business magazine cover portrait: classic Rembrandt lighting, rich blacks, fine 35mm film grain, timeless and elegant, plain mid-gray background.' + MANTER
];
const espera = ms => new Promise(r => setTimeout(r, ms));

async function gerar(prompt, foto, token, modelo, ate) {
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let r = await fetch(`https://api.replicate.com/v1/models/${modelo}/predictions`, {
    method: 'POST', headers: { ...H, Prefer: 'wait=50' },
    body: JSON.stringify({ input: { prompt, input_image: foto, aspect_ratio: 'match_input_image', output_format: 'jpg', safety_tolerance: 2 } })
  });
  let d = await r.json();
  if (!r.ok) throw new Error(d.detail || d.title || `Replicate ${r.status}`);
  while (['starting', 'processing'].includes(d.status) && Date.now() < ate) {
    await espera(1500);
    d = await (await fetch(d.urls.get, { headers: H })).json();
  }
  if (d.status !== 'succeeded') throw new Error(d.error || 'A imagem não ficou pronta a tempo.');
  const url = Array.isArray(d.output) ? d.output[0] : d.output;
  const img = await fetch(url);
  if (!img.ok) throw new Error('Não deu pra baixar a imagem gerada.');
  const buf = Buffer.from(await img.arrayBuffer());
  return `data:${img.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return json(res, 501, { erro: 'Geração de fotos ainda não configurada.', semIA: true });
    const foto = String(corpo(req).foto || '');
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(foto) || foto.length > 2e6) throw falha('Foto inválida ou grande demais.');
    /* limite: 5 gerações por IP a cada hora */
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 60);
    await q('create table if not exists ia_uso (ip text, t timestamptz default now())');
    const n = (await q(`select count(*)::int as n from ia_uso where ip = $1 and t > now() - interval '1 hour'`, [ip]))[0].n;
    if (n >= 5) throw falha('Você já gerou várias versões agora. Tente de novo daqui a pouco ou use a foto original.', 429);
    await q('insert into ia_uso (ip) values ($1)', [ip]);
    const modelo = process.env.REPLICATE_MODEL || 'black-forest-labs/flux-kontext-pro';
    const ate = Date.now() + 55000;
    const r = await Promise.allSettled(ESTILOS.map(p => gerar(p, foto, token, modelo, ate)));
    const fotos = r.filter(x => x.status === 'fulfilled').map(x => x.value);
    r.filter(x => x.status === 'rejected').forEach(x => console.error('foto-ia', x.reason));
    if (!fotos.length) throw falha('Não deu pra criar as versões agora. Use a foto original ou tente de novo.', 502);
    json(res, 200, { fotos });
  } catch (e) { erro(res, e) }
}
