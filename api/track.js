/* Pobres — registro de visitas e eventos para o painel */
import { q, json, corpo, erro, txt } from './_lib/util.js';

const NOMES = ['pagina', 'inscricao_passo', 'inscricao_concluida', 'inscricao_recusada_idade', 'login', 'compartilhar_aberto', 'download', 'link_copiado', 'perfil_visto', 'compartilhou_peca', 'compartilhou_link'];

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
    const d = corpo(req);
    const tipo = d.tipo === 'evento' ? 'evento' : 'visita', nome = txt(d.nome, 40);
    if (!NOMES.includes(nome)) return json(res, 400, { erro: 'Evento inválido.' });
    const vid = txt(d.vid, 40);
    const ig = await q(`select valor from config where chave = 'ignorados'`);
    if (ig[0] && Array.isArray(ig[0].valor) && ig[0].valor.includes(vid)) return json(res, 200, { ok: true, ignorado: true });
    const dados = {};
    for (const k of ['passo', 'peca', 'idade', 'uf', 'area', 'pessoa']) if (d.dados && d.dados[k] !== undefined) dados[k] = typeof d.dados[k] === 'number' ? d.dados[k] : txt(d.dados[k], 80);
    await q('insert into metricas (tipo, nome, pagina, vid, sid, origem, disp, dados) values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [tipo, nome, txt(d.pagina, 30), vid, txt(d.sid, 40), txt(d.origem, 60), txt(d.disp, 20), JSON.stringify(dados)]);
    json(res, 200, { ok: true });
  } catch (e) { erro(res, e) }
}
