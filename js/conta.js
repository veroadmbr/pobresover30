/* Pobres — contas (demo em localStorage), pessoas, histórias, cabeçalho e dropdown próprio.
   Troque as funções de Conta por chamadas ao seu backend (ex.: Supabase) quando for pro ar. */
(() => {
  const K = 'pobres-contas', S = 'pobres-sessao';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } },
    del(k) { try { localStorage.removeItem(k) } catch (e) {} }
  };
  async function hash(s) {
    const t = 'pobres:' + s;
    try {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) | 0; return 'f' + h }
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 };
  const rngOf = seed => { let a = typeof seed === 'number' ? seed : strHash(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } };
  const pickR = (r, a) => a[Math.floor(r() * a.length)];

  function idade(iso, hoje = new Date()) {
    const [y, m, d] = iso.split('-').map(Number);
    let a = hoje.getFullYear() - y;
    if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) a--;
    return a;
  }
  function faltaPara30(iso, hoje = new Date()) {
    const [y, m, d] = iso.split('-').map(Number);
    const alvo = new Date(y + 30, m - 1, d);
    const dias = Math.ceil((alvo - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 864e5);
    return { anos: Math.floor(dias / 365.25), dias: Math.round(dias % 365.25), total: dias };
  }
  /* cotação do dia: muda a cada dia, igual para todo mundo */
  function cotacao(id) {
    const d = new Date(), r = rngOf(id + ':' + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate());
    return { dir: r() < .5 ? 'up' : 'dn', pct: (r() * 9 + .1).toFixed(1).replace('.', ',') };
  }

  /* ---------- áreas ---------- */
  const ESPECIAIS = ['Desempregado(a)', 'Sustentado(a) pelos pais', 'Sustentado(a) pelos avós', 'Sustentado(a) pelo velho da lancha', 'Sustentado(a) pela tia rica', 'Herdeiro(a) em espera', 'Vivo de pix dos amigos', 'CEO de mim mesmo(a)', 'Coach de coach', 'Influenciador(a) com 312 seguidores', 'Investidor(a) de cripto no vermelho', 'Day trader nas horas vagas', 'Vendedor(a) de curso de ficar rico', 'Dono(a) de 7 CNPJs inativos', 'Concurseiro(a) há 10 anos', 'Esperando a Mega da Virada', 'Revendedor(a) de pote de bolo', 'Trabalho na firma do primo', 'Sócio(a) do bar que nunca abriu', 'Freelancer sem freela', 'Startup em fase de ideia desde 2014'];
  const GERAIS = ['Administração', 'Advocacia e Direito', 'Agronegócio', 'Arquitetura e Urbanismo', 'Artes e Cultura', 'Atendimento ao cliente', 'Comércio e Varejo', 'Comunicação e Marketing', 'Construção civil', 'Consultoria', 'Contabilidade', 'Design', 'Educação', 'Energia', 'Engenharia', 'Esportes', 'Eventos', 'Finanças e Bancos', 'Fotografia e Vídeo', 'Gastronomia', 'Imobiliário', 'Indústria', 'Jornalismo', 'Logística e Transporte', 'Moda e Beleza', 'Música', 'Publicidade', 'Recursos Humanos', 'Saúde', 'Segurança', 'Serviço público', 'Tecnologia', 'Turismo e Hotelaria', 'Vendas', 'Outro'];

  /* ---------- histórias ---------- */
  const H = {
    abre: [
      c => `Nasci em ${c.cidade} com um sonho e um boleto.`,
      c => `Aos ${c.cedo} anos saí de casa decidido a mudar de vida. A vida não mudou, mas eu mudei de bairro.`,
      c => `Comecei vendendo ${c.item} na porta da escola, em ${c.cidade}.`,
      c => `Cresci em ${c.cidade} ouvindo que dinheiro não traz felicidade e resolvi testar a teoria na prática.`,
      c => `Minha trajetória começou cedo: aos 8 anos eu já devia dinheiro pro meu irmão.`,
      c => `Sempre fui visionário. Em ${c.anoIdeia} eu já tinha uma ideia de aplicativo que ninguém pediu.`,
      c => `Desde pequeno em ${c.cidade}, eu sabia que ia ser grande. Cresci 1,72 m e parei por aí.`,
      c => `Meu primeiro emprego foi aos ${c.cedo}, e meu primeiro empréstimo foi aos ${c.cedo}, no mesmo dia.`
    ],
    area: {
      'Desempregado(a)': ['Estou em transição de carreira há tempo suficiente para chamar de carreira.', 'Hoje me dedico em tempo integral a mandar currículo e esperar retorno.'],
      'Sustentado(a) pelos pais': ['Desde então conto com o apoio de dois investidores-anjo: meu pai e minha mãe.', 'Meu escritório fica no quarto onde cresci, com vista para a geladeira dos meus pais.'],
      'Sustentado(a) pelos avós': ['Meu fundo de investimento se chama vó, e rende melhor que a poupança.', 'Minha avó acredita em mim e na aposentadoria dela, nessa ordem.'],
      'Sustentado(a) pelo velho da lancha': ['Hoje minha principal fonte de renda tem 68 anos, uma lancha em Angra e pouca paciência.', 'Conheci meu sócio majoritário num píer. Ele entrou com a lancha, eu com o carisma.'],
      'Sustentado(a) pela tia rica': ['Minha tia rica acredita no meu potencial, principalmente no Natal.', 'Tenho uma tia que mora em Miami e um plano de carreira que depende dela.'],
      'Herdeiro(a) em espera': ['Estou em fase de pré-herança, com a paciência de quem sabe que o futuro é promissor.', 'Meu planejamento financeiro tem um nome, um testamento e muita fé.'],
      'Vivo de pix dos amigos': ['Meu modelo de negócio é recorrente: todo mês eu peço e algum amigo manda.', 'Tenho uma rede de contatos sólida, quase todos com a chave pix salva no meu celular.'],
      'CEO de mim mesmo(a)': ['Fundei minha própria empresa, em que sou CEO, estagiário e o cliente que não paga.'],
      'Coach de coach': ['Hoje ensino coaches a ensinarem pessoas a virarem coaches.'],
      'Influenciador(a) com 312 seguidores': ['Construí uma comunidade fiel de 312 seguidores, dos quais 40 são minha família.'],
      'Investidor(a) de cripto no vermelho': ['Coloquei tudo numa moeda com nome de cachorro. Ela está bem, eu nem tanto.'],
      'Day trader nas horas vagas': ['Opero na bolsa das 10h às 10h05, quando o stop me tira.'],
      'Vendedor(a) de curso de ficar rico': ['Hoje vendo um curso que ensina a ficar rico. Ainda estou no módulo 1.'],
      'Dono(a) de 7 CNPJs inativos': ['Abri sete empresas. Todas seguem firmes na Receita: inativas, mas firmes.'],
      'Concurseiro(a) há 10 anos': ['Passei em todas as fases da vida, menos na segunda fase do concurso.'],
      'Esperando a Mega da Virada': ['Meu plano de aposentadoria tem seis números e sai todo dia 31.'],
      'Revendedor(a) de pote de bolo': ['Montei uma operação de pote de bolo que fatura bem, quando eu não como o estoque.'],
      'Trabalho na firma do primo': ['Hoje ocupo um cargo estratégico na empresa do meu primo, criado especialmente pra mim.'],
      'Sócio(a) do bar que nunca abriu': ['Sou sócio de um bar incrível que abre no mês que vem desde 2019.'],
      'Freelancer sem freela': ['Sou freelancer: tenho total liberdade de horário e nenhum cliente pra atrapalhar.'],
      'Startup em fase de ideia desde 2014': ['Minha startup está em fase de ideação desde 2014. Falta só o dinheiro, o time e o produto.']
    },
    geral: [
      c => `Fiz carreira em ${c.areaB} e aprendi que o mercado é cruel com quem não tem um primo influente.`,
      c => `Entrei no ramo de ${c.areaB} achando que ia enriquecer. Enriqueci de experiência.`,
      c => `Em ${c.areaB} construí uma reputação sólida: todo mundo sabe que eu devo.`,
      c => `Trabalho com ${c.areaB} há ${c.anosArea} anos e já tenho a idade de quem deveria estar rico.`,
      c => `Minha área é ${c.areaB}, mas meu talento mesmo é parcelar em doze vezes.`
    ],
    vira: [
      c => `Em ${c.anoVirada} veio a grande virada: descobri o cartão de crédito.`,
      () => 'Meu maior investimento foi um curso de como ficar rico, que deixou alguém muito rico.',
      () => 'Fiz MBA no YouTube e mestrado em parcelar sem juros.',
      () => 'Quase cheguei no primeiro milhão em 2021, mas print não vale como comprovante.',
      () => 'Aprendi com os erros, por isso cometo sempre os mesmos.',
      () => 'Já tive participação numa hamburgueria artesanal, numa barbearia e numa ideia.',
      () => 'Investi pesado em mim mesmo: academia anual, que usei duas vezes.',
      c => `Em ${c.anoVirada} recusei uma proposta milionária. Era golpe, mas a postura ficou.`
    ],
    hoje: [
      c => `Hoje, aos ${c.idade}, sigo firme no cheque especial e na esperança.`,
      () => 'Tenho orgulho de dizer que meu nome está numa lista importante: a do Serasa. E agora, a do Pobres.',
      c => `Hoje vivo em ${c.cidade}, divido o streaming com cinco pessoas e o aluguel com o banco.`,
      () => 'Meu patrimônio inclui um carro financiado, um celular parcelado e muita autoestima.',
      c => `Aos ${c.idade} anos finalmente entendi juros compostos. Eles estão me compondo.`,
      () => 'Sigo acreditando que o próximo mês vai ser diferente. Ele nunca é.',
      c => `Aos ${c.idade}, meu maior ativo é a cara de pau.`
    ]
  };
  const FRASES = ['Não sou pobre, sou investidor de longo prazo.', 'O dinheiro não traz felicidade, mas eu queria tirar a dúvida.', 'Meu limite é o céu. O do cartão é bem menor.', 'Rico de espírito, pobre de saldo.', 'Quem tem boleto tem pressa.', 'Eu não gasto, eu invisto em experiências.', 'Saí do zero e cheguei no negativo.', 'Minha meta é ficar rico antes dos 30. Já estou atrasado.', 'Patrimônio é estado de espírito.', 'Não devo nada a ninguém. Devo a todo mundo.', 'Sonho grande, pago no crédito.', 'Rendimento mesmo só o do pão de queijo.'];
  const ITENS = ['bala de goma', 'figurinha repetida', 'geladinho', 'brigadeiro', 'pulseira de miçanga', 'pipa'];
  function historia(p, r = Math.random) {
    const id = p.nascimento ? idade(p.nascimento) : (p.idade || 35);
    const c = {
      cidade: p.cidade || 'minha cidade', idade: id, cedo: 14 + Math.floor(r() * 6), item: pickR(r, ITENS),
      anoIdeia: 2009 + Math.floor(r() * 8), anoVirada: 2010 + Math.floor(r() * 14),
      areaB: (p.area || 'vendas').replace(/ e .*/, '').toLowerCase(), anosArea: 3 + Math.floor(r() * (id - 22))
    };
    const esp = H.area[p.area];
    const meio = esp ? pickR(r, esp) : pickR(r, H.geral)(c);
    return [pickR(r, H.abre)(c), meio, pickR(r, H.vira)(c), pickR(r, H.hoje)(c)].join(' ');
  }
  function historias(p, n = 2) {
    const out = new Set(); let g = 0;
    while (out.size < n && g++ < 30) out.add(historia(p));
    return [...out];
  }

  /* ---------- perfis de exemplo (ligados/desligados no admin) ---------- */
  const EXEMPLOS_PADRAO = false; /* true = visitantes veem os exemplos por padrão */
  const SEED_NOMES = ['Ricardo Almeida', 'Fernanda Costa', 'Paulo Henrique', 'Juliana Ribeiro', 'Roberto Carvalho', 'Patrícia Melo', 'Sérgio Monteiro', 'Cláudia Azevedo', 'Eduardo Fonseca', 'Mônica Teixeira', 'Fábio Cardoso', 'Renata Araújo', 'Alexandre Pires', 'Luciana Moreira', 'Gustavo Correia', 'Adriana Campos', 'Leonardo Brito', 'Simone Rocha', 'Rodrigo Tavares', 'Daniela Cunha', 'Marcelo Viana', 'Cristina Lacerda', 'Fernando Peixoto', 'Beatriz Sampaio', 'Maurício Neves', 'Tatiana Moraes', 'Vinícius Santana', 'Aline Figueiredo', 'César Quintana', 'Débora Antunes',
    'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes', 'Gabriela Reis', 'Henrique Alves', 'Isabela Torres', 'João Batista', 'Larissa Gomes', 'Marcos Vieira', 'Natália Freitas', 'Otávio Ramos', 'Paula Castro', 'Rafael Moura', 'Sofia Barros', 'Thiago Dias', 'Vanessa Lopes', 'Wagner Pinto', 'Yasmin Duarte', 'Lucas Martins', 'Camila Rezende', 'André Farias'];
  const SEED_CID = [['Santos', 'SP'], ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'], ['Porto Alegre', 'RS'], ['Salvador', 'BA'], ['Recife', 'PE'], ['Fortaleza', 'CE'], ['Florianópolis', 'SC'], ['Goiânia', 'GO'], ['Campinas', 'SP'], ['Brasília', 'DF'], ['Vitória', 'ES'], ['Manaus', 'AM'], ['Belém', 'PA'], ['Natal', 'RN'], ['Guarujá', 'SP'], ['Niterói', 'RJ'], ['Londrina', 'PR']];
  const T0 = Date.now();
  const SEEDS = SEED_NOMES.map((nome, i) => {
    const r = rngOf('seed' + i), id = 'p' + (i + 1);
    const [cidade, uf] = pickR(r, SEED_CID);
    const area = r() < .55 ? pickR(r, ESPECIAIS) : pickR(r, GERAIS.slice(0, -1));
    const ano = new Date().getFullYear() - (31 + Math.floor(r() * 30));
    const nascimento = `${ano}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
    const p = { id, nome, cidade, uf, area, nascimento, foto: '', instagram: '', exemplo: true, criado: T0 - (i < 30 ? 86400000 * (40 + i) : ((i - 30) * 7 + 2) * 60000) };
    p.historia = historia(p, r); p.frase = pickR(r, FRASES);
    return p;
  });

  /* ---------- servidor (Vercel + Neon) ou demonstração (dados só neste navegador) ---------- */
  const API = 'api/';
  async function api(path, body) {
    const r = await fetch(API + path, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin' });
    let d = {}; try { d = await r.json() } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(d.erro || 'Não deu certo. Tente de novo.'), { status: r.status });
    return d;
  }
  const C = { modo: 'local', pessoas: [], me: null, exemplos: false, erro: '' };
  async function carregar() {
    if (/^https?:$/.test(location.protocol)) {
      try {
        const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
        const r = await fetch(API + 'pessoas', { signal: ctl.signal, credentials: 'same-origin' }); clearTimeout(tm);
        if ((r.headers.get('content-type') || '').includes('json')) {
          const d = await r.json().catch(() => ({}));
          C.modo = 'api';
          if (r.ok) { C.pessoas = d.pessoas || []; C.exemplos = !!d.exemplos } else { C.erro = d.erro || 'Servidor indisponível.'; console.warn('Pobres:', C.erro) }
          try { C.me = (await api('auth')).usuario } catch (e) { C.me = null }
          return;
        }
      } catch (e) {}
    }
    C.modo = 'local';
  }
  const pub = u => { const { email, whatsapp, senha, ...r } = u; return r };
  const trocaPessoa = u => { const i = C.pessoas.findIndex(x => x.id === u.id), p = pub(u); if (i >= 0) C.pessoas[i] = p; else C.pessoas.unshift(p) };
  const ADMIN_LOCAL = '98fbabc5409a8f23bc3a01ff6620b0a5b480430abe91fa29f55463aedf483011'; /* só para a demonstração sem servidor */
  const sha = async s => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') } catch (e) { return '' } };

  const Conta = {
    esc, idade, faltaPara30, cotacao, historia, historias, rngOf,
    ESPECIAIS, GERAIS,
    get modo() { return C.modo },
    get erroServidor() { return C.erro },
    users: () => C.modo === 'api' ? C.pessoas : ls.get(K, []),
    exemplosAtivos() { if (C.modo === 'api') return C.exemplos; const v = ls.get('pobres-exemplos', null); return v === null ? EXEMPLOS_PADRAO : !!v },
    totalExemplos: SEEDS.length,
    seeds: () => Conta.exemplosAtivos() ? SEEDS : [],
    todos: () => [...Conta.users(), ...Conta.seeds()],
    pessoa(id) { const r = Conta.ranking().find(u => u.id === id); return r ? (r.rank <= 30 ? r : { ...r, rank: null }) : null },
    atual() { if (C.modo === 'api') return C.me; const id = ls.get(S, null); return id ? ls.get(K, []).find(u => u.id === id) || null : null },
    async criar(d) {
      if (C.modo === 'api') { const r = await api('auth', { acao: 'cadastrar', ...d }); C.me = r.usuario; trocaPessoa(r.usuario); return r.usuario }
      const us = ls.get(K, []), email = d.email.trim().toLowerCase();
      if (us.some(u => u.email === email)) throw new Error('Este e-mail já está inscrito. Entre com sua senha.');
      if (idade(d.nascimento) < 30) throw new Error('O Pobres Over 30 só aceita pessoas a partir de 30 anos.');
      const u = {
        id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        primeiro: d.primeiro.trim(), sobrenome: d.sobrenome.trim(), nome: `${d.primeiro.trim()} ${d.sobrenome.trim()}`,
        nascimento: d.nascimento, cidade: d.cidade, uf: d.uf, area: d.area, historia: d.historia || '',
        foto: d.foto || '', email, whatsapp: d.whatsapp, senha: await hash(d.senha), frase: '', instagram: '', criado: Date.now()
      };
      us.unshift(u);
      if (!ls.set(K, us)) throw new Error('Não deu pra salvar sua inscrição. Tente uma foto menor.');
      ls.set(S, u.id);
      return u;
    },
    async entrar(email, senha) {
      if (C.modo === 'api') { const r = await api('auth', { acao: 'entrar', email, senha }); C.me = r.usuario; return r.usuario }
      const u = ls.get(K, []).find(x => x.email === email.trim().toLowerCase());
      if (!u || u.senha !== await hash(senha)) throw new Error('E-mail ou senha incorretos.');
      ls.set(S, u.id);
      return u;
    },
    async sair() { if (C.modo === 'api') { try { await api('auth', { acao: 'sair' }) } catch (e) {} C.me = null } else ls.del(S) },
    /* troca de e-mail e/ou senha: sempre pede a senha atual */
    async seguranca({ email, senhaAtual, novaSenha }) {
      if (C.modo === 'api') { const r = await api('auth', { acao: 'seguranca', email, senhaAtual, novaSenha }); C.me = r.usuario; return r.usuario }
      const me = Conta.atual(); if (!me) throw new Error('Sessão expirada. Entre de novo.');
      const novoEmail = (email || '').trim().toLowerCase(), mudaEmail = novoEmail && novoEmail !== me.email;
      if (!mudaEmail && !novaSenha) return me;
      if (!senhaAtual) throw new Error('Digite sua senha atual para alterar e-mail ou senha.');
      if (await hash(senhaAtual) !== me.senha) throw new Error('Senha atual incorreta.');
      const us = ls.get(K, []), i = us.findIndex(u => u.id === me.id);
      if (mudaEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(novoEmail)) throw new Error('Digite um e-mail válido.');
        if (us.some(u => u.email === novoEmail && u.id !== me.id)) throw new Error('Esse e-mail já está em uso por outra conta.');
        us[i].email = novoEmail;
      }
      if (novaSenha) {
        if (novaSenha.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
        us[i].senha = await hash(novaSenha);
      }
      if (!ls.set(K, us)) throw new Error('Não deu pra salvar. Tente de novo.');
      return us[i];
    },
    async atualizar(patch) {
      if (C.modo === 'api') { const r = await api('auth', { acao: 'atualizar', ...patch }); C.me = r.usuario; trocaPessoa(r.usuario); return r.usuario }
      const me = Conta.atual(); if (!me) throw new Error('Sessão expirada. Entre de novo.');
      const us = ls.get(K, []), i = us.findIndex(u => u.id === me.id);
      if (patch.nascimento && idade(patch.nascimento) < 30) throw new Error('O Pobres Over 30 só aceita pessoas a partir de 30 anos.');
      us[i] = { ...us[i], ...patch, id: me.id, email: me.email, senha: me.senha, nascimento: patch.nascimento || me.nascimento };
      if (patch.primeiro || patch.sobrenome) us[i].nome = `${us[i].primeiro} ${us[i].sobrenome}`;
      if (!ls.set(K, us)) throw new Error('Não deu pra salvar. Tente uma foto menor.');
      return us[i];
    },
    async esqueci(email) { if (C.modo !== 'api') return { configurado: false }; return api('auth', { acao: 'esqueci', email }) },
    async redefinir(token, senha) { if (C.modo !== 'api') throw new Error('Disponível quando o site estiver na Vercel.'); const r = await api('auth', { acao: 'redefinir', token, senha }); C.me = r.usuario; return r.usuario },
    /* ranking do dia: quem mais caiu na cotação fica no topo (o mais pobre do dia é o nº 1) */
    ranking() {
      const v = c => (c.dir === 'dn' ? 1 : -1) * parseFloat(c.pct.replace(',', '.'));
      return Conta.todos().map(u => ({ ...u, ...Conta.cotacao(u.id) })).sort((a, b) => v(b) - v(a) || a.criado - b.criado).map((u, i) => ({ ...u, rank: i + 1 }));
    },
    /* ---------- admin ---------- */
    admin: {
      async entrar(senha) {
        if (C.modo === 'api') return api('admin', { acao: 'entrar', senha });
        const h = await sha(`pobres-admin:${senha}`);
        if (h !== ADMIN_LOCAL) throw new Error('Senha incorreta.');
        try { sessionStorage.setItem('pobres-admin', h) } catch (e) {}
      },
      async sair() { if (C.modo === 'api') { try { await api('admin', { acao: 'sair' }) } catch (e) {} } else { try { sessionStorage.removeItem('pobres-admin') } catch (e) {} } },
      async dados() {
        if (C.modo === 'api') { const d = await api('admin'); C.exemplos = !!d.exemplos; return d }
        let ok = false; try { ok = sessionStorage.getItem('pobres-admin') === ADMIN_LOCAL } catch (e) {}
        if (!ok) throw Object.assign(new Error('Acesso restrito.'), { status: 401 });
        return { usuarios: ls.get(K, []), metricas: window.Metricas ? Metricas.locais() : [], exemplos: Conta.exemplosAtivos() };
      },
      async remover(id) { if (C.modo === 'api') { await api('admin', { acao: 'remover', id }); C.pessoas = C.pessoas.filter(u => u.id !== id); return } ls.set(K, ls.get(K, []).filter(u => u.id !== id)); if (ls.get(S, null) === id) ls.del(S) },
      async exemplos(b) { if (C.modo === 'api') { const r = await api('admin', { acao: 'exemplos', valor: !!b }); C.exemplos = r.exemplos; return } ls.set('pobres-exemplos', !!b) },
      async ignorar(b) {
        const v = window.Metricas ? Metricas.vid() : '';
        if (window.Metricas) Metricas.ignorar(b);
        if (C.modo === 'api' && v) await api('admin', { acao: 'ignorar', vid: v, valor: !!b });
      },
      async zerar() { if (C.modo === 'api') return api('admin', { acao: 'zerar' }); window.Metricas && Metricas.limparLocal() }
    },
    iniciais: n => (n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase(),
    header(el) {
      if (!el) return;
      const u = Conta.atual();
      el.innerHTML = u
        ? `<a class="avatar" href="perfil.html" aria-label="Meu perfil" title="Meu perfil">${u.foto ? `<img src="${esc(u.foto)}" alt="">` : esc(Conta.iniciais(u.nome))}</a>`
        : `<a class="entrar" href="entrar.html">Entrar</a><a class="cta" href="inscricao.html">Inscreva-se</a>`;
    },
    async foto(file, size = 480) {
      const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file) });
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url });
      const c = document.createElement('canvas'); c.width = c.height = size;
      const m = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, size, size);
      return c.toDataURL('image/jpeg', .82);
    },
    /* redimensiona uma imagem (dataURL) para um quadrado de `size` px */
    async redim(src, size = 480) {
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src });
      const c = document.createElement('canvas'); c.width = c.height = size;
      const m = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, size, size);
      return c.toDataURL('image/jpeg', .85);
    },
    /* 3 versões P&B feitas no próprio navegador (demonstração e plano B se a IA falhar) */
    async pbLocal(src, size = 480) {
      const base = await Conta.redim(src, size);
      const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = base });
      const estilos = [{ c: 1.55, b: -12, g: 0, v: .55 }, { c: 1.1, b: 14, g: 10, v: .2 }, { c: 1.3, b: 0, g: 22, v: .4 }];
      return estilos.map(e => {
        const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
        x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, size, size), p = d.data, h = size / 2;
        for (let i = 0; i < p.length; i += 4) {
          const k = i / 4, px = k % size, py = (k / size) | 0, dist = Math.hypot(px - h, py - h) / (h * 1.42);
          let l = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2];
          l = (l - 128) * e.c + 128 + e.b + (Math.random() - .5) * e.g;
          l *= 1 - e.v * dist * dist;
          l = Math.max(0, Math.min(255, l)); p[i] = p[i + 1] = p[i + 2] = l;
        }
        x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', .85);
      });
    },
    /* 3 versões editoriais P&B pela IA (Replicate, na Vercel); sem IA, usa as versões locais */
    async fotoIA(src) {
      if (C.modo === 'api') {
        try { const r = await api('foto-ia', { foto: await Conta.redim(src, 1024) }); return { fotos: await Promise.all(r.fotos.map(f => Conta.redim(f, 480))), ia: true } }
        catch (e) { return { fotos: await Conta.pbLocal(src), ia: false, aviso: e.status === 501 ? '' : e.message } }
      }
      return { fotos: await Conta.pbLocal(src), ia: false, aviso: '' };
    },
    /* download: usa o recurso do artefato quando existe; senão, link de download comum */
    async baixar(blob, filename) {
      if (window.claude && typeof window.claude.use === 'function') {
        try {
          const dl = await window.claude.use('downloads');
          if (dl) { await dl.save({ filename, data: blob }); return true }
        } catch (e) { if (e && /declin|cancel|reject/i.test(e.message || '')) return false }
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return true;
    }
  };
  Conta.AREAS = [...ESPECIAIS.map(v => ({ value: v, label: v, group: 'Situações especiais' })), ...GERAIS.map(v => ({ value: v, label: v, group: 'Áreas' }))];
  Conta.UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(v => ({ value: v, label: v }));
  Conta.estados = () => window.BR ? window.BR.estados.map(([uf, n]) => ({ value: uf, label: `${n} (${uf})` })) : Conta.UFS;
  Conta.cidades = uf => window.BR && uf ? (window.BR.cidades[uf] || []).map(c => ({ value: c, label: c })) : [];

  /* Dropdown próprio: PSelect(el, {items:[{value,label,group?}], placeholder, value, search, disabled, onChange}) */
  let uid = 0;
  function PSelect(root, o) {
    const id = 'ps' + (++uid);
    let items = o.items, value = o.value ?? null, act = -1, vis = [], disabled = !!o.disabled;
    root.classList.add('psel');
    root.innerHTML = `<button type="button" class="psel-btn" aria-haspopup="listbox" aria-expanded="false" ${o.label ? `aria-label="${esc(o.label)}"` : ''}><span class="psel-val"></span></button>
      <div class="psel-pop" hidden>${o.search ? `<input class="psel-q" type="text" placeholder="Buscar" aria-label="Buscar opção" autocomplete="off">` : ''}<ul class="psel-list" role="listbox" id="${id}"></ul></div>`;
    const btn = root.querySelector('.psel-btn'), pop = root.querySelector('.psel-pop'), list = root.querySelector('.psel-list'), q = root.querySelector('.psel-q');
    const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function paintBtn() {
      const it = items.find(i => i.value === value);
      btn.disabled = disabled; root.classList.toggle('off', disabled);
      root.querySelector('.psel-val').innerHTML = it ? esc(it.label) : `<span class="psel-ph">${esc(disabled && o.disabledText ? o.disabledText : (o.placeholder || 'Selecione'))}</span>`;
    }
    function paintList() {
      const t = q ? norm(q.value.trim()) : '';
      vis = items.filter(i => !t || norm(i.label).includes(t));
      const LIM = 400, shown = vis.slice(0, LIM);
      let g = null, h = '';
      shown.forEach((it, i) => {
        if (it.group && it.group !== g) { g = it.group; h += `<li class="psel-g" role="presentation">${esc(g)}</li>` }
        h += `<li class="psel-o${i === act ? ' act' : ''}" role="option" id="${id}-${i}" data-i="${i}" aria-selected="${it.value === value}">${esc(it.label)}</li>`;
      });
      if (vis.length > LIM) h += `<li class="psel-empty">Mais ${vis.length - LIM} opções. Digite para filtrar.</li>`;
      list.innerHTML = h || '<li class="psel-empty">Nada encontrado.</li>';
      if (act >= 0) { btn.setAttribute('aria-activedescendant', `${id}-${act}`); list.querySelector('.act')?.scrollIntoView({ block: 'nearest' }) }
    }
    function open() {
      if (!pop.hidden || disabled) return;
      document.querySelectorAll('.psel-pop:not([hidden])').forEach(p => p.closest('.psel').__close?.());
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); root.classList.add('open');
      if (q) q.value = '';
      act = Math.max(0, items.findIndex(i => i.value === value)); if (act >= 400) act = 0; paintList();
      list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'center' });
      (q || btn).focus();
    }
    function close(f = true) { if (pop.hidden) return; pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); root.classList.remove('open'); if (f) btn.focus() }
    root.__close = () => close(false);
    function pick(i) { const it = vis[i]; if (!it) return; value = it.value; paintBtn(); close(); root.classList.remove('bad'); o.onChange?.(value) }
    function key(e) {
      if (pop.hidden) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open() } return }
      const max = Math.min(vis.length, 400) - 1;
      if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(max, act + 1); paintList() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); paintList() }
      else if (e.key === 'Enter') { e.preventDefault(); pick(act) }
      else if (e.key === 'Escape') { e.preventDefault(); close() }
      else if (e.key === 'Tab') close(false);
      else if (!q && e.key.length === 1) { const k = norm(e.key), i = vis.findIndex(v => norm(v.label).startsWith(k)); if (i >= 0) { act = i; paintList() } }
    }
    btn.addEventListener('click', () => pop.hidden ? open() : close());
    btn.addEventListener('keydown', key);
    q?.addEventListener('keydown', key);
    q?.addEventListener('input', () => { act = 0; paintList() });
    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => { const li = e.target.closest('.psel-o'); if (li) pick(+li.dataset.i) });
    document.addEventListener('click', e => { if (!root.contains(e.target)) close(false) });
    paintBtn();
    return {
      get value() { return value },
      set(v) { value = v; paintBtn() },
      setItems(n) { items = n; if (!items.some(i => i.value === value)) value = null; paintBtn() },
      disable(b) { disabled = b; if (b) close(false); paintBtn() },
      focus() { btn.focus() }, el: root
    };
  }

  window.Conta = Conta;
  window.PSelect = PSelect;
  Conta.api = api;
  Conta.pronto = carregar();
  Conta.pronto.then(() => { const h = () => Conta.header(document.getElementById('acct')); document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', h) : h() });
})();
