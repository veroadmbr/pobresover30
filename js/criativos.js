/* Pobres — criativos para compartilhar: story (1080x1920), reel animado (1080x1920, 8s) e post (1080x1080).
   O modelo é o mesmo para todos; só mudam os dados da pessoa. */
(() => {
  const C = { ink: '#141414', mut: '#5f5f5f', line: '#e2e2e2', bg: '#ffffff', soft: '#f1f1f1', up: '#0f8a3c', dn: '#e3120b', red: '#ff0a2a' };
  const SERIF = '"Playfair Display", Georgia, serif', SANS = '"Work Sans", Arial, sans-serif';
  const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src });
  let seal = null;

  async function prep(p) {
    await Promise.all([`700 80px ${SERIF}`, `600 80px ${SERIF}`, `400 80px ${SERIF}`, `italic 400 80px ${SERIF}`, `600 30px ${SANS}`, `500 30px ${SANS}`, `400 30px ${SANS}`].map(f => document.fonts.load(f).catch(() => {})));
    if (!seal) seal = await img('img/pobres-over30.svg').catch(() => null);
    const foto = p.foto ? await img(p.foto).catch(() => null) : null;
    const cot = Conta.cotacao(p.id);
    return { seal, foto, cot, idade: Conta.idade(p.nascimento), local: `${p.cidade}, ${p.uf}`, quote: frase(p) };
  }
  /* trecho da história: as duas primeiras frases, ou a frase de efeito */
  function frase(p) {
    const h = (p.historia || p.bio || '').trim();
    if (!h) return p.frase || 'Rico de espírito, pobre de saldo.';
    const s = h.match(/[^.!?]+[.!?]+/g) || [h];
    return s.slice(0, 3).join(' ').trim();
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), out = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w } else line = t }
    if (line) out.push(line);
    return out;
  }
  function text(ctx, str, x, y, maxW, lh, maxLines, align = 'left') {
    let ls = wrap(ctx, str, maxW);
    if (ls.length > maxLines) { ls = ls.slice(0, maxLines); let l = ls[maxLines - 1]; while (ctx.measureText(l + '…').width > maxW && l.includes(' ')) l = l.replace(/\s+\S*$/, ''); ls[maxLines - 1] = l.replace(/[,;:.]$/, '') + (String(str).startsWith('“') ? '…”' : '…') }
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ls.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return ls.length * lh;
  }
  function photo(ctx, a, x, y, s) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
    if (a.foto) ctx.drawImage(a.foto, x, y, s, s);
    else {
      const g = ctx.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, '#e2e2e2'); g.addColorStop(1, '#c4c4c4');
      ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#9d9d9d'; ctx.lineWidth = s * .022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x + s / 2, y + s * .4, s * .13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s / 2, y + s * .9, s * .27, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }
    ctx.restore();
  }
  function arrow(ctx, dir, x, y, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * .13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const P = dir === 'up' ? [[0, .78], [.36, .42], [.56, .62], [1, .18]] : [[0, .22], [.36, .58], [.56, .38], [1, .82]];
    ctx.beginPath(); P.forEach(([u, v], i) => ctx[i ? 'lineTo' : 'moveTo'](x + u * s, y + v * s)); ctx.stroke();
    const tip = P[3], hd = s * .3;
    ctx.beginPath();
    if (dir === 'up') { ctx.moveTo(x + tip[0] * s - hd, y + tip[1] * s); ctx.lineTo(x + tip[0] * s, y + tip[1] * s); ctx.lineTo(x + tip[0] * s, y + tip[1] * s + hd) }
    else { ctx.moveTo(x + tip[0] * s - hd, y + tip[1] * s); ctx.lineTo(x + tip[0] * s, y + tip[1] * s); ctx.lineTo(x + tip[0] * s, y + tip[1] * s - hd) }
    ctx.stroke(); ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }
  /* selo da cotação: pílula branca com seta e porcentagem */
  function cotPill(ctx, a, right, top, size, pctTxt) {
    const txt = (a.cot.dir === 'up' ? '+' : '−') + (pctTxt ?? a.cot.pct) + '%';
    ctx.font = `700 ${size}px ${SANS}`;
    const w = ctx.measureText(txt).width + size * 2.5, h = size * 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = size * .5; ctx.shadowOffsetY = size * .12;
    ctx.fillStyle = '#fff'; rrect(ctx, right - w, top, w, h, h / 2); ctx.fill(); ctx.restore();
    const col = a.cot.dir === 'up' ? C.up : C.dn;
    arrow(ctx, a.cot.dir, right - w + size * .7, top + size * .55, size * .9, col);
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, right - w + size * 1.85, top + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function pill(ctx, str, cx, y, size, align = 'center') {
    ctx.font = `600 ${size}px ${SANS}`;
    const w = ctx.measureText(str).width + size * 1.6, h = size * 2;
    const x = align === 'center' ? cx - w / 2 : cx;
    ctx.fillStyle = C.soft; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    return h;
  }
  function bar(ctx, W, h, size) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Pobres', W / 2, h / 2 + 2); ctx.textBaseline = 'alphabetic';
  }

  /* ---------- POST 1080x1080 ---------- */
  function post(cv, p, a) {
    cv.width = cv.height = 1080; const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 1080, 1080);
    bar(ctx, 1080, 110, 64);
    photo(ctx, a, 60, 170, 440);
    cotPill(ctx, a, 484, 186, 26);
    let y = 205; const x = 550, w = 470;
    ctx.fillStyle = C.ink; ctx.font = `600 20px ${SANS}`; ctx.textAlign = 'left';
    const tag = p.rank ? `POBRES OVER 30 · Nº ${p.rank}` : 'POBRES OVER 30 · 2026';
    ctx.fillText(tag, x, y); const tw = ctx.measureText(tag).width;
    ctx.fillStyle = C.dn; ctx.fillRect(x, y + 12, tw, 3);
    y += 90; ctx.fillStyle = C.ink; ctx.font = `600 64px ${SERIF}`;
    y += text(ctx, p.nome, x, y, w, 70, 3) - 70 + 52;
    ctx.fillStyle = C.mut; ctx.font = `400 28px ${SANS}`; ctx.fillText(`${a.idade} anos · ${a.local}`, x, y);
    y += 30; pill(ctx, p.area, x, y, 22, 'left');
    ctx.fillStyle = C.line; ctx.fillRect(60, 660, 960, 2);
    ctx.fillStyle = C.ink; ctx.font = `italic 400 38px ${SERIF}`;
    text(ctx, `“${a.quote}”`, 60, 730, 960, 52, 4);
    ctx.fillStyle = C.line; ctx.fillRect(60, 960, 960, 2);
    ctx.fillStyle = C.mut; ctx.font = `500 24px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText('Leia a história completa no Pobres', 60, 1022);
    if (a.seal) { const sw = 118, sh = sw * a.seal.height / a.seal.width; ctx.drawImage(a.seal, 1020 - sw, 1040 - sh, sw, sh) }
  }

  /* ---------- STORY / REEL 1080x1920 ---------- */
  const E = (t, s, d) => Math.min(1, Math.max(0, (t - s) / d));
  const ease = x => 1 - Math.pow(1 - x, 3);
  function story(cv, p, a, t = 99) {
    cv.width = 1080; cv.height = 1920; const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 1080, 1920);
    const fade = (s, d, fn, dy = 40) => { const k = ease(E(t, s, d)); if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * dy); fn(k); ctx.restore() };
    bar(ctx, 1080, 170, 96);
    fade(1.6, .7, k => { if (a.seal) { const sw = 330, sh = sw * a.seal.height / a.seal.width, sc = .85 + .15 * k; ctx.translate(540, 230 + sh / 2); ctx.scale(sc, sc); ctx.drawImage(a.seal, -sw / 2, -sh / 2, sw, sh) } }, 0);
    fade(2.2, .8, () => photo(ctx, a, 180, 540, 720), 80);
    const pctNum = parseFloat(a.cot.pct.replace(',', '.'));
    fade(3.8, .5, () => { const k = E(t, 3.8, 1.2); cotPill(ctx, a, 870, 566, 34, (pctNum * ease(k)).toFixed(1).replace('.', ',')) }, 0);
    let y = 1370;
    ctx.font = `600 78px ${SERIF}`; const nl = wrap(ctx, p.nome, 900).length;
    fade(3.0, .7, () => { ctx.fillStyle = C.ink; ctx.font = `600 78px ${SERIF}`; text(ctx, p.nome, 540, y, 900, 86, 2, 'center') });
    y += Math.min(nl, 2) * 86 - 20;
    fade(3.3, .6, () => { ctx.fillStyle = C.mut; ctx.font = `400 34px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(`${a.idade} anos · ${a.local}`, 540, y) });
    y += 34;
    fade(3.6, .6, () => pill(ctx, p.area, 540, y, 28));
    y += 110;
    ctx.font = `italic 400 40px ${SERIF}`; const qAll = wrap(ctx, `“${a.quote}”`, 880), ql = qAll.slice(0, 3);
    ql.forEach((l, i) => fade(4.4 + i * .35, .6, () => { ctx.fillStyle = C.ink; ctx.font = `italic 400 40px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(i === 2 && qAll.length > 3 ? l.replace(/\s+\S*$/, '').replace(/[,;:.]$/, '') + '…”' : l, 540, y + i * 56) }, 20));
    fade(6.2, .7, k => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 1760, 1080, 160);
      ctx.fillStyle = '#fff'; ctx.font = `600 34px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Me encontre na lista Pobres Over 30', 540, 1842); ctx.textBaseline = 'alphabetic';
    }, 160);
    /* abertura do reel: tela preta com o logo */
    const ov = 1 - ease(E(t, 1.0, .7));
    if (ov > 0) {
      ctx.save(); ctx.globalAlpha = ov; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920);
      const k = ease(E(t, .1, .7)); ctx.globalAlpha = ov * k; ctx.fillStyle = '#fff'; ctx.font = `700 ${150 + 30 * k}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Pobres', 540, 940); ctx.font = `600 34px ${SANS}`; ctx.globalAlpha = ov * ease(E(t, .5, .5)); ctx.fillText('Over 30 · 2026', 540, 1060);
      ctx.restore();
    }
  }
  const REEL = 8.5;

  async function gravarReel(p, a, onProgress) {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
    const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const type = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!type || !cv.captureStream) throw new Error('Este navegador não grava vídeo. Tente no Chrome.');
    story(cv, p, a, 0);
    const st = cv.captureStream(30), rec = new MediaRecorder(st, { mimeType: type, videoBitsPerSecond: 8e6 }), parts = [];
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    rec.start(250);
    const t0 = performance.now();
    await new Promise(res => {
      const f = () => { const t = (performance.now() - t0) / 1000; story(cv, p, a, t); onProgress?.(Math.min(1, t / REEL)); if (t < REEL) requestAnimationFrame(f); else res() };
      requestAnimationFrame(f);
    });
    rec.stop(); await done; st.getTracks().forEach(t => t.stop());
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(parts, { type: type.split(';')[0] }), ext };
  }

  window.Criativos = { prep, post, story, gravarReel, REEL };
})();
