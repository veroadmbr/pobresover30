/* Pobres — utilidades do servidor: banco, sessão, senha, fotos e respostas */
import crypto from 'node:crypto';

/* ---------- banco (Neon pela integração da Vercel) ---------- */
let _q = null, _schema = null;
async function conectar() {
  if (_q) return _q;
  if (globalThis.__POBRES_Q) _q = globalThis.__POBRES_Q; /* usado só nos testes locais */
  else {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw Object.assign(new Error('Banco não configurado: adicione o Neon ao projeto na Vercel.'), { status: 500 });
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    _q = (t, p = []) => sql.query(t, p);
  }
  return _q;
}
const SCHEMA = [
  `create table if not exists usuarios (
    id text primary key, primeiro text not null, sobrenome text not null, nome text not null,
    nascimento text not null, cidade text not null, uf text not null, area text not null,
    historia text default '', frase text default '', instagram text default '', foto text default '',
    email text unique not null, whatsapp text default '', senha text not null,
    criado timestamptz not null default now())`,
  `create table if not exists metricas (
    id bigserial primary key, t timestamptz not null default now(), tipo text, nome text, pagina text,
    vid text, sid text, origem text, disp text, dados jsonb default '{}'::jsonb)`,
  `create index if not exists metricas_t on metricas (t)`,
  `create table if not exists config (chave text primary key, valor jsonb)`,
  `create table if not exists resets (token text primary key, uid text not null, exp timestamptz not null)`
];
export async function q(text, params = []) {
  const run = await conectar();
  if (!_schema) _schema = (async () => { for (const s of SCHEMA) await run(s) })();
  await _schema;
  return run(text, params);
}

/* ---------- respostas e corpo ---------- */
export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export function corpo(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b) } catch (e) { return {} } }
  return b;
}
export function erro(res, e) {
  const status = e.status || 500;
  if (status >= 500) console.error(e);
  json(res, status, { erro: status >= 500 && !e.status ? 'Erro no servidor. Tente de novo.' : e.message });
}
export const falha = (msg, status = 400) => Object.assign(new Error(msg), { status });

/* ---------- cookies e tokens assinados ---------- */
function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw falha('Configure SESSION_SECRET (16+ caracteres) nas variáveis da Vercel.', 500);
  return s;
}
const b64 = s => Buffer.from(s).toString('base64url');
export function assinar(dados, dias = 30) {
  const corpo = b64(JSON.stringify({ ...dados, exp: Date.now() + dias * 864e5 }));
  const sig = crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url');
  return corpo + '.' + sig;
}
export function verificar(token) {
  if (!token || !token.includes('.')) return null;
  const [c, sig] = token.split('.');
  const ok = crypto.createHmac('sha256', segredo()).update(c).digest('base64url');
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
  try { const d = JSON.parse(Buffer.from(c, 'base64url').toString()); return d.exp > Date.now() ? d : null } catch (e) { return null }
}
export function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()) });
  return out;
}
const https = req => (req.headers['x-forwarded-proto'] || '').includes('https');
export function setCookie(req, res, nome, valor, dias = 30) {
  const v = `${nome}=${encodeURIComponent(valor)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${valor ? Math.round(dias * 86400) : 0}${https(req) ? '; Secure' : ''}`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, v) : v);
}
export function origem(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${https(req) ? 'https' : 'http'}://${host}`;
}

/* ---------- senhas ---------- */
export function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `scrypt$${salt}$${h}`;
}
export function confereSenha(senha, guardado) {
  const [alg, salt, h] = String(guardado || '').split('$');
  if (alg !== 'scrypt' || !salt || !h) return false;
  const t = crypto.scryptSync(String(senha), salt, 64);
  const g = Buffer.from(h, 'hex');
  return g.length === t.length && crypto.timingSafeEqual(g, t);
}
export const rid = (p = '') => p + Date.now().toString(36) + crypto.randomBytes(5).toString('hex');

/* ---------- validações ---------- */
export function idade(iso, hoje = new Date()) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return -1;
  let a = hoje.getFullYear() - y;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) a--;
  return a;
}
export const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || '');
export const txt = (v, max) => String(v ?? '').trim().slice(0, max);

/* ---------- fotos (Vercel Blob; sem Blob, guarda a imagem no banco) ---------- */
export async function salvarFoto(uid, foto) {
  if (!foto) return '';
  if (/^https:\/\//.test(foto)) return foto.slice(0, 500);
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(foto);
  if (!m) throw falha('Formato de foto inválido.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 1.5e6) throw falha('Foto grande demais. Tente outra imagem.');
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (foto.length > 300000) throw falha('Foto grande demais. Tente outra imagem.');
    return foto;
  }
  const { put } = await import('@vercel/blob');
  const r = await put(`fotos/${uid}-${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`, buf, { access: 'public', contentType: `image/${m[1]}`, addRandomSuffix: true });
  return r.url;
}

/* ---------- formato público e completo de um inscrito ---------- */
export function publico(u) {
  return { id: u.id, primeiro: u.primeiro, sobrenome: u.sobrenome, nome: u.nome, nascimento: u.nascimento, cidade: u.cidade, uf: u.uf, area: u.area, historia: u.historia || '', frase: u.frase || '', instagram: u.instagram || '', foto: u.foto || '', criado: new Date(u.criado).getTime() };
}
export function completo(u) { return { ...publico(u), email: u.email, whatsapp: u.whatsapp || '' } }

export async function sessao(req) {
  const d = verificar(cookies(req).pobres_s);
  if (!d || !d.uid) return null;
  const r = await q('select * from usuarios where id = $1', [d.uid]);
  return r[0] || null;
}
export function ehAdmin(req) { const d = verificar(cookies(req).pobres_adm); return !!(d && d.adm) }
export async function exemplos() {
  const r = await q(`select valor from config where chave = 'exemplos'`);
  return r[0] ? !!r[0].valor : process.env.EXEMPLOS_PADRAO === 'true';
}
