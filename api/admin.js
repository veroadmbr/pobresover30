/* Pobres — painel admin: login, dados do painel, remover inscrito, perfis de exemplo, zerar métricas */
import crypto from 'node:crypto';
import { q, json, corpo, erro, falha, assinar, setCookie, ehAdmin, completo, exemplos, txt } from './_lib/util.js';

const igual = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y) };

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const d = corpo(req);
      if (d.acao === 'entrar') {
        const E = process.env.ADMIN_EMAIL, S = process.env.ADMIN_PASSWORD;
        if (!E || !S) throw falha('Configure ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis da Vercel.', 500);
        const ok = igual(txt(d.email, 120).toLowerCase(), E.toLowerCase()) & igual(d.senha || '', S);
        if (!ok) throw falha('E-mail ou senha incorretos.', 401);
        setCookie(req, res, 'pobres_adm', assinar({ adm: 1 }, 1), 1);
        return json(res, 200, { ok: true });
      }
      if (d.acao === 'sair') { setCookie(req, res, 'pobres_adm', ''); return json(res, 200, { ok: true }) }
      if (!ehAdmin(req)) throw falha('Acesso restrito.', 401);
      if (d.acao === 'remover') { await q('delete from usuarios where id = $1', [txt(d.id, 60)]); return json(res, 200, { ok: true }) }
      if (d.acao === 'exemplos') {
        await q(`insert into config (chave, valor) values ('exemplos', $1) on conflict (chave) do update set valor = excluded.valor`, [JSON.stringify(!!d.valor)]);
        return json(res, 200, { exemplos: !!d.valor });
      }
      if (d.acao === 'zerar') { await q('delete from metricas'); return json(res, 200, { ok: true }) }
      throw falha('Ação desconhecida.');
    }
    if (req.method !== 'GET') return json(res, 405, { erro: 'Método não permitido.' });
    if (!ehAdmin(req)) return json(res, 401, { erro: 'Acesso restrito.' });
    const [us, ms, ex] = await Promise.all([
      q('select * from usuarios order by criado desc'),
      q(`select t, tipo, nome, pagina, vid, sid, origem, disp, dados from metricas where t > now() - interval '400 days' order by t asc limit 200000`),
      exemplos()
    ]);
    json(res, 200, {
      usuarios: us.map(completo),
      metricas: ms.map(m => ({ t: new Date(m.t).getTime(), tipo: m.tipo, nome: m.nome, pagina: m.pagina, vid: m.vid, sid: m.sid, origem: m.origem, disp: m.disp, ...(typeof m.dados === 'string' ? JSON.parse(m.dados) : m.dados || {}) })),
      exemplos: ex
    });
  } catch (e) { erro(res, e) }
}
