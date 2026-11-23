/* Pobres — métricas de visitas e eventos.
   Na Vercel, cada registro vai para /api/track (banco Neon). Sem servidor, fica neste navegador (demonstração). */
(() => {
  const K = 'pobres-metricas', VID = 'pobres-visitante', SID = 'pobres-sessao-nav', MAX = 8000;
  const get = () => { try { return JSON.parse(localStorage.getItem(K) || '[]') } catch (e) { return [] } };
  const salvar = arr => { try { localStorage.setItem(K, JSON.stringify(arr.slice(-MAX))) } catch (e) {} };
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function vid() { try { let v = localStorage.getItem(VID); if (!v) { v = rid(); localStorage.setItem(VID, v) } return v } catch (e) { return 'anon' } }
  function sid() { try { let v = sessionStorage.getItem(SID); if (!v) { v = rid(); sessionStorage.setItem(SID, v) } return v } catch (e) { return 'anon' } }
  const pagina = () => (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  function origem() {
    const q = new URLSearchParams(location.search), utm = q.get('utm_source');
    if (utm) return utm.toLowerCase().slice(0, 60);
    let r = ''; try { r = document.referrer ? new URL(document.referrer).hostname : '' } catch (e) {}
    if (!r || r === location.hostname) return 'direto';
    if (/instagram/.test(r)) return 'instagram';
    if (/facebook|fb\./.test(r)) return 'facebook';
    if (/whatsapp|wa\.me/.test(r)) return 'whatsapp';
    if (/google\./.test(r)) return 'google';
    if (/t\.co|twitter|x\.com/.test(r)) return 'x';
    if (/tiktok/.test(r)) return 'tiktok';
    if (/linkedin/.test(r)) return 'linkedin';
    return r.replace(/^www\./, '');
  }
  const disp = () => /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ? 'celular' : 'computador';
  const ORIG = origem();
  const ignorado = () => { try { return localStorage.getItem('pobres-ignorar') === '1' } catch (e) { return false } };
  async function registrar(tipo, nome, dados) {
    if (ignorado()) return;
    const reg = { tipo, nome, pagina: pagina(), vid: vid(), sid: sid(), origem: ORIG, disp: disp() };
    if (window.Conta) await Conta.pronto;
    if (window.Conta && Conta.modo === 'api') {
      try { await fetch('api/track', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...reg, dados: dados || {} }) }) } catch (e) {}
      return;
    }
    const arr = get(); arr.push({ t: Date.now(), ...reg, ...(dados || {}) }); salvar(arr);
  }
  window.Metricas = {
    track: (nome, dados) => { registrar('evento', nome, dados) },
    locais: get,
    limparLocal: () => salvar([]),
    vid,
    ignorarVid(v) { salvar(get().filter(x => x.vid !== v)) },
    ignorado,
    ignorar(b) { try { b ? localStorage.setItem('pobres-ignorar', '1') : localStorage.removeItem('pobres-ignorar') } catch (e) {} if (b) salvar(get().filter(x => x.vid !== vid())) }
  };
  if (!/admin/.test(pagina())) registrar('visita', 'pagina', {});
})();
