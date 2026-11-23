/* Pobres — painel admin: login, dados do painel, remover inscrito, perfis de exemplo, zerar métricas */
import crypto from 'node:crypto';
import { q, json, corpo, erro, falha, assinar, setCookie, ehAdmin, completo, exemplos, txt, apagarFoto } from './_lib/util.js';

const igual = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y) };

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const d = corpo(req);
      if (d.acao === 'entrar') {
        const S = process.env.ADMIN_PASSWORD;
        if (!S) throw falha('Configure ADMIN_PASSWORD nas variáveis da Vercel.', 500);
        /* trava: no máximo 8 tentativas erradas por IP a cada 15 minutos */
        const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 60);
        await q(`create table if not exists admin_tentativas (ip text, t timestamptz default now())`);
        const n = (await q(`select count(*)::int as n from admin_tentativas where ip = $1 and t > now() - interval '15 minutes'`, [ip]))[0].n;
        if (n >= 8) throw falha('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
        if (!igual(String(d.senha || ''), S)) { await q('insert into admin_tentativas (ip) values ($1)', [ip]); throw falha('Senha incorreta.', 401) }
        await q('delete from admin_tentativas where ip = $1 or t < now() - interval \'1 day\'', [ip]);
        setCookie(req, res, 'pobres_adm', assinar({ adm: 1 }, 1), 1);
        setCookie(req, res, 'pobres_nc', assinar({ nc: 1 }, 730), 730); /* este navegador não conta como visita */
        return json(res, 200, { ok: true });
      }
      if (d.acao === 'sair') { setCookie(req, res, 'pobres_adm', ''); return json(res, 200, { ok: true }) }
      if (!ehAdmin(req)) throw falha('Acesso restrito.', 401);
      if (d.acao === 'remover') {
        const r = await q('delete from usuarios where id = $1 returning foto', [txt(d.id, 60)]);
        await q('delete from resets where uid = $1', [txt(d.id, 60)]);
        if (r[0]) await apagarFoto(r[0].foto);
        return json(res, 200, { ok: true });
      }
      if (d.acao === 'bloquear') { await q('update usuarios set bloqueado = $1 where id = $2', [!!d.valor, txt(d.id, 60)]); return json(res, 200, { ok: true, bloqueado: !!d.valor }) }
      if (d.acao === 'exemplos') {
        await q(`insert into config (chave, valor) values ('exemplos', $1) on conflict (chave) do update set valor = excluded.valor`, [JSON.stringify(!!d.valor)]);
        return json(res, 200, { exemplos: !!d.valor });
      }
      if (d.acao === 'ignorar') {
        const vid = txt(d.vid, 40); if (!vid) throw falha('Navegador inválido.');
        const r = await q(`select valor from config where chave = 'ignorados'`);
        let lista = r[0] && Array.isArray(r[0].valor) ? r[0].valor : [];
        lista = d.valor ? [...new Set([...lista, vid])].slice(-50) : lista.filter(x => x !== vid);
        await q(`insert into config (chave, valor) values ('ignorados', $1) on conflict (chave) do update set valor = excluded.valor`, [JSON.stringify(lista)]);
        if (d.valor) await q('delete from metricas where vid = $1', [vid]);
        setCookie(req, res, 'pobres_nc', d.valor ? assinar({ nc: 1 }, 730) : '', 730);
        return json(res, 200, { ignorados: lista.length });
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
