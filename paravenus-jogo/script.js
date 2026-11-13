/* =====================================================================
   PARAVÊNUS — Jornada de uma Candidata  ·  script.js
   Jogo investigativo 2D · HTML + CSS + JavaScript puro (sem dependências)

   ÍNDICE
   1. Utilitários
   2. Dados do jogo (empresas, pistas, textos)  ← edite aqui para mudar o conteúdo
   3. Estado da partida
   4. Som (WebAudio sintetizado — não precisa de arquivos)
   5. Interface base (toasts, overlays, diálogos, HUD, telas)
   6. Gráficos (avatares e objetos em SVG)
   7. Fluxo: intro → propostas → mapa
   8. Empresa: sala, movimento, computador, funcionária, mural
   9. ParaVênus (site fictício) e Caderno de Investigação
   10. Decisão, finais e estatísticas
   11. Eventos e inicialização
   ===================================================================== */
'use strict';

/* ============================== 1. UTILITÁRIOS ============================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('paravenus:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('paravenus:' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: tudo bem */ } }
};

/* ============================== 2. DADOS DO JOGO ============================== */

/* Campos do Caderno de Investigação */
const CAMPOS = [
  { id: 'salario',     ic: '💰', nome: 'Salário' },
  { id: 'modalidade',  ic: '🏠', nome: 'Modalidade' },
  { id: 'beneficios',  ic: '🎁', nome: 'Benefícios' },
  { id: 'lideranca',   ic: '👩', nome: 'Liderança feminina' },
  { id: 'crescimento', ic: '📈', nome: 'Crescimento' },
  { id: 'ambiente',    ic: '💬', nome: 'Ambiente' }
];

/* Fontes de informação de cada empresa (cada uma gera 1 pista) */
const FONTES = [
  { id: 'pc',    ic: '💻', nome: 'Vaga' },
  { id: 'func',  ic: '💬', nome: 'Conversa' },
  { id: 'mural', ic: '📋', nome: 'Mural' },
  { id: 'site1', ic: '🌐', nome: 'Avaliações' },
  { id: 'site2', ic: '🛡️', nome: 'Dados verificados' }
];
const FONTES_SALA = ['pc', 'func', 'mural'];

/* Limiares do placar OCULTO (ajuste se quiser deixar mais fácil/difícil) */
const LIMITE_FINAL_EXCELENTE = 60; // % de pistas para o final 1
const PLAYER_VISUAL = { skin: '#D9A27E', hair: '#3A1740', top: '#FF2E93', bottom: '#2B0B3F', estilo: 'long' };

/*
  Cada empresa tem vantagens E desvantagens.
  - Cada "clue" registra anotações no caderno (fields) e, às vezes, uma flag (red/green).
  - funcionária e mural têm 2 variantes: a partida sorteia uma (rejogabilidade).
*/
const EMPRESAS = {
  /* ------------------------------ TECHNOVA ------------------------------ */
  technova: {
    id: 'technova', nome: 'TechNova', sigla: 'TN', cor: '#FF7A3D', corSec: '#FF4C29', tema: 'corp', dominio: 'technova.com.br',
    cargo: 'Desenvolvedora Front-End Júnior', salario: 5800, salarioTxt: 'R$ 5.800', modalidade: 'Presencial', local: 'São Paulo – SP',
    beneficiosCurtos: ['Vale-refeição', 'Plano de saúde', 'Bônus anual'],
    slogan: 'Inovação, inclusão e alta performance.',
    vaga: {
      horario: '08:00–18:00 · 5 dias no escritório', stack: 'React · TypeScript · Figma',
      descricao: 'Construir interfaces de produtos financeiros usados por milhares de pessoas, em um escritório moderno no centro de São Paulo.',
      beneficios: 'Vale-refeição, plano de saúde, bônus anual e auxílio equipamento'
    },
    decor: [{ e: '🪴', x: 94, y: 90, s: 6 }, { e: '🖨️', x: 41, y: 62, s: 3.4 }],
    pcClue: {
      fields: {
        beneficios: 'Vale-refeição, plano de saúde, bônus anual e auxílio equipamento.',
        modalidade: 'Horário 08:00–18:00, cinco dias por semana no escritório.',
        salario: 'Bônus anual previsto além do salário.'
      },
      resumo: 'Pacote de benefícios completo, mas presencial em tempo integral.',
      flag: { tipo: 'green', texto: 'Remuneração e benefícios fortes.' }
    },
    func: {
      nome: 'Camila', cargo: 'Desenvolvedora Pleno', visual: { skin: '#F2C6A0', hair: '#2B1A3A', top: '#FF7A3D', bottom: '#40204D', estilo: 'bun' },
      variantes: [
        {
          falas: ['Oi{v}! Eu gosto bastante do salário e dos benefícios.', 'Mas sinto que crescer aqui pode ser mais difícil.', 'Na minha equipe, poucas mulheres chegaram a cargos de liderança.'],
          clue: {
            fields: { ambiente: 'Gosta do salário e dos benefícios, mas relata dificuldade para crescer.', crescimento: 'Poucas mulheres da equipe dela chegaram à liderança.' },
            resumo: 'Relato: o pacote é bom, mas crescer parece mais difícil.',
            flag: { tipo: 'red', texto: 'Crescimento difícil e poucas líderes na equipe.' }
          }
        },
        {
          falas: ['Oi{v}! A minha equipe é ótima, a gente se ajuda muito.', 'Só que promoção aqui parece depender de quem te indica.', 'Ninguém sabe muito bem quais são os critérios.'],
          clue: {
            fields: { ambiente: 'Boa relação entre colegas de equipe.', crescimento: 'Critérios de promoção pouco claros (“depende de indicação”).' },
            resumo: 'Relato: equipe unida, mas critérios de promoção nebulosos.',
            flag: { tipo: 'green', texto: 'Equipe unida e colaborativa.' }
          }
        }
      ]
    },
    mural: {
      variantes: [
        {
          chave: { titulo: 'Promoções de 2025', linhas: ['👨 8 homens promovidos', '👩 1 mulher promovida'] },
          clue: { fields: { lideranca: 'Promoções de 2025: 8 homens e 1 mulher.' }, resumo: 'Promoções de 2025: 8 homens e 1 mulher.', flag: { tipo: 'red', texto: 'Baixa presença feminina entre as promoções recentes.' } }
        },
        {
          chave: { titulo: 'Organograma de liderança', linhas: ['17 cargos de gerência e diretoria', '2 ocupados por mulheres'] },
          clue: { fields: { lideranca: 'Organograma: 2 mulheres em 17 cargos de liderança.' }, resumo: 'Organograma: 2 mulheres em 17 cargos de liderança.', flag: { tipo: 'red', texto: 'Baixa presença feminina na liderança.' } }
        }
      ],
      decoys: [
        { titulo: 'Semana da diversidade', linhas: ['“Somos uma empresa inclusiva!”', 'Palestra · sexta, 15h'], nota: 'Um cartaz bonito… mas o que os números dizem?' },
        { titulo: 'Cardápio da semana', linhas: ['Seg: strogonoff', 'Ter: feijoada leve', 'Qua: massa'], nota: 'Pelo menos o almoço parece bom.' }
      ]
    },
    site: {
      nota: 3.8, avaliacoes: 126, remoto: 'Não', mentoria: 'Não',
      comentarios: {
        pos: [
          { t: 'Minha equipe era excelente.', a: 'Dev Front-End · ex-funcionária' },
          { t: 'Gostei muito dos benefícios.', a: 'QA · funcionária atual' },
          { t: 'Boa remuneração para quem está começando.', a: 'Dev Júnior · funcionária atual' }
        ],
        neg: [
          { t: 'Boa remuneração, mas senti dificuldade para crescer.', a: 'Dev Pleno · ex-funcionária' },
          { t: 'Gostaria que houvesse mais mulheres na liderança.', a: 'Designer · funcionária atual' },
          { t: 'Cobrança de horas extras em época de entrega.', a: 'Dev Back-End · ex-funcionária' }
        ]
      },
      clue1: { fields: { ambiente: 'Avaliações online divergem: equipe e benefícios elogiados; crescimento e liderança criticados.' }, resumo: 'Avaliações divergem: bons benefícios, crescimento criticado.', flag: null },
      verificados: { lideranca: 12, denuncias: '2 em análise', rotatividade: '31% ao ano · alta', satisfacao: 61, amostra: '126 avaliações' },
      clue2: {
        fields: { lideranca: 'ParaVênus: 12% de mulheres em cargos de liderança.', ambiente: '2 denúncias em análise e rotatividade alta (31% ao ano).' },
        resumo: '12% de mulheres na liderança · 2 denúncias em análise · rotatividade de 31%.',
        flag: { tipo: 'red', texto: 'Denúncias em análise e alta rotatividade.' }
      }
    },
    epilogo: {
      medio: 'Você aceitou a TechNova: salário e benefícios fortes, com pontos de atenção que já estavam anotados no seu caderno.',
      alerta: 'Você aceitou a TechNova pelo salário. Meses depois, as dúvidas sobre crescimento e liderança — que o caderno já apontava — voltam à sua mente.'
    }
  },

  /* ------------------------------ CODELAB ------------------------------ */
  codelab: {
    id: 'codelab', nome: 'CodeLab', sigla: 'CL', cor: '#FF2E93', corSec: '#FF6FB0', tema: 'cozy', dominio: 'codelab.dev.br',
    cargo: 'Desenvolvedora Back-End Júnior', salario: 4900, salarioTxt: 'R$ 4.900', modalidade: 'Híbrido', local: 'Campinas – SP',
    beneficiosCurtos: ['Vale-refeição', 'Plano de saúde', 'Auxílio educação'],
    slogan: 'Cultura de aprendizado contínuo.',
    vaga: {
      horario: '09:00–17:30 · 3 dias no escritório, 2 em casa', stack: 'Node.js · PostgreSQL · Docker',
      descricao: 'Desenvolver APIs para plataformas de educação, em um time que revisa código em dupla e valoriza o aprendizado.',
      beneficios: 'Vale-refeição, plano de saúde e auxílio educação'
    },
    decor: [{ e: '🪴', x: 40, y: 64, s: 6 }, { e: '🌿', x: 95, y: 92, s: 6.5 }, { e: '📚', x: 58, y: 34, s: 4 }, { e: '🛋️', x: 90, y: 66, s: 7 }],
    pcClue: {
      fields: {
        beneficios: 'Vale-refeição, plano de saúde e auxílio educação.',
        modalidade: 'Três dias no escritório e dois em casa.',
        salario: 'Salário médio; reajuste anual por desempenho.'
      },
      resumo: 'Vaga híbrida com salário médio e foco em aprendizado.',
      flag: null
    },
    func: {
      nome: 'Renata', cargo: 'Desenvolvedora Pleno', visual: { skin: '#B97A57', hair: '#2B0B3F', top: '#FF6FB0', bottom: '#40204D', estilo: 'curly' },
      variantes: [
        {
          falas: ['Oi{v}! Quando entrei, uma desenvolvedora mais experiente foi minha mentora.', 'Foi importante para eu conseguir crescer.', 'Não significa que tudo seja perfeito, mas sinto que tenho espaço para evoluir.'],
          clue: {
            fields: { crescimento: 'A mentoria ajudou a funcionária a evoluir na carreira.', ambiente: 'Relata espaço para evoluir, sem esconder que há pontos imperfeitos.' },
            resumo: 'Relato: a mentoria fez diferença, e ela admite que nem tudo é perfeito.',
            flag: { tipo: 'green', texto: 'Mentoria faz diferença no desenvolvimento.' }
          }
        },
        {
          falas: ['Oi{v}! A mentoria me ajudou muito no começo.', 'Mas em semana de entrega o time fica sobrecarregado.', 'A gente já falou disso na retrospectiva, só que ainda não resolveu.'],
          clue: {
            fields: { crescimento: 'A mentoria ajudou no começo da carreira.', ambiente: 'Sobrecarga em semanas de entrega — tema ainda em discussão.' },
            resumo: 'Relato: mentoria ajuda, mas há sobrecarga em semanas de entrega.',
            flag: { tipo: 'red', texto: 'Sobrecarga de trabalho em períodos de entrega.' }
          }
        }
      ]
    },
    mural: {
      variantes: [
        {
          chave: { titulo: 'Programa de mentoria', linhas: ['42 participantes', '67% mulheres', '12 promovidas(os) nos últimos 12 meses'] },
          clue: {
            fields: { crescimento: 'Programa de mentoria: 12 promoções em 12 meses.', lideranca: '67% das participantes da mentoria são mulheres.' },
            resumo: 'Mentoria: 42 participantes, 67% mulheres, 12 promoções em 12 meses.',
            flag: { tipo: 'green', texto: 'Programa estruturado de desenvolvimento profissional.' }
          }
        },
        {
          chave: { titulo: 'Painel de liderança', linhas: ['11 cargos de liderança', '5 ocupados por mulheres (45%)'] },
          clue: {
            fields: { lideranca: 'Painel interno: 5 mulheres em 11 cargos de liderança.' },
            resumo: 'Painel interno: 5 mulheres em 11 cargos de liderança.',
            flag: { tipo: 'green', texto: 'Liderança diversa.' }
          }
        }
      ],
      decoys: [
        { titulo: 'Lista de espera — mentoria', linhas: ['Próximo ciclo: 15 vagas', 'Inscrições até dia 30'], nota: 'Nem tudo é ilimitado: as vagas de mentoria são poucas.' },
        { titulo: 'Retrospectiva do time', linhas: ['Pontos de melhoria:', '• ritmo das entregas', '• documentação'], nota: 'Eles falam dos problemas abertamente. Isso é um sinal interessante.' }
      ]
    },
    site: {
      nota: 4.6, avaliacoes: 98, remoto: 'Híbrido', mentoria: 'Sim',
      comentarios: {
        pos: [
          { t: 'A mentoria fez toda a diferença no meu primeiro ano.', a: 'Dev Back-End · funcionária atual' },
          { t: 'Vejo mulheres em cargos de decisão — isso inspira.', a: 'Dev Júnior · funcionária atual' },
          { t: 'O modelo híbrido funciona bem para mim.', a: 'QA · funcionária atual' }
        ],
        neg: [
          { t: 'O salário poderia acompanhar mais o mercado.', a: 'Dev Pleno · ex-funcionária' },
          { t: 'Em semanas de entrega, o ritmo aperta.', a: 'Dev Back-End · funcionária atual' },
          { t: 'As vagas de mentoria são limitadas.', a: 'Designer · funcionária atual' }
        ]
      },
      clue1: { fields: { ambiente: 'Avaliações online elogiam o apoio da liderança, com ressalvas sobre salário e ritmo.' }, resumo: 'Boa avaliação geral, com ressalvas sobre salário e ritmo.', flag: { tipo: 'green', texto: 'Boa avaliação das funcionárias.' } },
      verificados: { lideranca: 46, denuncias: '1 (arquivada após apuração)', rotatividade: '9% ao ano · baixa', satisfacao: 84, amostra: '98 avaliações' },
      clue2: {
        fields: { lideranca: 'ParaVênus: 46% de mulheres em cargos de liderança.', ambiente: 'Rotatividade baixa (9%) e uma denúncia, já apurada e arquivada.' },
        resumo: '46% de mulheres na liderança · rotatividade de 9% · 1 denúncia arquivada.',
        flag: { tipo: 'green', texto: 'Rotatividade baixa e canal de denúncias funcionando.' }
      }
    },
    epilogo: {
      bom: 'Você aceitou a CodeLab. No primeiro dia, já havia uma mentora esperando — e você sabia exatamente por que escolheu estar ali.',
      medio: 'Você aceitou a CodeLab. Tudo indica uma boa escolha, e ainda há pistas que valeria conferir.'
    }
  },

  /* ------------------------------ FUTURETECH ------------------------------ */
  futuretech: {
    id: 'futuretech', nome: 'FutureTech', sigla: 'FT', cor: '#FFC93C', corSec: '#FF7A3D', tema: 'remote', dominio: 'futuretech.io',
    cargo: 'Desenvolvedora Full Stack Júnior', salario: 4200, salarioTxt: 'R$ 4.200', modalidade: '100% remoto', local: 'Remoto · sede em Florianópolis – SC',
    beneficiosCurtos: ['Horário flexível', 'Auxílio internet', 'Dias extras de folga'],
    slogan: 'Trabalhe de onde quiser. Cresça rápido.',
    vaga: {
      horario: 'Horário flexível · 100% remoto', stack: 'React · Node.js · AWS',
      descricao: 'Fazer um pouco de tudo em uma startup pequena: do banco de dados à interface, com autonomia para propor soluções.',
      beneficios: 'Auxílio internet e home office, horário flexível e dois dias extras de folga'
    },
    decor: [{ e: '🛋️', x: 90, y: 72, s: 7 }, { e: '🪴', x: 42, y: 64, s: 5 }, { e: '🎧', x: 62, y: 63, s: 3.3 }],
    pcClue: {
      fields: {
        beneficios: 'Auxílio internet e home office, horário flexível e 2 dias extras de folga. Sem plano de saúde tradicional.',
        modalidade: 'Horário flexível e sem reuniões às sextas.',
        salario: 'Salário abaixo das outras duas propostas.'
      },
      resumo: 'Flexibilidade total, mas poucos benefícios tradicionais.',
      flag: { tipo: 'red', texto: 'Poucos benefícios tradicionais (sem plano de saúde).' }
    },
    func: {
      nome: 'Juliana', cargo: 'Desenvolvedora Full Stack', visual: { skin: '#E8B48E', hair: '#7A3E1D', top: '#FFC93C', bottom: '#40204D', estilo: 'long' },
      variantes: [
        {
          falas: ['Oi{v}! Eu consigo conciliar melhor minha vida pessoal com o trabalho.', 'Mas a empresa ainda está crescendo.', 'Às vezes faltam processos bem definidos.'],
          clue: {
            fields: { ambiente: 'Flexibilidade real para conciliar vida pessoal, mas processos ainda pouco definidos.', crescimento: 'Empresa em fase de crescimento.' },
            resumo: 'Relato: boa conciliação com a vida pessoal, mas faltam processos.',
            flag: { tipo: 'red', texto: 'Processos internos ainda pouco definidos.' }
          }
        },
        {
          falas: ['Oi{v}! Aqui eu fui de júnior a pleno em 14 meses.', 'Mas como a empresa é pequena, nem sempre há orçamento para tudo.', 'Em compensação, a gente tem voz nas decisões.'],
          clue: {
            fields: { crescimento: 'Promoção de júnior a pleno em 14 meses (relato).', ambiente: 'Voz ativa nas decisões; orçamento limitado por ser empresa pequena.' },
            resumo: 'Relato: de júnior a pleno em 14 meses, com orçamento limitado.',
            flag: { tipo: 'green', texto: 'Crescimento rápido de carreira.' }
          }
        }
      ]
    },
    mural: {
      variantes: [
        {
          chave: { titulo: 'Pesquisa interna de satisfação', linhas: ['87% recomendariam a empresa', '14 pessoas responderam'] },
          clue: { fields: { ambiente: 'Pesquisa interna: 87% recomendariam a empresa (14 respostas).' }, resumo: 'Pesquisa interna: 87% recomendariam a empresa (14 respostas).', flag: { tipo: 'green', texto: 'Alto nível de satisfação dos funcionários.' } }
        },
        {
          chave: { titulo: 'Quem lidera a FutureTech', linhas: ['4 pessoas na liderança', '3 são mulheres'] },
          clue: { fields: { lideranca: 'Liderança: 3 mulheres em 4 cargos.' }, resumo: 'Liderança: 3 mulheres em 4 cargos.', flag: { tipo: 'green', texto: 'Liderança feminina forte.' } }
        }
      ],
      decoys: [
        { titulo: 'Rituais do time', linhas: ['Daily às 10h', 'Sexta sem reuniões', 'Retro quinzenal'], nota: 'Rotina leve. Mas rotinas leves também exigem processos claros.' },
        { titulo: 'Vagas abertas', linhas: ['Suporte técnico', 'QA', 'Produto'], nota: 'A empresa está contratando — está crescendo mesmo.' }
      ]
    },
    site: {
      nota: 4.7, avaliacoes: 23, remoto: 'Sim', mentoria: 'Informal',
      comentarios: {
        pos: [
          { t: 'Tenho autonomia e flexibilidade de verdade.', a: 'Dev Full Stack · funcionária atual' },
          { t: 'Cresci rápido de função.', a: 'Dev Pleno · funcionária atual' },
          { t: 'O time é próximo e acolhedor.', a: 'Designer · funcionária atual' }
        ],
        neg: [
          { t: 'Faltam processos documentados.', a: 'Dev Júnior · funcionária atual' },
          { t: 'Os benefícios são mais enxutos que em empresas grandes.', a: 'QA · ex-funcionária' },
          { t: 'Às vezes o ritmo depende de poucas pessoas.', a: 'Dev Back-End · funcionária atual' }
        ]
      },
      clue1: { fields: { ambiente: 'Avaliações muito positivas, mas são poucas (23) — amostra pequena.' }, resumo: 'Avaliações muito positivas, porém poucas (23).', flag: { tipo: 'green', texto: 'Boa avaliação das funcionárias.' } },
      verificados: { lideranca: 75, denuncias: 'Nenhuma registrada', rotatividade: 'Dados insuficientes', satisfacao: 91, amostra: '23 avaliações' },
      clue2: {
        fields: { lideranca: 'ParaVênus: 75% de mulheres em cargos de liderança.', ambiente: 'Nenhuma denúncia registrada; poucos dados sobre rotatividade.' },
        resumo: '75% de mulheres na liderança · nenhuma denúncia · poucos dados de rotatividade.',
        flag: { tipo: 'green', texto: 'Nenhuma denúncia registrada.' }
      }
    },
    epilogo: {
      bom: 'Você aceitou a FutureTech. Menos benefícios formais, mais autonomia e espaço para crescer — uma troca que você fez de olhos abertos.',
      medio: 'Você aceitou a FutureTech. Flexibilidade e crescimento de um lado, estrutura enxuta do outro — vale acompanhar de perto.'
    }
  }
};
const IDS = Object.keys(EMPRESAS);
const TOTAL_PISTAS = IDS.length * FONTES.length;

/* Objetos clicáveis da sala: posição visual está no HTML; (ix,iy) é onde a personagem para */
const OBJETOS = {
  pc:    { ix: 25, iy: 74, acao: 'Usar o computador' },
  func:  { ix: 44, iy: 86, acao: 'Conversar' },
  mural: { ix: 74, iy: 62, acao: 'Ler o mural' },
  saida: { ix: 13, iy: 70, acao: 'Sair para o mapa' }
};
const MAPA_NOS = {
  casa:      { x: 12, y: 72, ic: '🏠', nome: 'Casa' },
  technova:  { x: 30, y: 26 },
  paravenus: { x: 55, y: 30, ic: '🌐', nome: 'ParaVênus' },
  codelab:   { x: 58, y: 76 },
  futuretech:{ x: 86, y: 46 }
};
const DICAS_MAPA = [
  'A vaga no papel não conta a história inteira.',
  'Converse com funcionárias: cada uma tem uma experiência diferente.',
  'O ParaVênus libera dados verificados depois que você investiga a empresa.',
  'Compare as empresas na aba “Comparar” do caderno.',
  'Você também pode decidir continuar procurando.',
  'Nenhuma empresa é perfeita. Pergunte-se o que importa para você.'
];

/* Finais */
const FINAIS = {
  1: { ic: '🌟', titulo: 'Excelente decisão', badge: '🟢 INVESTIGAÇÃO COMPLETA', cls: 'f1',
       linhas: ['Você não escolheu apenas uma vaga.', 'Você analisou o ambiente, ouviu experiências e comparou informações.', 'Uma decisão profissional também começa com informação.'] },
  2: { ic: '🧭', titulo: 'Decisão razoável', badge: '🟡 BOA ESCOLHA, COM RESSALVAS', cls: 'f2', linhas: [] },
  3: { ic: '🚨', titulo: 'Sinal de alerta', badge: '🟠 ALERTA', cls: 'f3',
       linhas: ['Uma boa remuneração não elimina um ambiente de trabalho problemático.', 'Talvez valesse a pena investigar um pouco mais.'] },
  4: { ic: '🔎', titulo: 'Continuar procurando', badge: '🔵 DECISÃO CONSCIENTE', cls: 'f4',
       linhas: ['Você decidiu continuar procurando.', 'Nem toda oportunidade precisa ser aceita.', 'Ter informação também significa saber quando dizer não.'] }
};

/* ============================== 3. ESTADO DA PARTIDA ============================== */
const state = {
  nome: '', demo: false, som: true,
  tela: 'title', overlay: null, dialogo: null, busy: false, viajando: false,
  empresaAtual: null, mapaPos: 'casa', nearObj: null,
  pistas: new Set(), flags: [], notas: {}, visitadas: new Set(), variantes: {}, comentarios: {},
  escolha: null, final: null,
  player: { x: 14, y: 86, tx: null, ty: null, facing: 1, aoChegar: null }
};
const teclas = new Set();

/* Zera a partida (mantém nome, som e modo apresentação) */
function resetarPartida() {
  Object.assign(state, {
    empresaAtual: null, mapaPos: 'casa', nearObj: null, escolha: null, final: null, viajando: false,
    pistas: new Set(), flags: [], notas: {}, visitadas: new Set(), variantes: {}, comentarios: {},
    player: { x: 14, y: 86, tx: null, ty: null, facing: 1, aoChegar: null }
  });
  IDS.forEach(id => {
    const e = EMPRESAS[id];
    state.notas[id] = {};
    CAMPOS.forEach(c => { state.notas[id][c.id] = []; });
    state.variantes[id] = {
      func: Math.floor(Math.random() * e.func.variantes.length),
      mural: Math.floor(Math.random() * e.mural.variantes.length)
    };
    const pos = shuffle(e.site.comentarios.pos).slice(0, 2).map(c => ({ ...c, tipo: 'pos' }));
    const neg = shuffle(e.site.comentarios.neg).slice(0, 2).map(c => ({ ...c, tipo: 'neg' }));
    state.comentarios[id] = shuffle([...pos, ...neg]);
  });
  atualizarHud();
}

const T = ms => (state.demo ? Math.max(120, ms * 0.35) : ms);          // tempos mais curtos no modo apresentação
const fmt = txt => txt.replace(/\{v\}/g, state.nome ? ', ' + state.nome : '');
const fontesFeitas = id => FONTES.filter(f => state.pistas.has(id + ':' + f.id)).length;
const fontesSala = id => FONTES_SALA.filter(f => state.pistas.has(id + ':' + f)).length;
const siteDesbloqueado = id => fontesSala(id) >= 2;
const calcInvestigacao = () => Math.round((state.pistas.size / TOTAL_PISTAS) * 100);
const contarFlags = (tipo, emp) => state.flags.filter(f => f.tipo === tipo && (!emp || f.emp === emp)).length;

function nivelInvestigacao(inv) {
  if (inv >= 80) return { txt: 'EXCELENTE', cls: 'n4' };
  if (inv >= 55) return { txt: 'BOA', cls: 'n3' };
  if (inv >= 30) return { txt: 'PARCIAL', cls: 'n2' };
  return { txt: 'INICIAL', cls: 'n1' };
}

/* ============================== 4. SOM (WebAudio) ============================== */
const Som = {
  ctx: null, master: null, musica: null, passo: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignora */ } } return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = state.som ? 1 : 0;
      this.master.connect(this.ctx.destination);
      this.iniciarMusica();
    } catch (e) { this.ctx = null; }
  },
  tom(freq, dur = 0.15, tipo = 'sine', vol = 0.12, atraso = 0) {
    if (!this.ctx || !state.som) return;
    try {
      const t = this.ctx.currentTime + atraso;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = tipo; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* ignora */ }
  },
  play(nome) {
    switch (nome) {
      case 'click':  this.tom(660, 0.06, 'square', 0.04); break;
      case 'open':   this.tom(392, 0.1, 'triangle', 0.08); this.tom(587, 0.12, 'triangle', 0.08, 0.07); break;
      case 'step':   this.tom(300, 0.25, 'triangle', 0.06); this.tom(450, 0.25, 'triangle', 0.05, 0.1); break;
      case 'pista':  [523, 659, 784].forEach((f, i) => this.tom(f, 0.18, 'triangle', 0.1, i * 0.08)); break;
      case 'green':  this.tom(587, 0.16, 'sine', 0.12); this.tom(880, 0.28, 'sine', 0.12, 0.1); break;
      case 'red':    this.tom(233, 0.22, 'sawtooth', 0.07); this.tom(165, 0.35, 'sawtooth', 0.07, 0.14); break;
      case 'final-bom': [523, 659, 784, 1047].forEach((f, i) => this.tom(f, 0.4, 'triangle', 0.12, i * 0.14)); break;
      case 'final-neutro': [440, 523, 659].forEach((f, i) => this.tom(f, 0.4, 'triangle', 0.1, i * 0.16)); break;
      case 'final-alerta': [392, 330, 262].forEach((f, i) => this.tom(f, 0.45, 'sawtooth', 0.06, i * 0.18)); break;
    }
  },
  iniciarMusica() {
    if (this.musica || !this.ctx) return;
    const notas = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94];
    this.musica = setInterval(() => {
      if (!state.som) return;
      const f = notas[this.passo % notas.length]; this.passo++;
      this.tom(f, 1.3, 'triangle', 0.022);
      if (this.passo % 4 === 0) this.tom(f / 2, 2.4, 'sine', 0.03);
    }, 640);
  }
};

function setSom(on) {
  state.som = !!on; store.set('som', state.som);
  Som.init();
  if (Som.master) Som.master.gain.value = state.som ? 1 : 0;
  atualizarRotulos();
}
function setDemo(on) {
  state.demo = !!on; store.set('demo', state.demo);
  atualizarRotulos();
  if (state.tela === 'map') renderMapa();
  toast('info', state.demo ? 'Modo apresentação' : 'Modo normal', state.demo ? 'Diálogos e transições mais rápidos. Roteiro sugerido no mapa.' : 'Ritmo normal de jogo.', 2600);
}
function atualizarRotulos() {
  $$('[data-som-label]').forEach(b => { b.textContent = state.som ? '🔊 Som: ligado' : '🔇 Som: desligado'; });
  $$('[data-som-icon]').forEach(b => { b.textContent = state.som ? '🔊' : '🔇'; });
  $$('[data-demo-label]').forEach(b => { b.textContent = state.demo ? '⚡ Modo apresentação: LIGADO' : '⚡ Modo apresentação: desligado'; });
  $$('[data-demo-icon]').forEach(b => b.classList.toggle('on', state.demo));
}

/* ============================== 5. INTERFACE BASE ============================== */
function atualizarBusy() { state.busy = !!(state.dialogo || state.overlay); }

function irParaTela(nome) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + nome));
  state.tela = nome;
  if (nome === 'company') iniciarLoop(); else pararLoop();
  if (nome !== 'company') { teclas.clear(); state.nearObj = null; }
  if (['title', 'ending', 'stats'].includes(nome)) $('#toasts').innerHTML = '';   // limpa notificações antigas
  atualizarHud();
  const sc = $('#screen-' + nome); if (sc) sc.scrollTop = 0;
}

function atualizarHud() {
  const jogando = ['map', 'company', 'decision'].includes(state.tela);
  $('#hud').hidden = !jogando;
  $('#hud-pistas').textContent = state.pistas.size;
  $('#hud-mapa').hidden = state.tela !== 'company';
  let loc = '';
  if (state.tela === 'map') loc = 'Mapa da investigação';
  else if (state.tela === 'decision') loc = 'Hora de decidir';
  else if (state.tela === 'company' && state.empresaAtual) loc = EMPRESAS[state.empresaAtual].nome;
  $('#hud-loc').textContent = loc;
}

/* ---- Toasts ---- */
function toast(tipo, titulo, texto, dur) {
  const ic = { pista: '🔎', red: '🚩', green: '🟢', info: 'ℹ️' }[tipo] || 'ℹ️';
  const t = h('div', 'toast toast-' + tipo, `<div class="toast-ic">${ic}</div><div><b>${esc(titulo)}</b><p>${esc(texto)}</p></div>`);
  const root = $('#toasts');
  root.appendChild(t);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 420); }, dur || (state.demo ? 2800 : 4800));
}

/* ---- Overlays (janelas) ---- */
function abrirOverlay(html, classe, opts = {}) {
  fecharOverlay(true);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const o = h('div', 'overlay ' + (classe || ''), html);
  $('#modal-root').appendChild(o);
  state.overlay = { el: o, onClose: opts.onClose || null, bloquear: !!opts.bloquear };
  o.addEventListener('mousedown', e => { if (e.target === o && !opts.bloquear) fecharOverlay(); });
  atualizarBusy();
  teclas.clear();
  Som.play('open');
  return o;
}
function fecharOverlay(silencioso) {
  const ov = state.overlay;
  if (!ov) return;
  state.overlay = null;
  ov.el.remove();
  atualizarBusy();
  if (!silencioso && ov.onClose) ov.onClose();
}
function confirmar({ titulo, texto, ok = 'Confirmar', cancelar = 'Voltar' }, aoOk, aoCancelar) {
  const o = abrirOverlay(`<div class="window win-confirm"><h3>${titulo}</h3><p>${texto}</p>
    <div class="row"><button class="btn" data-c="n">${cancelar}</button><button class="btn btn-primary" data-c="s">${ok}</button></div></div>`);
  $('[data-c="s"]', o).onclick = () => { fecharOverlay(true); if (aoOk) aoOk(); };
  $('[data-c="n"]', o).onclick = () => { fecharOverlay(true); if (aoCancelar) aoCancelar(); };
}

/* ---- Diálogos (caixa inferior, 1–3 frases) ---- */
function falar({ nome, cor, visual, linhas, aoFinal }) {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const box = $('#dialog');
  state.dialogo = { linhas: linhas.map(fmt), i: 0, aoFinal, digitando: false, timer: null };
  state.busy = true; teclas.clear();
  box.style.setProperty('--c', cor || '#FF2E93');
  $('#dlg-portrait').innerHTML = avatarSVG(visual, true);
  $('#dlg-name').textContent = nome;
  box.hidden = false;
  Som.play('click');
  mostrarLinhaDialogo();
}
function mostrarLinhaDialogo() {
  const d = state.dialogo; if (!d) return;
  const txt = d.linhas[d.i], el = $('#dlg-text'), nx = $('#dlg-next');
  el.textContent = ''; nx.classList.remove('on');
  nx.textContent = d.i === d.linhas.length - 1 ? 'Concluir ▶' : 'Continuar ▶';
  d.digitando = true; let k = 0;
  clearInterval(d.timer);
  d.timer = setInterval(() => {
    k += state.demo ? 4 : 1;
    el.textContent = txt.slice(0, k);
    if (k >= txt.length) { clearInterval(d.timer); d.digitando = false; nx.classList.add('on'); }
  }, 16);
}
function avancarDialogo() {
  const d = state.dialogo; if (!d) return;
  if (d.digitando) {
    clearInterval(d.timer); d.digitando = false;
    $('#dlg-text').textContent = d.linhas[d.i]; $('#dlg-next').classList.add('on'); return;
  }
  if (d.i < d.linhas.length - 1) { d.i++; mostrarLinhaDialogo(); Som.play('click'); }
  else fecharDialogo();
}
function fecharDialogo() {
  const d = state.dialogo; if (!d) return;
  clearInterval(d.timer);
  $('#dialog').hidden = true;
  state.dialogo = null; atualizarBusy();
  if (d.aoFinal) d.aoFinal();
}

/* ============================== 6. GRÁFICOS (SVG) ============================== */
function avatarSVG(o, recorte) {
  const { skin = '#E8B48E', hair = '#2B0B3F', top = '#FF2E93', bottom = '#2B0B3F', estilo = 'long' } = o || {};
  const vb = recorte ? '10 2 40 40' : '0 0 60 100';
  let atras = '';
  if (estilo === 'long') atras = `<path d="M13 30Q12 6 30 6Q48 6 47 30L49 58Q41 63 38 54L22 54Q19 63 11 58Z" fill="${hair}"/>`;
  else if (estilo === 'curly') atras = `<g fill="${hair}"><circle cx="30" cy="12" r="13"/><circle cx="16" cy="22" r="9"/><circle cx="44" cy="22" r="9"/><circle cx="13" cy="34" r="7"/><circle cx="47" cy="34" r="7"/></g>`;
  else atras = `<circle cx="30" cy="7" r="8" fill="${hair}"/>`;
  return `<svg class="avatar" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="30" cy="96" rx="17" ry="4" fill="rgba(0,0,0,.35)"/>
    ${atras}
    <rect class="leg l" x="21" y="68" width="8" height="26" rx="4" fill="${bottom}"/>
    <rect class="leg r" x="31" y="68" width="8" height="26" rx="4" fill="${bottom}"/>
    <ellipse cx="25" cy="94" rx="6" ry="3" fill="#fff" opacity=".92"/><ellipse cx="35" cy="94" rx="6" ry="3" fill="#fff" opacity=".92"/>
    <rect x="9" y="42" width="8" height="27" rx="4" fill="${top}"/><rect x="43" y="42" width="8" height="27" rx="4" fill="${top}"/>
    <circle cx="13" cy="70" r="4" fill="${skin}"/><circle cx="47" cy="70" r="4" fill="${skin}"/>
    <rect x="15" y="40" width="30" height="34" rx="11" fill="${top}"/>
    <rect x="22" y="41" width="16" height="4" rx="2" fill="rgba(255,255,255,.4)"/>
    <rect x="27" y="34" width="6" height="9" fill="${skin}"/>
    <circle cx="30" cy="26" r="14" fill="${skin}"/>
    <path d="M15 26Q15 10 30 10Q45 10 45 26Q38 17 30 18Q22 17 15 26Z" fill="${hair}"/>
    <circle cx="24.5" cy="27" r="1.8" fill="#2B0B3F"/><circle cx="35.5" cy="27" r="1.8" fill="#2B0B3F"/>
    <path d="M26 33Q30 36 34 33" stroke="#2B0B3F" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="31" r="2.2" fill="#FF6FB0" opacity=".35"/><circle cx="39" cy="31" r="2.2" fill="#FF6FB0" opacity=".35"/>
  </svg>`;
}
function mesaSVG() {
  return `<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="42" y="6" width="76" height="52" rx="7" fill="#12061c" style="stroke:var(--c)" stroke-width="2"/>
    <rect x="47" y="11" width="66" height="42" rx="4" fill="#1d0b2c"/>
    <rect x="52" y="17" width="30" height="4" rx="2" style="fill:var(--c)"/>
    <rect x="52" y="26" width="46" height="4" rx="2" fill="#FF6FB0" opacity=".8"/>
    <rect x="58" y="35" width="38" height="4" rx="2" fill="#FFC93C" opacity=".8"/>
    <rect x="52" y="44" width="24" height="4" rx="2" fill="#fff" opacity=".5"/>
    <rect x="73" y="58" width="14" height="12" fill="#2b1340"/><rect x="60" y="68" width="40" height="6" rx="3" fill="#3a1a52"/>
    <rect x="4" y="76" width="152" height="14" rx="6" fill="#6b3a8a"/>
    <rect x="12" y="90" width="136" height="38" rx="5" fill="#40204D"/>
    <rect x="20" y="98" width="52" height="24" rx="4" fill="#2f1340"/><rect x="88" y="98" width="52" height="24" rx="4" fill="#2f1340"/>
    <circle cx="46" cy="110" r="3" style="fill:var(--c)"/><circle cx="114" cy="110" r="3" style="fill:var(--c)"/>
    <rect x="50" y="72" width="60" height="5" rx="2.5" fill="#d9c8e6"/>
    <path d="M130 64h10v12h-10z" fill="#fff"/><path d="M140 66q5 3 0 8" stroke="#fff" fill="none" stroke-width="2"/>
  </svg>`;
}
function muralSVG() {
  return `<svg viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="196" height="126" rx="8" fill="#6b4226"/><rect x="9" y="9" width="182" height="112" rx="5" fill="#c58f58"/>
    <g transform="rotate(-4 50 50)"><rect x="20" y="22" width="56" height="42" rx="2" fill="#FFF8EF"/><rect x="27" y="31" width="30" height="3" fill="#40204D" opacity=".6"/><rect x="27" y="39" width="40" height="3" fill="#40204D" opacity=".4"/><rect x="27" y="47" width="24" height="3" fill="#40204D" opacity=".4"/></g>
    <g transform="rotate(3 120 40)"><rect x="92" y="18" width="48" height="34" rx="2" fill="#FFC93C"/><rect x="99" y="27" width="30" height="3" fill="#40204D" opacity=".6"/><rect x="99" y="35" width="22" height="3" fill="#40204D" opacity=".4"/></g>
    <g transform="rotate(-2 100 90)"><rect x="60" y="70" width="70" height="42" rx="2" fill="#FFF8EF" style="stroke:var(--c)" stroke-width="3"/><rect x="68" y="80" width="40" height="4" style="fill:var(--c)"/><rect x="68" y="90" width="50" height="3" fill="#40204D" opacity=".5"/><rect x="68" y="98" width="30" height="3" fill="#40204D" opacity=".5"/></g>
    <g transform="rotate(5 165 85)"><rect x="145" y="64" width="38" height="44" rx="2" fill="#FF6FB0"/><rect x="151" y="74" width="24" height="3" fill="#fff" opacity=".8"/><rect x="151" y="82" width="18" height="3" fill="#fff" opacity=".6"/></g>
    <circle cx="48" cy="22" r="4" fill="#FF2E93"/><circle cx="116" cy="18" r="4" fill="#FF2E93"/><circle cx="95" cy="70" r="4" fill="#FF2E93"/><circle cx="164" cy="64" r="4" fill="#40204D"/>
  </svg>`;
}
function portaSVG() {
  return `<svg viewBox="0 0 80 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="4" width="68" height="172" rx="6" fill="#1a0a26" stroke="#6b3a8a" stroke-width="4"/>
    <rect x="14" y="12" width="52" height="156" rx="3" fill="#3a1a52"/>
    <rect x="22" y="22" width="36" height="52" rx="3" fill="#2a1040"/><rect x="22" y="84" width="36" height="72" rx="3" fill="#2a1040"/>
    <circle cx="56" cy="96" r="4" fill="#FFC93C"/>
    <rect x="24" y="-2" width="32" height="12" rx="3" fill="#3DDC97"/>
  </svg>`;
}
const logoHTML = (e, cls = '') => `<span class="logo-tile ${cls}" style="--c:${e.cor};--c2:${e.corSec}">${e.sigla}</span>`;

/* ============================== 7. FLUXO: INTRO → PROPOSTAS → MAPA ============================== */
let introTimer = null;

/* Tela inicial → introdução */
function iniciarJogo() {
  resetarPartida();
  fecharOverlay(true);
  $('#intro-avatar').innerHTML = avatarSVG(PLAYER_VISUAL);
  $('#intro-nome-stage').hidden = false;
  $('#intro-story-stage').hidden = true;
  $('#intro-nome-input').value = state.nome || '';
  irParaTela('intro');
  setTimeout(() => { const i = $('#intro-nome-input'); if (i && state.tela === 'intro') i.focus(); }, 80);
}
function confirmarNome() {
  state.nome = $('#intro-nome-input').value.trim().slice(0, 18);
  store.set('nome', state.nome);
  iniciarNarrativa();
}
function pularNome() { state.nome = ''; store.set('nome', ''); iniciarNarrativa(); }

function iniciarNarrativa() {
  $('#intro-nome-stage').hidden = true;
  $('#intro-story-stage').hidden = false;
  $('#intro-go').hidden = true; $('#intro-skip').hidden = false;
  const box = $('#intro-lines'); box.innerHTML = '';
  const nome = state.nome ? `<b>${esc(state.nome)}</b>, v` : 'V';
  const linhas = [
    `${nome}ocê está procurando seu próximo emprego na área de <b>tecnologia</b>.`,
    'Três empresas entraram em contato com você.',
    'Todas oferecem boas oportunidades.',
    'Mas uma boa vaga não significa, necessariamente, um bom ambiente de trabalho.',
    '<b>Investigue antes de decidir.</b>'
  ];
  clearTimeout(introTimer);
  let i = 0;
  const passo = () => {
    if (state.tela !== 'intro') return;
    if (i >= linhas.length) { $('#intro-go').hidden = false; $('#intro-skip').hidden = true; return; }
    box.appendChild(h('p', 'intro-line', linhas[i])); i++;
    introTimer = setTimeout(passo, T(2300));
  };
  passo();
  box._linhas = linhas;
}
function pularIntro() {
  clearTimeout(introTimer);
  const box = $('#intro-lines');
  if (box._linhas) { box.innerHTML = ''; box._linhas.forEach(l => box.appendChild(h('p', 'intro-line', l))); }
  $('#intro-go').hidden = false; $('#intro-skip').hidden = true;
}

/* Cartão de proposta (usado nas propostas e no modal "Reler proposta") */
function cartaoProposta(e, i = 0) {
  return `<article class="offer" data-proposta="${e.id}" style="--c:${e.cor};--i:${i}">
    <div class="offer-top">${logoHTML(e)}<div><h3>${e.nome}</h3><span class="offer-sub">${e.cargo}</span></div></div>
    <div class="offer-sal">${e.salarioTxt}<small> /mês</small></div>
    <ul class="offer-facts"><li>🏠 ${e.modalidade}</li><li>📍 ${e.local}</li></ul>
    <div class="chips">${e.beneficiosCurtos.map(b => `<span class="chip">${b}</span>`).join('')}</div>
    <blockquote class="offer-quote">“${e.slogan}”</blockquote>
  </article>`;
}

/* Etapa 2 — três propostas */
function mostrarPropostas() {
  clearTimeout(introTimer);
  IDS.forEach(id => {
    const e = EMPRESAS[id];
    const n = state.notas[id];
    if (!n.salario.length) n.salario.push(e.salarioTxt + ' por mês (proposta).');
    if (!n.modalidade.length) n.modalidade.push(e.modalidade + ' · ' + e.local + '.');
  });
  $('#offers-grid').innerHTML = IDS.map((id, i) => cartaoProposta(EMPRESAS[id], i)).join('');
  irParaTela('offers');
}
/* Reler proposta (modal) */
function mostrarEmpresa(id) {
  const e = EMPRESAS[id]; if (!e) return;
  abrirOverlay(`<div class="window win-offer">${cartaoProposta(e, 0)}<div class="row center" style="margin-top:14px"><button class="btn btn-primary" data-action="fechar-overlay">Fechar</button></div></div>`);
}

/* Mapa */
function abrirMapa() {
  if (state.dialogo) return;
  fecharOverlay(true);
  renderMapa();
  irParaTela('map');
}
function renderMapa() {
  /* quarteirões decorativos */
  const blocos = $('#map-blocks');
  if (!blocos.children.length) {
    for (let i = 0; i < 34; i++) {
      const b = document.createElement('i');
      b.style.cssText = `left:${Math.random() * 94}%;top:${Math.random() * 90}%;width:${3 + Math.random() * 7}%;height:${4 + Math.random() * 9}%`;
      blocos.appendChild(b);
    }
  }
  const nos = $('#map-nodes'); nos.innerHTML = '';
  Object.entries(MAPA_NOS).forEach(([id, n]) => {
    const b = h('button', 'map-node node-' + id);
    b.dataset.viajar = id; b.style.left = n.x + '%'; b.style.top = n.y + '%';
    b.setAttribute('aria-label', id === 'casa' ? 'Casa — abrir caderno' : (n.nome || EMPRESAS[id].nome));
    const e = EMPRESAS[id];
    let ic = n.ic, nome = n.nome, extra = '';
    if (e) {
      b.style.setProperty('--c', e.cor); ic = logoHTML(e); nome = e.nome;
      const ok = fontesSala(id);
      extra = `<span class="node-dots">${[0, 1, 2].map(k => `<i class="${k < ok ? 'on' : ''}"></i>`).join('')}</span>` +
              (state.visitadas.has(id) ? '<i class="node-visit">✓</i>' : '');
    }
    b.innerHTML = `<span class="node-ic">${ic}</span><span class="node-name">${nome}</span>${extra}`;
    nos.appendChild(b);
  });
  /* ficha lateral */
  const lista = IDS.map(id => {
    const e = EMPRESAS[id], ok = fontesSala(id);
    return `<button class="map-row" data-viajar="${id}" style="--c:${e.cor}">${logoHTML(e, 'sm')}<b>${e.nome}</b><span class="dots3">${[0, 1, 2].map(k => `<i class="${k < ok ? 'on' : ''}"></i>`).join('')}</span></button>`;
  }).join('') +
    `<button class="map-row" data-viajar="paravenus"><span style="font-size:1.4rem">🌐</span><b>ParaVênus</b><small class="muted">consultar</small></button>`;
  $('#map-list').innerHTML = lista;
  $('#map-tip').textContent = '💡 ' + DICAS_MAPA[Math.floor(Math.random() * DICAS_MAPA.length)];
  /* roteiro do modo apresentação */
  const rot = $('#map-roteiro');
  rot.hidden = !state.demo;
  if (state.demo) {
    const passos = [
      ['TechNova', state.visitadas.has('technova')], ['CodeLab', state.visitadas.has('codelab')], ['FutureTech', state.visitadas.has('futuretech')],
      ['ParaVênus', state.pistas.has('technova:site1') || state.pistas.has('codelab:site1') || state.pistas.has('futuretech:site1')],
      ['Comparar no caderno', false], ['Decidir', false]
    ];
    rot.innerHTML = '<b>⚡ Roteiro sugerido (≈ 5 min)</b><ol>' + passos.map(p => `<li class="${p[1] ? 'ok' : ''}">${p[0]}</li>`).join('') + '</ol>';
  }
  /* ficha: token */
  const tok = $('#map-token'), pos = MAPA_NOS[state.mapaPos] || MAPA_NOS.casa;
  tok.innerHTML = avatarSVG(PLAYER_VISUAL, true);
  tok.style.transition = 'none'; tok.style.left = pos.x + '%'; tok.style.top = pos.y + '%';
  void tok.offsetWidth; tok.style.transition = '';
}
function viajarPara(id) {
  if (state.viajando || state.busy || !MAPA_NOS[id]) return;
  if (state.tela !== 'map') return;
  const no = MAPA_NOS[id], tok = $('#map-token');
  state.viajando = true; Som.play('step');
  tok.style.transitionDuration = (state.demo ? 0.2 : 0.85) + 's';
  tok.style.left = no.x + '%'; tok.style.top = no.y + '%';
  setTimeout(() => {
    state.viajando = false;
    if (state.tela !== 'map') return;
    state.mapaPos = id;
    if (id === 'paravenus') abrirParaVenus();
    else if (id === 'casa') abrirCaderno();
    else entrarEmpresa(id);
  }, state.demo ? 260 : 900);
}

/* ============================== 8. EMPRESA: SALA, MOVIMENTO E INTERAÇÕES ============================== */
function objStyle(x, y) { return `left:${x}%;top:${y}%;z-index:${Math.round(y * 10)}`; }

function construirSala(e) {
  const room = h('div', 'room theme-' + e.tema);
  room.id = 'room';
  room.style.setProperty('--c', e.cor); room.style.setProperty('--c2', e.corSec);
  room.innerHTML = `
    <div class="room-wall">
      <div class="room-sign">${logoHTML(e)}<span>${e.nome.toUpperCase()}</span></div>
      <span class="rwin"></span><span class="rwin"></span><span class="rwin"></span>
    </div>
    <div class="room-floor"></div>
    ${(e.decor || []).map(d => `<span class="decor" style="${objStyle(d.x, d.y)};--s:${d.s}">${d.e}</span>`).join('')}
    <button class="obj obj-mural" data-obj="mural" style="${objStyle(74, 40)}" aria-label="Mural">${muralSVG()}<span class="obj-tag">📋 Mural</span><i class="obj-ok">✓</i></button>
    <button class="obj obj-pc" data-obj="pc" style="${objStyle(25, 63)}" aria-label="Computador">${mesaSVG()}<span class="obj-tag">💻 Computador</span><i class="obj-ok">✓</i></button>
    <button class="obj obj-func" data-obj="func" style="${objStyle(54, 82)}" aria-label="Conversar com ${e.func.nome}">${avatarSVG(e.func.visual)}<span class="obj-tag">💬 ${e.func.nome}</span><i class="obj-ok">✓</i></button>
    <button class="obj obj-saida" data-obj="saida" style="${objStyle(8, 62)}" aria-label="Saída">${portaSVG()}<span class="obj-tag">🚪 Saída</span></button>
    <div class="sprite player" id="player">${avatarSVG(PLAYER_VISUAL)}</div>
    <div class="room-prompt" id="room-prompt" hidden></div>
    <div class="room-hint" id="room-hint">Clique nos objetos ou ande com WASD / setas · E para interagir</div>`;
  /* cliques: objeto → andar até ele; chão → andar até o ponto */
  room.addEventListener('click', ev => {
    if (state.busy) return;
    const pr = ev.target.closest('#room-prompt');
    if (pr && state.nearObj) { interagirObjeto(state.nearObj); return; }
    const ob = ev.target.closest('.obj');
    if (ob) { andarAteObjeto(ob.dataset.obj); return; }
    const r = room.getBoundingClientRect();
    if (!r.width) return;
    irPara(clamp((ev.clientX - r.left) / r.width * 100, 3, 97), clamp((ev.clientY - r.top) / r.height * 100, 56, 96));
  });
  return room;
}

/* Entrar na empresa */
function entrarEmpresa(id) {
  const e = EMPRESAS[id]; if (!e) return;
  fecharOverlay(true);
  state.empresaAtual = id; state.mapaPos = id; state.visitadas.add(id);
  Object.assign(state.player, { x: 14, y: 86, tx: null, ty: null, facing: 1, aoChegar: null });
  const wrap = $('#room-wrap'); wrap.innerHTML = '';
  wrap.appendChild(construirSala(e));
  irParaTela('company');
  ajustarSala(); renderJogador(false); marcarObjetosFeitos();
  Som.play('step');
  toast('info', `Você chegou à ${e.nome}`, 'Explore: computador, funcionária e mural. Cada um conta uma parte da história.', state.demo ? 2400 : 4200);
  setTimeout(() => { const hint = $('#room-hint'); if (hint) hint.classList.add('off'); }, state.demo ? 3000 : 7000);
}
function ajustarSala() {
  const r = $('#room'); if (!r) return;
  const w = r.clientWidth || 1000;
  r.style.setProperty('--u', (w / 100) + 'px');
}
function marcarObjetosFeitos() {
  const id = state.empresaAtual; if (!id) return;
  FONTES_SALA.forEach(o => {
    const b = $(`.obj[data-obj="${o}"]`);
    if (b) b.classList.toggle('done', state.pistas.has(id + ':' + o));
  });
}

/* ---- Movimento da personagem ---- */
let rafId = null, ultimoT = 0;
function iniciarLoop() { if (rafId) return; ultimoT = performance.now(); rafId = requestAnimationFrame(loop); }
function pararLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
function loop(t) {
  const dt = Math.min(0.05, (t - ultimoT) / 1000 || 0); ultimoT = t;
  atualizarJogador(dt);
  rafId = requestAnimationFrame(loop);
}
function irPara(x, y, aoChegar) {
  const p = state.player;
  if (state.demo && aoChegar) { p.x = x; p.y = y; p.tx = null; renderJogador(false); detectarProximidade(); aoChegar(); return; }
  p.tx = x; p.ty = y; p.aoChegar = aoChegar || null;
}
function andarAteObjeto(id) {
  const o = OBJETOS[id]; if (!o) return;
  if (state.demo) { state.player.x = o.ix; state.player.y = o.iy; state.player.tx = null; renderJogador(false); setTimeout(() => interagirObjeto(id), 120); return; }
  irPara(o.ix, o.iy, () => interagirObjeto(id));
}
function atualizarJogador(dt) {
  const p = state.player;
  if (!$('#room')) return;
  if (state.busy) { renderJogador(false); return; }
  let vx = 0, vy = 0, mover = false;
  if (teclas.has('left')) vx -= 1; if (teclas.has('right')) vx += 1;
  if (teclas.has('up')) vy -= 1;   if (teclas.has('down')) vy += 1;
  const vel = state.demo ? 950 : 580;         // unidades/s (largura da sala = 1600)
  let chegou = null;
  if (vx || vy) {
    p.tx = null; p.ty = null; p.aoChegar = null;
    const len = Math.hypot(vx, vy), passo = vel * dt / len;
    p.x += vx * passo / 16; p.y += vy * passo / 9; mover = true;
    if (vx) p.facing = Math.sign(vx);
  } else if (p.tx !== null) {
    const dx = (p.tx - p.x) * 16, dy = (p.ty - p.y) * 9, d = Math.hypot(dx, dy), passo = vel * dt;
    if (d <= passo) { p.x = p.tx; p.y = p.ty; p.tx = null; p.ty = null; chegou = p.aoChegar; p.aoChegar = null; }
    else { p.x += dx / d * passo / 16; p.y += dy / d * passo / 9; mover = true; if (Math.abs(dx) > 1) p.facing = Math.sign(dx); }
  }
  p.x = clamp(p.x, 3, 97); p.y = clamp(p.y, 56, 96);
  renderJogador(mover); detectarProximidade();
  if (chegou) chegou();
}
function renderJogador(andando) {
  const el = $('#player'); if (!el) return;
  const p = state.player;
  el.style.left = p.x + '%'; el.style.top = p.y + '%';
  el.style.zIndex = Math.round(p.y * 10) + 1;
  el.style.setProperty('--f', p.facing);
  el.classList.toggle('walking', !!andando);
}
function detectarProximidade() {
  const p = state.player; let melhor = null, dMin = 125;
  Object.entries(OBJETOS).forEach(([id, o]) => {
    const d = Math.hypot((o.ix - p.x) * 16, (o.iy - p.y) * 9);
    if (d < dMin) { dMin = d; melhor = id; }
  });
  state.nearObj = state.busy ? null : melhor;
  $$('.obj').forEach(b => b.classList.toggle('near', b.dataset.obj === state.nearObj));
  const pr = $('#room-prompt'); if (!pr) return;
  if (state.nearObj) {
    const o = OBJETOS[state.nearObj];
    const nome = state.nearObj === 'func' ? `Conversar com ${EMPRESAS[state.empresaAtual].func.nome}` : o.acao;
    const html = `<kbd>E</kbd>${nome}`;
    if (pr.hidden || pr.dataset.k !== state.nearObj) { pr.innerHTML = html; pr.dataset.k = state.nearObj; }
    pr.hidden = false;
  } else { pr.hidden = true; pr.dataset.k = ''; }
}

/* ---- Interações ---- */
function interagirObjeto(id) {
  if (state.busy || state.tela !== 'company') return;
  Som.play('click');
  if (id === 'pc') abrirComputador();
  else if (id === 'func') conversarFuncionario();
  else if (id === 'mural') abrirMural();
  else if (id === 'saida') abrirMapa();
}

/* Registra uma pista, atualiza caderno, mostra notificações */
function obterClue(emp, src) {
  const e = EMPRESAS[emp], v = state.variantes[emp];
  switch (src) {
    case 'pc': return e.pcClue;
    case 'func': return e.func.variantes[v.func].clue;
    case 'mural': return e.mural.variantes[v.mural].clue;
    case 'site1': return e.site.clue1;
    case 'site2': return e.site.clue2;
  }
  return null;
}
function addNota(emp, campo, txt) {
  const arr = state.notas[emp][campo];
  if (arr && !arr.includes(txt)) arr.push(txt);
}
function registrarPista(emp, src) {
  const id = emp + ':' + src;
  if (state.pistas.has(id)) return false;
  const clue = obterClue(emp, src); if (!clue) return false;
  state.pistas.add(id);
  Object.entries(clue.fields || {}).forEach(([campo, txt]) => addNota(emp, campo, txt));
  toast('pista', 'PISTA DESCOBERTA', clue.resumo || Object.values(clue.fields)[0]);
  Som.play('pista');
  if (clue.flag) {
    state.flags.push({ emp, src, tipo: clue.flag.tipo, texto: clue.flag.texto });
    setTimeout(() => {
      toast(clue.flag.tipo, clue.flag.tipo === 'red' ? 'RED FLAG' : 'GREEN FLAG', clue.flag.texto);
      Som.play(clue.flag.tipo);
    }, state.demo ? 350 : 800);
  }
  atualizarHud(); marcarObjetosFeitos();
  return true;
}

/* 💻 Computador: vaga completa */
function abrirComputador() {
  const id = state.empresaAtual, e = EMPRESAS[id], v = e.vaga;
  const feito = state.pistas.has(id + ':pc');
  const o = abrirOverlay(`<div class="window" style="--c:${e.cor}">
    <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">🔒 carreiras.${e.dominio}/vaga</span><button class="win-x" data-action="fechar-overlay" aria-label="Fechar">✕</button></div>
    <div class="job" style="--c:${e.cor}">
      <div class="job-head">${logoHTML(e)}<div><div class="co">${e.nome}</div><h2>${e.cargo}</h2></div><span class="job-badge">VAGA ABERTA</span></div>
      <div class="stamp ${feito ? 'on' : ''}" id="stamp">✔ ANOTADO NO CADERNO</div>
      <div class="facts">
        <div class="fact" style="--i:1"><small>💰 Salário</small><b>${e.salarioTxt} / mês</b></div>
        <div class="fact" style="--i:2"><small>🏠 Modalidade</small><b>${e.modalidade}</b></div>
        <div class="fact" style="--i:3"><small>🕗 Horário</small><b>${v.horario}</b></div>
        <div class="fact" style="--i:4"><small>📍 Local</small><b>${e.local}</b></div>
        <div class="fact" style="--i:5"><small>🎁 Benefícios</small><b>${v.beneficios}</b></div>
        <div class="fact" style="--i:6"><small>🧰 Tecnologias</small><b>${v.stack}</b></div>
      </div>
      <p class="desc">${v.descricao}</p>
      <div class="job-quote"><small>A empresa diz</small>“${e.slogan}”</div>
      <div class="win-foot"><button class="btn btn-primary" data-action="fechar-overlay">Fechar computador</button></div>
    </div></div>`);
  setTimeout(() => {
    if (!state.overlay || state.overlay.el !== o) { registrarPista(id, 'pc'); return; }
    registrarPista(id, 'pc');
    const s = $('#stamp', o); if (s) s.classList.add('on');
  }, T(1100));
}

/* 💬 Funcionária */
function conversarFuncionario() {
  const id = state.empresaAtual, e = EMPRESAS[id], f = e.func;
  const feito = state.pistas.has(id + ':func');
  const variante = f.variantes[state.variantes[id].func];
  falar({
    nome: `${f.nome} · ${f.cargo}`, cor: e.cor, visual: f.visual,
    linhas: feito ? ['Já te contei o essencial{v}. Boa sorte na decisão!'] : variante.falas,
    aoFinal: () => { if (!feito) registrarPista(id, 'func'); marcarObjetosFeitos(); }
  });
}

/* 📋 Mural */
function abrirMural() {
  const id = state.empresaAtual, e = EMPRESAS[id];
  const mv = e.mural.variantes[state.variantes[id].mural];
  const papeis = shuffle([{ ...mv.chave, chave: true }, ...e.mural.decoys.map(d => ({ ...d }))]);
  const rots = [-3, 2, -1.5, 3];
  const html = papeis.map((p, i) => `<button class="paper ${p.chave ? 'key' : ''} ${p.chave && state.pistas.has(id + ':mural') ? 'done' : ''}" data-paper="${i}" style="--rot:${rots[i % rots.length]}deg">
      <h4>${p.titulo}</h4>${p.linhas.map(l => `<p>${l}</p>`).join('')}</button>`).join('');
  const o = abrirOverlay(`<div class="window" style="--c:${e.cor}">
    <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">📋 Mural — ${e.nome}</span><button class="win-x" data-action="fechar-overlay" aria-label="Fechar">✕</button></div>
    <div class="mural-body"><div class="board">${html}</div>
      <div class="board-caption" id="board-caption">Há algo no quadro que merece atenção. Clique nos papéis para ler.</div>
      <div class="win-foot"><button class="btn btn-primary" data-action="fechar-overlay">Fechar mural</button></div></div></div>`);
  const cap = $('#board-caption', o);
  const clicar = btn => {
    const p = papeis[+btn.dataset.paper];
    if (p.chave) {
      const novo = registrarPista(id, 'mural');
      btn.classList.add('done');
      cap.textContent = novo ? '🔎 Você anotou no caderno: ' + mv.clue.resumo : '✔ Já anotado: ' + mv.clue.resumo;
    } else cap.textContent = '📝 ' + p.nota;
    Som.play('click');
  };
  o.addEventListener('click', ev => { const b = ev.target.closest('.paper'); if (b) clicar(b); });
  if (state.demo && !state.pistas.has(id + ':mural')) {
    setTimeout(() => { if (state.overlay && state.overlay.el === o) { const k = $('.paper.key', o); if (k) clicar(k); } }, 950);
  }
}

/* ============================== 9. PARAVÊNUS E CADERNO ============================== */
const estrelas = n => `<span class="stars" style="--p:${(n / 5 * 100).toFixed(0)}%">★★★★★</span>`;

function abrirParaVenus(emp) {
  if (state.dialogo) return;
  abrirOverlay(`<div class="window win-site">
    <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">🔒 paravenus.app</span><button class="win-x" data-action="fechar-overlay" aria-label="Fechar">✕</button></div>
    <div class="site" id="site-body"></div></div>`);
  renderSite(emp || null);
}
function siteHomeHTML() {
  return `<div class="site-head"><div class="site-logo"><i>♀</i>PARA<span>VÊNUS</span></div><nav><span>Vagas</span><span>Empresas</span><span>Avaliações</span></nav></div>
    <section class="site-hero">
      <h2>Descubra como é trabalhar lá <em>antes</em> de aceitar a vaga.</h2>
      <form class="site-search" id="site-form" autocomplete="off"><input id="site-q" type="text" placeholder="Buscar empresa..." aria-label="Buscar empresa"><button class="btn btn-primary" type="submit">Buscar</button></form>
      <div class="site-msg" id="site-msg"></div>
      <div class="site-sug"><small>Empresas com propostas para você</small>
        ${IDS.map(id => `<button class="sug" data-site-emp="${id}" data-nome="${EMPRESAS[id].nome}">${logoHTML(EMPRESAS[id], 'sm')}${EMPRESAS[id].nome}</button>`).join('')}
      </div>
    </section>
    <section class="site-pillars">
      <div class="pillar"><span>⭐</span><b>Avaliações de funcionárias</b><p>Experiências reais, positivas e negativas.</p></div>
      <div class="pillar"><span>👩</span><b>Mulheres na liderança</b><p>Quantas chegam lá — e como crescem.</p></div>
      <div class="pillar"><span>🚩</span><b>Denúncias e histórico</b><p>Informação para escolher melhor.</p></div>
    </section>`;
}
function siteEmpresaHTML(id) {
  const e = EMPRESAS[id], s = e.site, v = s.verificados;
  const lib = siteDesbloqueado(id), novo = lib && !state.pistas.has(id + ':site2');
  const revs = state.comentarios[id].map(c => `<article class="rev ${c.tipo}"><div class="rev-top"><b>${esc(c.a)}</b><span>${c.tipo === 'pos' ? '👍 Positivo' : '⚠️ Ponto de atenção'}</span></div><p>“${esc(c.t)}”</p></article>`).join('');
  const barra = (n) => `<div class="bar"><i style="--w:${n}%"></i></div>`;
  const verif = lib
    ? `<div class="verif ${novo ? 'novo' : ''}">
        <div class="vstat"><span>👩 Mulheres em liderança</span><b>${v.lideranca}%</b>${barra(v.lideranca)}</div>
        <div class="vstat"><span>🚩 Denúncias</span><b>${v.denuncias}</b></div>
        <div class="vstat"><span>🔁 Rotatividade</span><b>${v.rotatividade}</b></div>
        <div class="vstat"><span>😊 Recomendariam</span><b>${v.satisfacao}%</b>${barra(v.satisfacao)}<small>base: ${v.amostra}</small></div>
      </div>`
    : `<div class="verif locked">
        <div class="vstat"><span>👩 Mulheres em liderança</span><b>██%</b></div><div class="vstat"><span>🚩 Denúncias</span><b>█████</b></div>
        <div class="vstat"><span>🔁 Rotatividade</span><b>█████</b></div><div class="vstat"><span>😊 Recomendariam</span><b>██%</b></div>
        <div class="lock-msg"><div class="lk">🔒</div><b>Dados verificados bloqueados</b>
          <p>O ParaVênus cruza avaliações com o que acontece lá dentro. Investigue a empresa para desbloquear.</p>
          <span>Interações na empresa: ${fontesSala(id)}/2</span></div>
      </div>`;
  return `<div class="site-head"><div class="site-logo"><i>♀</i>PARA<span>VÊNUS</span></div><nav><span>Vagas</span><span>Empresas</span><span>Avaliações</span></nav></div>
    <div class="site-co" style="--c:${e.cor}">
      <button class="back-link" data-site-home>← Nova busca</button>
      <div class="co-head">${logoHTML(e)}<div><h2>${e.nome}</h2><div class="rating">${estrelas(s.nota)}<b>${String(s.nota).replace('.', ',')}</b><span class="muted" style="color:#9a7aa6">/ 5 · ${s.avaliacoes} avaliações</span></div></div></div>
      <div class="co-facts"><span class="cf">🏠 Trabalho remoto: ${s.remoto}</span><span class="cf">📈 Programa de mentoria: ${s.mentoria}</span><span class="cf">💼 ${e.cargo}</span></div>
      <h3>O que dizem as funcionárias</h3><div class="revs">${revs}</div>
      <h3>Dados verificados pelo ParaVênus ${novo ? '<span class="new-tag">NOVO</span>' : ''}</h3>${verif}
    </div>`;
}
function renderSite(emp) {
  const body = $('#site-body'); if (!body) return;
  body.innerHTML = emp ? siteEmpresaHTML(emp) : siteHomeHTML();
  const win = $('.win-site'); if (win) win.scrollTop = 0;
  if (emp) {
    setTimeout(() => registrarPista(emp, 'site1'), T(800));
    if (siteDesbloqueado(emp)) setTimeout(() => registrarPista(emp, 'site2'), T(1500));
  } else {
    const form = $('#site-form'), q = $('#site-q');
    if (form) form.addEventListener('submit', ev => { ev.preventDefault(); buscarSite(q.value); });
    if (q) {
      q.addEventListener('input', () => {
        const n = norm(q.value);
        $$('.sug', body).forEach(b => b.classList.toggle('dim', !!n && !norm(b.dataset.nome).includes(n)));
        $('#site-msg').textContent = '';
      });
      setTimeout(() => q.focus(), 60);
    }
  }
}
function buscarSite(txt) {
  const n = norm(txt), msg = $('#site-msg');
  if (!n) { msg.textContent = 'Digite o nome de uma empresa (ou clique em uma sugestão).'; return; }
  const achou = IDS.find(id => norm(EMPRESAS[id].nome).includes(n) || n.includes(norm(EMPRESAS[id].nome)));
  if (achou) renderSite(achou);
  else msg.textContent = `Nenhuma empresa encontrada para “${txt}”. Tente TechNova, CodeLab ou FutureTech.`;
}

/* 📓 Caderno de Investigação */
function abrirCaderno(aba) {
  if (state.dialogo) return;
  const atual = aba || state.empresaAtual || IDS[0];
  const tabs = IDS.map(id => `<button class="note-tab" data-note-tab="${id}" style="--c:${EMPRESAS[id].cor}">${EMPRESAS[id].nome}</button>`).join('') +
    '<button class="note-tab" data-note-tab="comparar" style="--c:#FFC93C">⚖️ Comparar</button>';
  abrirOverlay(`<div class="window win-note">
    <div class="note-head"><h2>📓 Caderno de Investigação<small>${state.nome ? 'de ' + esc(state.nome) + ' · ' : ''}só aparece o que você descobriu</small></h2><button class="win-x" data-action="fechar-overlay" aria-label="Fechar">✕</button></div>
    <div class="note-tabs">${tabs}</div><div class="note-body" id="note-body"></div></div>`);
  renderCaderno(atual);
}
function renderCaderno(aba) {
  const body = $('#note-body'); if (!body) return;
  $$('.note-tab').forEach(t => t.classList.toggle('on', t.dataset.noteTab === aba));
  if (aba === 'comparar') { body.innerHTML = cadernoComparar(); return; }
  const e = EMPRESAS[aba];
  const fontes = FONTES.map(f => `<span class="src ${state.pistas.has(aba + ':' + f.id) ? 'on' : ''}">${f.ic} ${f.nome}</span>`).join('');
  const campos = CAMPOS.map(c => {
    const n = state.notas[aba][c.id];
    return `<div class="nfield"><h4>${c.ic} ${c.nome}</h4>${n.length ? '<ul>' + n.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<span class="unk">???</span>'}</div>`;
  }).join('');
  const fl = state.flags.filter(f => f.emp === aba);
  const flags = fl.length ? fl.map(f => `<div class="flag ${f.tipo}">${f.tipo === 'red' ? '🚩' : '🟢'} ${esc(f.texto)}</div>`).join('') : '<span class="flag-none">Nenhum sinal anotado ainda.</span>';
  body.innerHTML = `<div class="note-emp" style="--c:${e.cor}">${logoHTML(e)}<div><h3>${e.nome}</h3><small>${e.cargo}</small></div><button class="btn" data-proposta="${aba}">📄 Ver proposta</button></div>
    <div class="note-sources">${fontes}</div><div class="note-grid">${campos}</div>
    <div class="note-flags"><h4>Sinais encontrados</h4>${flags}</div>`;
}
function cadernoComparar() {
  const cab = IDS.map(id => `<th style="--c:${EMPRESAS[id].cor}">${EMPRESAS[id].nome}</th>`).join('');
  const linhas = CAMPOS.map(c => `<tr><th>${c.ic} ${c.nome}</th>${IDS.map(id => {
    const n = state.notas[id][c.id];
    return `<td>${n.length ? '<ul>' + n.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<span class="unk">???</span>'}</td>`;
  }).join('')}</tr>`).join('');
  const flags = `<tr><th>🚩 / 🟢 Sinais</th>${IDS.map(id => {
    const fl = state.flags.filter(f => f.emp === id);
    return `<td>${fl.length ? fl.map(f => `<span class="mini ${f.tipo}">${f.tipo === 'red' ? '🚩' : '🟢'} ${esc(f.texto)}</span>`).join('') : '<span class="flag-none">—</span>'}</td>`;
  }).join('')}</tr>`;
  const fontes = `<tr><th>🔎 Fontes</th>${IDS.map(id => `<td>${fontesFeitas(id)} de ${FONTES.length}</td>`).join('')}</tr>`;
  return `<table class="cmp"><thead><tr><th></th>${cab}</tr></thead><tbody>${linhas}${flags}${fontes}</tbody></table>`;
}

/* ============================== 10. DECISÃO, FINAIS E ESTATÍSTICAS ============================== */
function pedirDecisao() {
  if (state.busy) return;
  const vis = state.visitadas.size;
  if (vis < IDS.length) {
    confirmar({
      titulo: 'Ainda há empresas por visitar',
      texto: `Você visitou ${vis} de ${IDS.length} empresas. Quer decidir mesmo assim?`,
      ok: 'Decidir agora', cancelar: 'Continuar investigando'
    }, abrirDecisao);
  } else abrirDecisao();
}
function abrirDecisao() {
  fecharOverlay(true);
  const cards = IDS.map((id, i) => {
    const e = EMPRESAS[id], n = fontesFeitas(id);
    return `<button class="dec-card" data-escolha="${id}" style="--c:${e.cor};--i:${i}">
      <div class="dec-top">${logoHTML(e)}<div><h3>${e.nome}</h3><span>${e.cargo}</span></div></div>
      <ul><li>💰 ${e.salarioTxt}</li><li>🏠 ${e.modalidade}</li></ul>
      <div class="dec-src"><span class="dots3" style="--c:${e.cor}">${FONTES.map((f, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span>${n}/${FONTES.length} fontes consultadas</div>
      <span class="dec-cta">Aceitar esta proposta</span></button>`;
  }).join('') + `<button class="dec-card dec-continue" data-escolha="continuar" style="--i:3"><span class="big">🔎</span><h3>Continuar procurando</h3><p>Nenhuma delas combina comigo — por enquanto.</p><span class="dec-cta">Recusar as três</span></button>`;
  $('#decision-grid').innerHTML = cards;
  irParaTela('decision');
}
function tomarDecisao(escolha) {
  if (state.busy) return;
  const cont = escolha === 'continuar';
  const e = EMPRESAS[escolha];
  confirmar({
    titulo: cont ? 'Continuar procurando?' : `Aceitar a proposta da ${e.nome}?`,
    texto: cont ? 'Você recusa as três propostas e segue sua busca.' : 'Esta será a sua decisão final.',
    ok: cont ? 'Sim, continuar' : 'Aceitar', cancelar: 'Voltar'
  }, () => { state.escolha = escolha; mostrarFinal(avaliarDecisao(escolha)); });
}

/* Placar OCULTO: converte a investigação em um final */
function avaliarDecisao(escolha) {
  const inv = calcInvestigacao();
  const r = { escolha, inv, final: 2, rfs: 0, gfs: 0, naoVistas: 0, pelaSalario: false };
  if (escolha === 'continuar') { r.final = 4; return r; }
  r.rfs = contarFlags('red', escolha);
  r.gfs = contarFlags('green', escolha);
  r.naoVistas = FONTES.filter(f => !state.pistas.has(escolha + ':' + f.id)).length;
  const maxSal = Math.max(...IDS.map(id => EMPRESAS[id].salario));
  r.pelaSalario = EMPRESAS[escolha].salario === maxSal && inv < LIMITE_FINAL_EXCELENTE;
  if ((r.rfs >= 2 && r.rfs > r.gfs) || r.pelaSalario) r.final = 3;
  else if (inv >= LIMITE_FINAL_EXCELENTE && r.gfs > r.rfs) r.final = 1;
  else r.final = 2;
  return r;
}

function mostrarFinal(r) {
  state.final = r.final; state.resultado = r;
  const vistos = new Set(store.get('finais', [])); vistos.add(r.final); store.set('finais', [...vistos]);
  const f = FINAIS[r.final];
  let linhas = f.linhas;
  if (r.final === 2) {
    linhas = r.naoVistas > 0
      ? ['Você encontrou bons sinais, mas algumas pistas importantes ficaram para trás.', 'Antes de assinar, vale conferir o que ainda não foi investigado.']
      : ['Você escolheu sabendo dos pontos de atenção.', 'Nenhuma empresa é perfeita — o importante é saber o que você está aceitando.'];
  }
  let epi;
  if (r.final === 4) epi = 'Enquanto isso, o caderno continua aberto. A próxima proposta vai encontrar uma candidata ainda mais preparada.';
  else { const ep = EMPRESAS[r.escolha].epilogo; epi = ep[r.final === 1 ? 'bom' : r.final === 3 ? 'alerta' : 'medio'] || ep.medio; }
  /* red flags que o caderno já mostrava */
  let ignoradas = '';
  if ((r.final === 3 || r.final === 2) && r.escolha !== 'continuar') {
    const rf = state.flags.filter(x => x.emp === r.escolha && x.tipo === 'red');
    if (rf.length) ignoradas = `<p class="end-epi" style="font-style:normal">O caderno já apontava:</p><div class="end-flags">${rf.map(x => `<span class="pill-flag red">🚩 ${esc(x.texto)}</span>`).join('')}</div>`;
  }
  $('#ending-box').innerHTML = `<div class="${f.cls}" style="display:contents">
    <div class="end-ic">${f.ic}</div>
    <div class="end-num">${state.nome ? esc(state.nome) + ' · ' : ''}Final ${r.final} de 4</div>
    <h2 class="end-title">${f.titulo}</h2>
    <div class="end-badge ${f.cls}">${f.badge}</div>
    <div class="end-lines">${linhas.map((l, i) => `<p style="--i:${i}">${l}</p>`).join('')}</div>
    <p class="end-epi">${epi}</p>${ignoradas}
    <div class="row center" style="margin-top:10px"><button class="btn btn-primary btn-xl" data-action="ver-estatisticas">VER ESTATÍSTICAS ▶</button></div></div>`;
  irParaTela('ending');
  Som.play(r.final === 1 ? 'final-bom' : r.final === 3 ? 'final-alerta' : 'final-neutro');
}

function contar(el, alvo, ms = 900) {
  const t0 = performance.now();
  const passo = t => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
function mostrarEstatisticas() {
  const inv = calcInvestigacao(), nivel = nivelInvestigacao(inv);
  const finais = store.get('finais', []).length;
  const visitadas = state.visitadas.size;
  const siteVisto = IDS.some(id => state.pistas.has(id + ':site1'));
  const retro = IDS.map(id => {
    const e = EMPRESAS[id], fl = state.flags.filter(f => f.emp === id);
    return `<div class="retro-card" style="--c:${e.cor}"><h4>${logoHTML(e, 'sm')}${e.nome}</h4>
      <div class="end-flags">${fl.length ? fl.map(f => `<span class="pill-flag ${f.tipo}">${f.tipo === 'red' ? '🚩' : '🟢'} ${esc(f.texto)}</span>`).join('') : '<span class="muted">Nenhum sinal encontrado.</span>'}</div></div>`;
  }).join('');
  $('#stats-box').innerHTML = `
    <h2 class="end-title" style="font-size:clamp(1.6rem,4vw,2.4rem)">Sua investigação</h2>
    <div class="stats-grid">
      <div class="stat" style="--i:0"><span>🔎 Pistas encontradas</span><b><em data-n="${state.pistas.size}">0</em><small>/${TOTAL_PISTAS}</small></b></div>
      <div class="stat" style="--i:1"><span>🚩 Red flags encontradas</span><b><em data-n="${contarFlags('red')}">0</em></b></div>
      <div class="stat" style="--i:2"><span>🟢 Green flags encontradas</span><b><em data-n="${contarFlags('green')}">0</em></b></div>
      <div class="stat" style="--i:3"><span>🏢 Empresas investigadas</span><b><em data-n="${visitadas}">0</em><small>/${IDS.length}</small></b></div>
      <div class="stat" style="--i:4"><span>🌐 ParaVênus consultado</span><b>${siteVisto ? 'Sim' : 'Não'}</b></div>
      <div class="stat" style="--i:5"><span>📖 Nível de investigação</span><b><span class="level ${nivel.cls}">${nivel.txt}</span></b></div>
    </div>
    <p class="muted">Finais descobertos: <b>${finais}/4</b> — jogue de novo: cada partida muda as pistas.</p>
    <div class="retro">${retro}</div>
    <div class="closing">
      <p>Uma vaga pode parecer perfeita no papel.<br>Mas quem trabalha nela conhece a realidade.<br><b>Pesquise antes de escolher.</b></p>
      <div class="tag">PARA<span>VÊNUS</span></div><div class="tag-s">Informação para escolher melhor.</div>
    </div>
    <div class="row center"><button class="btn btn-primary btn-xl" data-action="jogar-novamente">JOGAR NOVAMENTE</button><button class="btn" data-action="menu">VOLTAR AO MENU</button></div>`;
  irParaTela('stats');
  $$('#stats-box [data-n]').forEach(el => contar(el, +el.dataset.n));
}

/* Recomeçar */
function reiniciarJogo() {
  fecharOverlay(true);
  if (state.dialogo) { clearInterval(state.dialogo.timer); $('#dialog').hidden = true; state.dialogo = null; }
  atualizarBusy();
  resetarPartida();
  mostrarPropostas();
}
function voltarMenu() {
  fecharOverlay(true);
  if (state.dialogo) { clearInterval(state.dialogo.timer); $('#dialog').hidden = true; state.dialogo = null; }
  atualizarBusy();
  clearTimeout(introTimer);
  resetarPartida();
  irParaTela('title');
}

/* ============================== 11. EVENTOS E INICIALIZAÇÃO ============================== */
const ACOES = {
  'comecar': iniciarJogo,
  'como-jogar': () => irParaTela('howto'),
  'creditos': () => irParaTela('credits'),
  'menu': voltarMenu,
  'intro-nome-ok': confirmarNome,
  'intro-nome-pular': pularNome,
  'intro-pular': pularIntro,
  'intro-ir': mostrarPropostas,
  'ir-mapa': abrirMapa,
  'fechar-overlay': () => fecharOverlay(),
  'caderno': () => abrirCaderno(),
  'paravenus': () => abrirParaVenus(),
  'alternar-som': () => setSom(!state.som),
  'alternar-demo': () => setDemo(!state.demo),
  'decidir': pedirDecisao,
  'ver-estatisticas': mostrarEstatisticas,
  'jogar-novamente': reiniciarJogo
};

function registrarEventos() {
  document.addEventListener('click', e => {
    Som.init();
    const t = e.target;
    const a = t.closest('[data-action]');
    if (a && ACOES[a.dataset.action]) { Som.play('click'); ACOES[a.dataset.action](a, e); return; }
    const v = t.closest('[data-viajar]');         if (v) { Som.play('click'); viajarPara(v.dataset.viajar); return; }
    const se = t.closest('[data-site-emp]');      if (se) { Som.play('click'); renderSite(se.dataset.siteEmp); return; }
    if (t.closest('[data-site-home]'))            { Som.play('click'); renderSite(null); return; }
    const nt = t.closest('[data-note-tab]');      if (nt) { Som.play('click'); renderCaderno(nt.dataset.noteTab); return; }
    const es = t.closest('[data-escolha]');       if (es) { Som.play('click'); tomarDecisao(es.dataset.escolha); return; }
    const pr = t.closest('[data-proposta]');      if (pr && !t.closest('#room')) { Som.play('click'); mostrarEmpresa(pr.dataset.proposta); return; }
  });
  $('#dialog').addEventListener('click', avancarDialogo);
  $('#intro-nome-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmarNome(); } });

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (state.dialogo) {
      if (['enter', ' ', 'e', 'spacebar'].includes(k)) { e.preventDefault(); avancarDialogo(); }
      return;
    }
    if (e.key === 'Escape') {
      if (state.overlay) { if (!state.overlay.bloquear) fecharOverlay(); }
      else if (['howto', 'credits'].includes(state.tela)) irParaTela('title');
      return;
    }
    const alvo = e.target, digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA');
    if (digitando || e.ctrlKey || e.metaKey || e.altKey) return;
    if (state.tela === 'company' && !state.busy) {
      const dir = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' }[k];
      if (dir) { teclas.add(dir); e.preventDefault(); return; }
      if (k === 'e' || k === 'enter' || k === ' ') { if (state.nearObj) { e.preventDefault(); interagirObjeto(state.nearObj); } return; }
    }
    if (!state.busy && ['map', 'company', 'decision'].includes(state.tela)) {
      if (k === 'n') abrirCaderno();
      else if (k === 'p') abrirParaVenus();
      else if (k === 'm' && state.tela !== 'map') abrirMapa();
    }
  });
  document.addEventListener('keyup', e => {
    const dir = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' }[e.key.toLowerCase()];
    if (dir) teclas.delete(dir);
  });
  window.addEventListener('blur', () => teclas.clear());
  window.addEventListener('resize', ajustarSala);

  /* créditos editáveis (salvos no navegador) */
  const campos = { 'cred-alunos': 'alunos', 'cred-turma': 'turma', 'cred-inst': 'inst', 'cred-prof': 'prof' };
  const salvos = store.get('creditos', {});
  Object.entries(campos).forEach(([id, k]) => {
    const el = $('#' + id); if (!el) return;
    el.value = salvos[k] || '';
    el.addEventListener('input', () => { const c = store.get('creditos', {}); c[k] = el.value; store.set('creditos', c); });
  });
}

function init() {
  state.demo = !!store.get('demo', false);
  state.som = store.get('som', true) !== false;
  state.nome = store.get('nome', '') || '';
  resetarPartida();
  registrarEventos();
  atualizarRotulos();
  irParaTela('title');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/* Exposto para depuração/testes no console: window.PV */
window.PV = {
  state, EMPRESAS, iniciarJogo, mostrarPropostas, mostrarEmpresa, abrirMapa, entrarEmpresa, interagirObjeto, abrirComputador, conversarFuncionario,
  abrirMural, registrarPista, abrirCaderno, abrirParaVenus, renderSite, tomarDecisao, avaliarDecisao, mostrarFinal, mostrarEstatisticas,
  reiniciarJogo, avancarDialogo, fecharOverlay, setDemo, setSom, pedirDecisao, abrirDecisao, viajarPara
};
