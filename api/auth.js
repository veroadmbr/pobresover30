/* Pobres — conta do inscrito: cadastro, login, sessão, perfil, e-mail/senha e recuperação */
import crypto from 'node:crypto';
import { q, json, corpo, erro, falha, assinar, setCookie, hashSenha, confereSenha, rid, idade, emailOk, txt, salvarFoto, completo, sessao, origem } from './_lib/util.js';

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

function validaPerfil(d, parcial) {
  const o = {};
  if (!parcial || d.primeiro !== undefined) { o.primeiro = txt(d.primeiro, 30); if (!o.primeiro) throw falha('Digite seu nome.') }
  if (!parcial || d.sobrenome !== undefined) { o.sobrenome = txt(d.sobrenome, 40); if (!o.sobrenome) throw falha('Digite seu sobrenome.') }
  if (!parcial || d.nascimento !== undefined) {
    o.nascimento = txt(d.nascimento, 10);
    const a = idade(o.nascimento);
    if (a < 0 || new Date(o.nascimento) > new Date()) throw falha('Data de nascimento inválida.');
    if (a < 30) throw falha('O Pobres Over 30 só aceita pessoas a partir de 30 anos.');
  }
  if (!parcial || d.cidade !== undefined) { o.cidade = txt(d.cidade, 60); if (!o.cidade) throw falha('Escolha a cidade.') }
  if (!parcial || d.uf !== undefined) { o.uf = txt(d.uf, 2).toUpperCase(); if (!UFS.includes(o.uf)) throw falha('Escolha o estado.') }
  if (!parcial || d.area !== undefined) { o.area = txt(d.area, 80); if (!o.area) throw falha('Escolha uma área.') }
  if (d.historia !== undefined) o.historia = txt(d.historia, 600);
  if (d.frase !== undefined) o.frase = txt(d.frase, 120);
  if (d.instagram !== undefined) o.instagram = txt(d.instagram, 31);
  if (!parcial || d.whatsapp !== undefined) { o.whatsapp = txt(d.whatsapp, 20); if (o.whatsapp.replace(/\D/g, '').length < 10) throw falha('Digite o WhatsApp com DDD.') }
  return o;
}

async function enviarEmail(para, assunto, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Pobres <onboarding@resend.dev>', to: [para], subject: assunto, html })
  });
  if (!r.ok) console.error('Resend', r.status, await r.text());
  return r.ok;
  } catch (e) { console.error('Resend', e); return false }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const u = await sessao(req);
      return json(res, 200, { usuario: u ? completo(u) : null });
    }
    if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
    const d = corpo(req), acao = d.acao;

    if (acao === 'cadastrar') {
      const p = validaPerfil(d, false);
      const email = txt(d.email, 120).toLowerCase();
      if (!emailOk(email)) throw falha('Digite um e-mail válido.');
      if (String(d.senha || '').length < 8) throw falha('A senha precisa ter pelo menos 8 caracteres.');
      const ja = await q('select 1 from usuarios where email = $1', [email]);
      if (ja.length) throw falha('Este e-mail já está inscrito. Entre com sua senha.', 409);
      const id = rid('u');
      const foto = await salvarFoto(id, d.foto);
      const r = await q(`insert into usuarios (id, primeiro, sobrenome, nome, nascimento, cidade, uf, area, historia, foto, email, whatsapp, senha)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
        [id, p.primeiro, p.sobrenome, `${p.primeiro} ${p.sobrenome}`, p.nascimento, p.cidade, p.uf, p.area, p.historia || '', foto, email, p.whatsapp, hashSenha(String(d.senha))]);
      setCookie(req, res, 'pobres_s', assinar({ uid: id }));
      return json(res, 200, { usuario: completo(r[0]) });
    }

    if (acao === 'entrar') {
      const email = txt(d.email, 120).toLowerCase();
      const r = await q('select * from usuarios where email = $1', [email]);
      if (!r[0] || !confereSenha(d.senha, r[0].senha)) throw falha('E-mail ou senha incorretos.', 401);
      setCookie(req, res, 'pobres_s', assinar({ uid: r[0].id }));
      return json(res, 200, { usuario: completo(r[0]) });
    }

    if (acao === 'sair') { setCookie(req, res, 'pobres_s', ''); return json(res, 200, { ok: true }) }

    if (acao === 'esqueci') {
      const email = txt(d.email, 120).toLowerCase();
      const configurado = !!process.env.RESEND_API_KEY;
      if (configurado && emailOk(email)) {
        const r = await q('select id, primeiro from usuarios where email = $1', [email]);
        if (r[0]) {
          const token = crypto.randomBytes(24).toString('hex');
          await q(`delete from resets where uid = $1 or exp < now()`, [r[0].id]);
          await q(`insert into resets (token, uid, exp) values ($1, $2, now() + interval '1 hour')`, [token, r[0].id]);
          const link = `${origem(req)}/entrar.html#r-${token}`;
          await enviarEmail(email, 'Redefina sua senha do Pobres', `<div style="font-family:Arial,sans-serif;font-size:15px;color:#141414"><p>Oi, ${r[0].primeiro}.</p><p>Recebemos um pedido para redefinir sua senha do Pobres Over 30.</p><p><a href="${link}" style="display:inline-block;background:#141414;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p style="color:#666;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail.</p></div>`);
        }
      }
      return json(res, 200, { ok: true, configurado });
    }

    if (acao === 'redefinir') {
      const token = txt(d.token, 80);
      if (String(d.senha || '').length < 8) throw falha('A senha precisa ter pelo menos 8 caracteres.');
      const r = await q('select uid from resets where token = $1 and exp > now()', [token]);
      if (!r[0]) throw falha('Este link expirou ou já foi usado. Peça um novo.', 400);
      await q('update usuarios set senha = $1 where id = $2', [hashSenha(String(d.senha)), r[0].uid]);
      await q('delete from resets where uid = $1', [r[0].uid]);
      const u = (await q('select * from usuarios where id = $1', [r[0].uid]))[0];
      setCookie(req, res, 'pobres_s', assinar({ uid: u.id }));
      return json(res, 200, { usuario: completo(u) });
    }

    /* daqui para baixo: só logado */
    const me = await sessao(req);
    if (!me) throw falha('Sessão expirada. Entre de novo.', 401);

    if (acao === 'atualizar') {
      const p = validaPerfil(d, true);
      if (d.foto !== undefined) p.foto = await salvarFoto(me.id, d.foto);
      if (p.primeiro || p.sobrenome) p.nome = `${p.primeiro || me.primeiro} ${p.sobrenome || me.sobrenome}`;
      const campos = Object.keys(p);
      if (!campos.length) return json(res, 200, { usuario: completo(me) });
      const sets = campos.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const r = await q(`update usuarios set ${sets} where id = $1 returning *`, [me.id, ...campos.map(k => p[k])]);
      return json(res, 200, { usuario: completo(r[0]) });
    }

    if (acao === 'seguranca') {
      const novoEmail = txt(d.email, 120).toLowerCase(), novaSenha = String(d.novaSenha || '');
      const mudaEmail = novoEmail && novoEmail !== me.email;
      if (!mudaEmail && !novaSenha) return json(res, 200, { usuario: completo(me) });
      if (!d.senhaAtual) throw falha('Digite sua senha atual para alterar e-mail ou senha.');
      if (!confereSenha(d.senhaAtual, me.senha)) throw falha('Senha atual incorreta.', 401);
      if (mudaEmail) {
        if (!emailOk(novoEmail)) throw falha('Digite um e-mail válido.');
        const ja = await q('select 1 from usuarios where email = $1 and id <> $2', [novoEmail, me.id]);
        if (ja.length) throw falha('Esse e-mail já está em uso por outra conta.', 409);
        await q('update usuarios set email = $1 where id = $2', [novoEmail, me.id]);
      }
      if (novaSenha) {
        if (novaSenha.length < 8) throw falha('A nova senha precisa ter pelo menos 8 caracteres.');
        await q('update usuarios set senha = $1 where id = $2', [hashSenha(novaSenha), me.id]);
      }
      const u = (await q('select * from usuarios where id = $1', [me.id]))[0];
      return json(res, 200, { usuario: completo(u) });
    }

    throw falha('Ação desconhecida.');
  } catch (e) { erro(res, e) }
}
