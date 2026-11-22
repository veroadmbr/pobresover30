/* Pobres — métricas de visitas e eventos (demo em localStorage).
   Cada página registra uma visita ao abrir; ações importantes viram eventos.
   Para medir todos os visitantes de verdade, troque salvar()/todos() por chamadas ao seu backend. */
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
    if (utm) return utm.toLowerCase();
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
  const disp = () => /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ? 'celular' : /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : 'computador';
  function registrar(tipo, nome, dados) {
    const arr = get();
    arr.push({ t: Date.now(), tipo, nome, pagina: pagina(), vid: vid(), sid: sid(), origem: origem(), disp: disp(), ...(dados || {}) });
    salvar(arr);
  }
  window.Metricas = {
    track: (nome, dados) => registrar('evento', nome, dados),
    todos: get,
    limpar: () => salvar([])
  };
  if (!/admin/.test(pagina())) registrar('visita', 'pagina', {});
})();
