/* Pobres — lista pública de inscritos (sem e-mail e WhatsApp) e a configuração dos perfis de exemplo */
import { q, json, erro, publico, exemplos } from './_lib/util.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { erro: 'Método não permitido.' });
    const r = await q('select id, primeiro, sobrenome, nome, nascimento, cidade, uf, area, historia, frase, instagram, foto, criado from usuarios order by criado desc limit 5000');
    res.setHeader('Cache-Control', 'no-store');
    json(res, 200, { pessoas: r.map(publico), exemplos: await exemplos() });
  } catch (e) { erro(res, e) }
}
