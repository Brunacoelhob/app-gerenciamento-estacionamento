/**
 * Página "Sobre" — seções "Missão, Visão e Valores", "Contas e Papéis de
 * Acesso", "Recursos de Acessibilidade", "Regras de Negócio" e "Tecnologia
 * por trás do sistema".
 *
 * As cinco listas (antes blocos fixos de texto) viraram grades de cards
 * clicáveis (.card-sobre — ver assets/scss/_components.scss), um card por
 * categoria/papel/recurso/pilar/peça de tecnologia. Cada card abre um modal
 * (SweetAlert2) com o detalhamento, onde todo item carrega uma etiqueta
 * colorida de "tipo" — a mesma legenda em todos os cards de uma seção, pra
 * criar um único sistema de leitura em vez de cada card inventar sua
 * própria cor.
 *
 * As cinco seções têm a mesma estrutura de dados (array de
 * {id, icone, variante, titulo, resumo, itens: [{tipo, texto}]}), então
 * renderizarGradeCards/abrirModalDetalhe (logo abaixo) fazem o trabalho das
 * cinco de uma vez — só o conteúdo de cada seção muda.
 */

// Mesmas cores das variantes .card-sobre.kpi-* de assets/scss/_components.scss
// (fonte única: o mapa $variantes-kpi em _variables.scss). O cabeçalho do
// modal (fora do card) monta o ícone colorido via estilo inline, sem como
// herdar a custom property CSS do card que foi clicado — por isso lê os
// valores das custom properties --variant-*-* publicadas em :root
// (assets/scss/main.scss) em vez de manter uma cópia hardcoded da paleta.
function corVariante (variante) {
  const nome = variante.replace('kpi-', '')
  const estilo = getComputedStyle(document.documentElement)
  const grad1 = estilo.getPropertyValue(`--variant-${nome}-grad-1`).trim()
  const grad2 = estilo.getPropertyValue(`--variant-${nome}-grad-2`).trim()
  const accent = estilo.getPropertyValue(`--variant-${nome}-accent`).trim()
  return { fundo: `linear-gradient(135deg, ${grad1} 0%, ${grad2} 100%)`, cor: accent }
}

// Renderiza uma grade de cards .card-sobre dentro de `containerId` e liga
// clique/teclado (Enter/Espaço) pra abrir o detalhe de cada um. `kicker` é o
// rótulo pequeno acima do título (ex.: "Regra de Negócio"); `aoAbrirDetalhe`
// recebe o item inteiro (já resolvido, sem precisar buscar de novo por id).
function renderizarGradeCards (containerId, dados, atributoDado, kicker, aoAbrirDetalhe) {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = dados.map(item => `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="card-sobre ${item.variante} h-100" role="button" tabindex="0"
        data-${atributoDado}="${item.id}" aria-haspopup="dialog" title="Clique para ver o detalhamento">
        <div class="card-sobre-icon"><i class="fas ${item.icone}" aria-hidden="true"></i></div>
        <span class="card-sobre-kicker">${kicker}</span>
        <h3 class="card-sobre-title">${item.titulo}</h3>
        <p class="card-sobre-desc">${item.resumo}</p>
        <span class="card-sobre-cta">Ver detalhes <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
      </div>
    </div>
  `).join('')

  container.querySelectorAll(`.card-sobre[data-${atributoDado}]`).forEach(card => {
    const item = dados.find(d => d.id === card.dataset[atributoDado])
    if (!item) return
    card.addEventListener('click', () => aoAbrirDetalhe(item))
    card.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault()
        aoAbrirDetalhe(item)
      }
    })
  })

  if (typeof animarEntradaEmCascata === 'function') {
    animarEntradaEmCascata(container.children)
  }
}

// Modal de detalhe genérico: `tiposMap` é a legenda de cores da seção
// (TIPOS_REGRA, TIPOS_ACESSO etc.) usada pra rotular cada item.
function abrirModalDetalhe (item, tiposMap) {
  if (typeof Swal === 'undefined' || !item) return

  const cores = corVariante(item.variante)

  const itensHtml = item.itens.map(sub => {
    const tipo = tiposMap[sub.tipo]
    return `
      <div class="item-regra">
        <span class="tag-tipo-regra ${tipo.badge}">
          <i class="fas ${tipo.icone}" aria-hidden="true"></i>${tipo.label}
        </span>
        <span>${sub.texto}</span>
      </div>
    `
  }).join('')

  Swal.fire({
    width: '700px',
    showCloseButton: true,
    confirmButtonText: 'Fechar',
    html: `
      <div class="text-start">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div style="width:3rem;height:3rem;border-radius:1rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.35rem;background:${cores.fundo};color:${cores.cor};">
            <i class="fas ${item.icone}" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="h5 fw-bold mb-0">${item.titulo}</h2>
            <p class="text-muted text-xs mb-0">${item.resumo}</p>
          </div>
        </div>
        ${itensHtml}
      </div>
    `
  })
}

/* --------------------------------------------------------------------------
   MISSÃO, VISÃO E VALORES
   -------------------------------------------------------------------------- */

const TIPOS_PILAR = {
  missao: { label: 'Missão', icone: 'fa-bullseye', badge: 'bg-primary text-white' },
  visao: { label: 'Visão', icone: 'fa-binoculars', badge: 'bg-info text-dark' },
  'bem-estar': { label: 'Bem-estar', icone: 'fa-heart', badge: 'bg-success text-white' },
  equidade: { label: 'Equidade', icone: 'fa-scale-balanced', badge: 'bg-warning text-dark' },
  colaboracao: { label: 'Colaboração', icone: 'fa-people-arrows', badge: 'bg-secondary text-white' },
  transparencia: { label: 'Transparência', icone: 'fa-eye', badge: 'bg-danger text-white' }
}

// Mesmo conteúdo que estava fixo na página — Missão e Visão viram cards de
// um item só; os 8 valores (antes uma lista única) ganham cada um o pilar a
// que pertencem (ver TIPOS_PILAR), dentro do card "Valores".
const MISSAO_VISAO_VALORES = [
  {
    id: 'missao',
    icone: 'fa-bullseye',
    variante: 'kpi-primary',
    titulo: 'Missão',
    resumo: 'Por que o ParkGestão existe.',
    itens: [
      { tipo: 'missao', texto: 'Melhorar a qualidade de vida de quem usa e de quem trabalha no estacionamento, simplificando o controle de vagas, tickets, mensalistas e faturamento em uma ferramenta acessível a todos.' }
    ]
  },
  {
    id: 'visao',
    icone: 'fa-binoculars',
    variante: 'kpi-info',
    titulo: 'Visão',
    resumo: 'Onde o ParkGestão quer chegar.',
    itens: [
      { tipo: 'visao', texto: 'Ser um sistema de referência em gestão de estacionamentos que coloca o bem-estar coletivo acima do lucro individual, tratando o pátio como um espaço compartilhado e organizado em benefício de todos.' }
    ]
  },
  {
    id: 'valores',
    icone: 'fa-gem',
    variante: 'kpi-purple',
    titulo: 'Valores',
    resumo: 'Os 8 princípios que orientam as decisões da equipe.',
    itens: [
      { tipo: 'bem-estar', texto: '<strong>Bem-estar coletivo acima do lucro individual:</strong> as decisões do projeto priorizam o benefício de toda a equipe e de todos os usuários, não o ganho de um grupo isolado.' },
      { tipo: 'equidade', texto: '<strong>Equidade entre a equipe:</strong> mesmas regras, condições e oportunidades para todos os colaboradores, sem privilégios de cargo ou tempo de casa.' },
      { tipo: 'colaboracao', texto: '<strong>Cooperação em vez de competição interna:</strong> o trabalho é organizado em torno de metas compartilhadas, não de disputa entre colegas.' },
      { tipo: 'equidade', texto: '<strong>Distribuição justa do trabalho e do reconhecimento:</strong> tarefas, carga horária e créditos pelos resultados são divididos de forma equilibrada.' },
      { tipo: 'bem-estar', texto: '<strong>Qualidade de vida no trabalho:</strong> respeito à jornada, às pausas e ao equilíbrio entre vida pessoal e profissional de quem constrói e mantém o sistema.' },
      { tipo: 'colaboracao', texto: '<strong>Gestão participativa:</strong> decisões importantes são discutidas em conjunto com a equipe, não impostas de cima para baixo.' },
      { tipo: 'transparencia', texto: '<strong>Transparência das informações:</strong> critérios, mudanças e decisões do projeto são comunicados abertamente a todos, sem informação restrita a poucos.' },
      { tipo: 'equidade', texto: '<strong>Acesso igualitário a crescimento e capacitação:</strong> oportunidades de aprender e evoluir no projeto são abertas a qualquer integrante da equipe.' }
    ]
  }
]

/* --------------------------------------------------------------------------
   CONTAS E PAPÉIS DE ACESSO
   -------------------------------------------------------------------------- */

const TIPOS_ACESSO = {
  pode: { label: 'Pode acessar', icone: 'fa-circle-check', badge: 'bg-success text-white' },
  naopode: { label: 'Não pode / não vê', icone: 'fa-circle-xmark', badge: 'bg-danger text-white' }
}

const PAPEIS_ACESSO = [
  {
    id: 'funcionario',
    icone: 'fa-user',
    variante: 'kpi-secondary',
    titulo: 'Funcionário',
    resumo: 'O papel padrão de qualquer conta nova — cobre o dia a dia operacional do pátio e os próprios dados de RH.',
    itens: [
      { tipo: 'pode', texto: 'Dashboard, Tickets, Vagas &amp; Tarifas e Mensalistas — o dia a dia operacional do pátio.' },
      { tipo: 'pode', texto: 'A própria aba <a href="rh.html">RH</a> (ponto, férias, dados de RH, notificações e o próprio histórico de folha de pagamento).' },
      { tipo: 'naopode', texto: 'Não vê Métricas nem Faturamento (indicadores financeiros agregados) — exclusivos de administrador e financeiro.' },
      { tipo: 'naopode', texto: 'Não vê ponto, férias, dados de RH ou folha de pagamento de outros funcionários.' }
    ]
  },
  {
    id: 'gestor',
    icone: 'fa-user-tie',
    variante: 'kpi-info',
    titulo: 'Gestor',
    resumo: 'Tudo que o Funcionário tem, mais visão da equipe — sem nunca ver dado sensível de RH de terceiros.',
    itens: [
      { tipo: 'pode', texto: 'Tudo que o <strong>Funcionário</strong> tem (acesso operacional + a própria aba RH).' },
      { tipo: 'pode', texto: 'A lista de <a href="funcionarios.html">Funcionários</a> e o relatório de desempenho por atendimentos (tickets fechados).' },
      { tipo: 'pode', texto: 'Aprovar ou rejeitar solicitações de <a href="rh.html">férias</a> — mas só do próprio time (quem reporta direto a ele).' },
      { tipo: 'naopode', texto: 'Nunca vê salário, folha de pagamento ou dados bancários de terceiros — isso continua exclusivo de RH/administrador.' }
    ]
  },
  {
    id: 'rh',
    icone: 'fa-clipboard-user',
    variante: 'kpi-purple',
    titulo: 'RH',
    resumo: 'Cuida dos dados de RH de todo mundo, mas não decide papel de acesso nem cria contas.',
    itens: [
      { tipo: 'pode', texto: 'Tudo que o <strong>Funcionário</strong> tem (acesso operacional + a própria aba RH).' },
      { tipo: 'pode', texto: 'A área <a href="funcionarios.html">Gestão de Funcionários</a>, só para consulta e edição dos dados de RH.' },
      { tipo: 'pode', texto: 'A aba <strong>Folha de Pagamento</strong> dentro de <a href="rh.html">RH</a>, alimentando ponto, justificativas, férias e folha de pagamento de todos os funcionários.' },
      { tipo: 'naopode', texto: 'Não pode criar contas nem trocar o papel de acesso de ninguém — isso é exclusivo do administrador.' },
      { tipo: 'naopode', texto: 'Não acessa a própria trilha de auditoria: ações do RH sobre dado sensível ficam registradas, mas só o administrador consulta.' }
    ]
  },
  {
    id: 'financeiro',
    icone: 'fa-sack-dollar',
    variante: 'kpi-success',
    titulo: 'Financeiro',
    resumo: 'Enxerga só o lado financeiro do negócio inteiro — nunca dado de RH de terceiros.',
    itens: [
      { tipo: 'pode', texto: 'Dashboard, Tickets, Vagas &amp; Tarifas e Mensalistas, além da própria aba <a href="rh.html">RH</a> — igual ao Funcionário.' },
      { tipo: 'pode', texto: 'Métricas e Faturamento — os indicadores financeiros agregados do estacionamento inteiro (mesmo acesso do administrador nessas duas telas).' },
      { tipo: 'pode', texto: 'O módulo Financeiro: receita, despesas e lucro do estacionamento (DRE simplificado).' },
      { tipo: 'naopode', texto: 'Não acessa a Gestão de Funcionários nem dado de RH de terceiros (ponto, férias, salário) — isso continua exclusivo de RH/administrador.' }
    ]
  },
  {
    id: 'admin',
    icone: 'fa-crown',
    variante: 'kpi-danger',
    titulo: 'Administrador',
    resumo: 'Acesso total, com poder de criar contas e definir o papel de cada uma.',
    itens: [
      { tipo: 'pode', texto: 'Tudo que RH, Gestor, Financeiro e Funcionário têm, somado.' },
      { tipo: 'pode', texto: 'Cadastrar novos usuários, definir o papel de acesso de qualquer conta e inativar contas.' },
      { tipo: 'pode', texto: 'Acompanhar, pela auditoria, o que o RH está fazendo com dado sensível de terceiros.' }
    ]
  }
]

/* --------------------------------------------------------------------------
   RECURSOS DE ACESSIBILIDADE
   -------------------------------------------------------------------------- */

// Aqui a etiqueta marca o público que mais se beneficia de cada recurso —
// não é exclusividade (redução de movimento também ajuda quem tem TDAH,
// por exemplo), só uma forma rápida de "quem procura isso primeiro".
const PUBLICOS_ACESSIBILIDADE = {
  'baixa-visao': { label: 'Baixa visão', icone: 'fa-eye', badge: 'bg-primary text-white' },
  daltonismo: { label: 'Daltonismo', icone: 'fa-droplet', badge: 'bg-warning text-dark' },
  dislexia: { label: 'Dislexia', icone: 'fa-book-open', badge: 'bg-success text-white' },
  vestibular: { label: 'Vestibular', icone: 'fa-gauge', badge: 'bg-secondary text-white' },
  motora: { label: 'Motora', icone: 'fa-keyboard', badge: 'bg-info text-dark' },
  auditiva: { label: 'Auditiva', icone: 'fa-hands', badge: 'bg-danger text-white' }
}

// Mesmo conteúdo que estava fixo na página — a barra de acessibilidade em
// si (assets/js/modules/accessibility.js) não mudou, só a explicação dela
// aqui na página Sobre.
const RECURSOS_ACESSIBILIDADE = [
  {
    id: 'fonte',
    icone: 'fa-text-height',
    variante: 'kpi-primary',
    titulo: 'Ajuste de Fonte',
    resumo: 'Aumente, diminua ou restaure o tamanho do texto do site inteiro, em qualquer página.',
    itens: [
      { tipo: 'baixa-visao', texto: 'Três botões na barra de acessibilidade (<strong>A+</strong>, <strong>A-</strong>, <strong>A</strong>) ajustam o tamanho do texto de <strong>85% a 140%</strong>, em passos de 10%. A preferência fica salva e vale pra qualquer página do sistema, não só a atual.' }
    ]
  },
  {
    id: 'contraste-noturno',
    icone: 'fa-adjust',
    variante: 'kpi-info',
    titulo: 'Alto Contraste e Modo Noturno',
    resumo: 'Duas formas de deixar a leitura mais confortável, cada uma por um motivo diferente.',
    itens: [
      { tipo: 'baixa-visao', texto: '<strong>Alto Contraste</strong> troca as cores da tela por um esquema preto e branco de contraste máximo, para quem precisa de mais diferença entre texto e fundo pra enxergar bem.' },
      { tipo: 'baixa-visao', texto: '<strong>Modo Noturno</strong> inverte para um tema escuro em todo o site — mais confortável em ambientes com pouca luz e para quem é sensível ao brilho de uma tela clara.' }
    ]
  },
  {
    id: 'daltonismo',
    icone: 'fa-droplet',
    variante: 'kpi-warning',
    titulo: 'Filtros para Daltonismo',
    resumo: 'Simula e corrige a exibição de cores para os três tipos mais comuns de daltonismo.',
    itens: [
      { tipo: 'daltonismo', texto: 'Um seletor na barra de acessibilidade aplica um filtro de cor para <strong>Protanopia</strong>, <strong>Deuteranopia</strong> ou <strong>Tritanopia</strong> em toda a interface, inclusive nos indicadores de status (vaga livre/ocupada, ticket aberto/fechado etc.).' }
    ]
  },
  {
    id: 'dislexia-movimento',
    icone: 'fa-book-open',
    variante: 'kpi-success',
    titulo: 'Fonte para Dislexia e Redução de Movimento',
    resumo: 'Uma fonte pensada para facilitar a leitura, e a opção de desligar animações.',
    itens: [
      { tipo: 'dislexia', texto: 'Troca a fonte do site inteiro para uma fonte especializada (OpenDyslexic), com letras desenhadas para reduzir a confusão entre caracteres parecidos.' },
      { tipo: 'vestibular', texto: '<strong>Redução de Movimento</strong> desliga as animações de entrada e as transições da interface — para quem sente enxaqueca, tontura ou desconforto com telas em movimento. Também respeita automaticamente a preferência "reduzir movimento" já configurada no sistema operacional, mesmo sem tocar em nenhum botão.' }
    ]
  },
  {
    id: 'teclado-libras',
    icone: 'fa-keyboard',
    variante: 'kpi-secondary',
    titulo: 'Navegação por Teclado e Libras',
    resumo: 'Duas formas alternativas de usar e entender o sistema, sem precisar de mouse ou de audição.',
    itens: [
      { tipo: 'motora', texto: 'Todo o site pode ser usado só com o teclado — <kbd>Tab</kbd> para navegar entre os elementos, <kbd>Enter</kbd>/<kbd>Espaço</kbd> para ativar botões e cards, com um indicador de foco visível em qualquer elemento selecionado.' },
      { tipo: 'auditiva', texto: 'O widget do <strong>VLibras</strong> (governo federal) traduz o conteúdo da tela para Língua Brasileira de Sinais, disponível em todas as páginas do sistema.' }
    ]
  }
]

/* --------------------------------------------------------------------------
   REGRAS DE NEGÓCIO
   -------------------------------------------------------------------------- */

// Legenda de "tipo de regra", reaproveitada em todo card — ver também o
// resumo dela impresso acima da grade, em views/sobre.html.
const TIPOS_REGRA = {
  automatico: { label: 'Automático', icone: 'fa-gears', badge: 'bg-primary text-white' },
  calculo: { label: 'Cálculo', icone: 'fa-calculator', badge: 'bg-success text-white' },
  restricao: { label: 'Restrição', icone: 'fa-ban', badge: 'bg-warning text-dark' },
  seguranca: { label: 'Segurança', icone: 'fa-shield-halved', badge: 'bg-danger text-white' },
  informativo: { label: 'Informativo', icone: 'fa-circle-info', badge: 'bg-secondary text-white' }
}

// Mesmo conteúdo que estava fixo na página — só reorganizado por categoria
// (card) e, dentro de cada uma, por tipo de regra (ver TIPOS_REGRA).
const REGRAS_NEGOCIO = [
  {
    id: 'tickets',
    icone: 'fa-ticket-alt',
    variante: 'kpi-primary',
    titulo: 'Estacionamento e Tickets',
    resumo: 'Como as vagas mudam de status e como o valor de um ticket avulso ou de mensalista é calculado.',
    itens: [
      { tipo: 'automatico', texto: 'O status de uma vaga ("livre", "ocupada" ou "manutenção") é controlado pelo sistema — ela vira "ocupada" automaticamente ao abrir um ticket e volta para "livre" ao fechá-lo. Ninguém precisa atualizar isso na mão.' },
      { tipo: 'restricao', texto: 'A mesma placa não pode ter dois tickets abertos ao mesmo tempo.' },
      { tipo: 'calculo', texto: 'Veículo avulso tem <strong>15 minutos de tolerância</strong> sem cobrança; passado esse tempo, paga por hora cheia (fração de hora sempre arredonda para cima) pela tarifa escolhida na entrada.' },
      { tipo: 'calculo', texto: 'Mensalista com cadastro ativo não paga por ticket: ele paga um <strong>ciclo de 30 dias corridos</strong>, cobrado de uma vez só na primeira entrada sem ciclo vigente. Enquanto o ciclo estiver dentro do prazo, toda entrada seguinte sai isenta (<strong>R$ 0,00</strong>).' },
      { tipo: 'automatico', texto: 'O sistema reconhece um mensalista pela placa automaticamente, mesmo sem selecionar o nome dele na hora de abrir o ticket.' },
      { tipo: 'seguranca', texto: 'O valor cobrado é sempre calculado e gravado pelo servidor no momento do fechamento — o aplicativo nunca manda um valor pronto pra ser aceito.' }
    ]
  },
  {
    id: 'cadastros',
    icone: 'fa-id-card',
    variante: 'kpi-info',
    titulo: 'Cadastros',
    resumo: 'Regras de formato e de exclusão para mensalistas, vagas e tarifas.',
    itens: [
      { tipo: 'restricao', texto: 'CPF e placa só são aceitos no formato correto (CPF: <code>000.000.000-00</code>; placa: padrão antigo <code>ABC1234</code> ou Mercosul <code>ABC1D23</code>) e não podem se repetir entre dois cadastros.' },
      { tipo: 'restricao', texto: 'Mensalistas e funcionários nunca são apagados do sistema — apenas inativados — para preservar o histórico de cobranças e de uso.' },
      { tipo: 'restricao', texto: 'Uma vaga com qualquer ticket vinculado, mesmo já fechado, não pode ser excluída (só marcada como "Manutenção") — é o que mantém o ranking de uso e os relatórios corretos.' },
      { tipo: 'restricao', texto: 'Uma tarifa vinculada a um ticket <strong>ainda em aberto</strong> não pode ser excluída, para nenhum veículo perder a tarifa que lhe foi mostrada na entrada.' }
    ]
  },
  {
    id: 'faturamento',
    icone: 'fa-file-invoice-dollar',
    variante: 'kpi-warning',
    titulo: 'Faturamento',
    resumo: 'Quem vê o quê, e como uma cobrança é baixada, cancelada ou lembrada por e-mail.',
    itens: [
      { tipo: 'seguranca', texto: 'A baixa de uma cobrança (marcar como paga) ou o cancelamento (que exige motivo) ficam registrados com quem fez a alteração e quando.' },
      { tipo: 'seguranca', texto: 'Indicadores financeiros e a lista completa de cobranças de todos os mensalistas são exclusivos para administradores; um funcionário só vê a cobrança de um mensalista específico.' },
      { tipo: 'informativo', texto: 'Um lembrete de cobrança pode ser enviado por e-mail, se o mensalista tiver e-mail cadastrado.' }
    ]
  },
  {
    id: 'caixa',
    icone: 'fa-cash-register',
    variante: 'kpi-success',
    titulo: 'Caixa Diário',
    resumo: 'Abertura, fechamento e conferência do dinheiro físico do turno.',
    itens: [
      { tipo: 'restricao', texto: 'Existe um único caixa por dia, e nenhum ticket — avulso ou de mensalista — pode ser aberto sem o caixa do dia estar aberto.' },
      { tipo: 'calculo', texto: 'Ao fechar o caixa, o valor esperado é recalculado na hora somando o valor de abertura a todos os pagamentos <strong>em dinheiro</strong> do dia — PIX e cartão nunca entram nessa conta, só afetam o dinheiro fisicamente em caixa.' },
      { tipo: 'informativo', texto: 'A diferença entre o valor contado e o valor esperado (sobra ou falta) fica registrada no fechamento daquele dia.' }
    ]
  },
  {
    id: 'ponto-ferias-folha',
    icone: 'fa-user-clock',
    variante: 'kpi-secondary',
    titulo: 'Ponto, Férias e Folha de Pagamento',
    resumo: 'Escala, tolerância de atraso, hora extra, férias e o cálculo completo do holerite.',
    itens: [
      { tipo: 'informativo', texto: 'Cada funcionário tem uma escala fixa de <strong>4 dias por semana</strong> (o estacionamento funciona 24 horas por dia, 7 dias por semana, com equipes revezando os dias), com uma quantidade de horas e um horário de entrada previstos, definidos pelo RH no cadastro.' },
      { tipo: 'calculo', texto: 'A entrada é registrada com <strong>20 minutos de tolerância</strong>: dentro desse prazo, o atraso não é descontado. Acima disso, o tempo perdido não é pago, mas não vira falta — o funcionário trabalhou parte do dia.' },
      { tipo: 'restricao', texto: 'Trabalhar além da jornada num dia de escala é pago pelo <strong>valor-hora normal</strong>. Trabalhar num dia <strong>fora da escala</strong> só é permitido com uma solicitação aprovada previamente — e, nesse caso, é pago com <strong>100% de adicional</strong> (dobro do valor-hora). Cada solicitação vale para uma data futura específica, uma por dia por funcionário, e uma vez aprovada ou rejeitada não pode ser decidida de novo.' },
      { tipo: 'informativo', texto: 'Falta é um dia de escala sem nenhum registro de ponto e sem cobertura de atestado, abono, folga ou férias aprovadas — essas quatro situações nunca geram desconto no salário.' },
      { tipo: 'restricao', texto: 'Férias: <strong>60 dias por ano</strong>, escolhidos pelo próprio funcionário, solicitados com pelo menos <strong>90 dias de antecedência</strong> para a empresa se programar, e aprovados por RH/administrador ou pelo gestor direto, para o próprio time.' },
      { tipo: 'seguranca', texto: 'A assinatura eletrônica é cadastrada <strong>uma única vez</strong> pelo funcionário e reaplicada em toda folha de ponto e holerite que ele assinar depois. Um documento só pode ser baixado em PDF <strong>depois de assinado</strong>.' },
      { tipo: 'calculo', texto: 'Cálculo do holerite mensal: salário-base (proporcional às faltas não abonadas) + horas extras + horas fora da escala (100% de adicional) + <strong>Vale-Refeição</strong> (R$ 45,00 por dia trabalhado) + <strong>Vale-Alimentação</strong> (R$ 800,00 fixo por mês) — menos <strong>INSS</strong> e <strong>IRRF</strong>, os únicos descontos, por serem obrigatórios por lei. Plano de convênio médico, plano odontológico, Gympass e o desconto para compra de livros são benefícios sem nenhum desconto no salário do funcionário.' },
      { tipo: 'informativo', texto: 'O "pagamento" de um holerite é sempre <strong>simulado</strong>: o fluxo se comporta como se fosse real (exige assinatura prévia, não pode ser repetido), mas nunca integra um banco de verdade.' }
    ]
  },
  {
    id: 'documentos-rh',
    icone: 'fa-briefcase',
    variante: 'kpi-purple',
    titulo: 'Documentos de RH e Carreira',
    resumo: 'Espelho de ponto, contrato, etapas de carreira, PDI, organograma e notificações.',
    itens: [
      { tipo: 'restricao', texto: 'O <strong>espelho de ponto</strong> só pode ser gerado de um mês já encerrado e fica congelado no momento da geração — não é recalculado depois, mesmo que o histórico de ponto daquele funcionário mude.' },
      { tipo: 'informativo', texto: 'O <strong>contrato de trabalho</strong> também é uma cópia congelada dos dados do funcionário no momento em que é gerado (inclusive cargo e gestor da época); uma edição posterior no cadastro nunca altera um contrato já emitido.' },
      { tipo: 'seguranca', texto: 'Assim como o holerite, o espelho de ponto e o contrato só liberam o PDF depois de assinados pelo próprio dono do documento.' },
      { tipo: 'restricao', texto: '<strong>Etapas de carreira</strong> e <strong>PDI</strong> (Plano de Desenvolvimento Individual) acompanham a trajetória do funcionário na empresa, mas quem cria, edita ou marca como concluído é sempre RH/administrador — o funcionário nunca autodeclara o próprio progresso.' },
      { tipo: 'seguranca', texto: 'O <strong>organograma</strong> pode ser visto por qualquer pessoa autenticada, mas mostra só nome, cargo e papel de acesso — nunca salário ou dados bancários de outra pessoa.' },
      { tipo: 'automatico', texto: 'O sistema avisa o funcionário automaticamente por <strong>notificação</strong> toda vez que um documento de RH (espelho de ponto, contrato ou holerite) é gerado para ele.' }
    ]
  },
  {
    id: 'contas-acesso',
    icone: 'fa-key',
    variante: 'kpi-danger',
    titulo: 'Contas e Acesso',
    resumo: 'Senha, login social, recuperação de senha e proteção contra tentativas em excesso.',
    itens: [
      { tipo: 'seguranca', texto: 'Senha exige 8 ou mais caracteres, com maiúscula, minúscula, número e símbolo.' },
      { tipo: 'informativo', texto: 'Login também pode ser feito com uma conta Google; quem entra assim precisa completar o CPF antes de usar o resto do sistema.' },
      { tipo: 'seguranca', texto: 'Recuperação de senha usa um código de 6 dígitos por e-mail, válido por 15 minutos e que só funciona uma vez.' },
      { tipo: 'seguranca', texto: 'Excesso de tentativas de login, cadastro ou redefinição de senha é bloqueado temporariamente.' }
    ]
  }
]

/* --------------------------------------------------------------------------
   TECNOLOGIA POR TRÁS DO SISTEMA
   -------------------------------------------------------------------------- */

// Aqui a etiqueta marca o motivo por trás de cada escolha técnica — reforça
// a frase de abertura da seção ("escolhida por segurança e confiabilidade,
// não por modismo").
const MOTIVOS_TECNOLOGIA = {
  organizacao: { label: 'Organização', icone: 'fa-diagram-project', badge: 'bg-primary text-white' },
  confiabilidade: { label: 'Confiabilidade', icone: 'fa-clock-rotate-left', badge: 'bg-info text-dark' },
  seguranca: { label: 'Segurança', icone: 'fa-lock', badge: 'bg-danger text-white' },
  acessibilidade: { label: 'Acessibilidade', icone: 'fa-universal-access', badge: 'bg-success text-white' },
  portabilidade: { label: 'Portabilidade', icone: 'fa-cloud', badge: 'bg-warning text-dark' },
  qualidade: { label: 'Qualidade', icone: 'fa-vial', badge: 'bg-secondary text-white' }
}

// Mesmo conteúdo que estava fixo na página — cada camada de tecnologia
// ganhou o(s) motivo(s) por trás da escolha (ver MOTIVOS_TECNOLOGIA).
const TECNOLOGIA = [
  {
    id: 'backend',
    icone: 'fa-server',
    variante: 'kpi-primary',
    titulo: 'Backend',
    resumo: 'NestJS (Node.js + TypeScript), organizado em módulos por domínio de negócio.',
    itens: [
      { tipo: 'organizacao', texto: 'Construído em <strong>NestJS</strong> (Node.js + TypeScript), organizado em módulos por domínio de negócio — tickets, mensalistas, faturamento, dashboard, RH e mais de uma dezena de outros, cada um isolado com seu próprio controller/service/DTO.' }
    ]
  },
  {
    id: 'banco-de-dados',
    icone: 'fa-database',
    variante: 'kpi-info',
    titulo: 'Banco de Dados',
    resumo: 'PostgreSQL, acessado através do Prisma ORM, com histórico versionado de cada mudança de estrutura.',
    itens: [
      { tipo: 'confiabilidade', texto: 'PostgreSQL, acessado através do <strong>Prisma ORM</strong> — o esquema de tabelas vive em um único arquivo, e cada mudança de estrutura vira uma <strong>migration</strong> versionada e rastreável, nunca uma alteração direta e silenciosa no banco.' }
    ]
  },
  {
    id: 'autenticacao',
    icone: 'fa-key',
    variante: 'kpi-danger',
    titulo: 'Autenticação e Segurança',
    resumo: 'JWT com senha em hash e verificação oficial do Google para o login social.',
    itens: [
      { tipo: 'seguranca', texto: 'Login autenticado por <strong>JWT</strong>; a senha nunca é guardada em texto puro, só o hash gerado por <strong>bcrypt</strong>.' },
      { tipo: 'seguranca', texto: 'O login com Google tem a assinatura do token verificada direto no servidor do Google — o backend nunca confia apenas no que o navegador manda.' }
    ]
  },
  {
    id: 'frontend',
    icone: 'fa-window-maximize',
    variante: 'kpi-secondary',
    titulo: 'Frontend',
    resumo: 'HTML, CSS e JavaScript acessíveis (WCAG 2.1 AAA), sem depender de um único fornecedor de nuvem.',
    itens: [
      { tipo: 'acessibilidade', texto: 'HTML, CSS e JavaScript acessíveis, seguindo o padrão <strong>WCAG 2.1 AAA</strong> — o nível mais alto da norma de acessibilidade web.' },
      { tipo: 'portabilidade', texto: 'Sem depender de um framework de UI pesado nem de um único fornecedor de nuvem específico, o que facilita trocar de provedor de hospedagem no futuro sem reescrever a interface.' }
    ]
  },
  {
    id: 'qualidade',
    icone: 'fa-vial',
    variante: 'kpi-purple',
    titulo: 'Qualidade e Testes',
    resumo: 'Suíte de testes automatizados cobrindo as regras mais sensíveis, rodada a cada mudança no código.',
    itens: [
      { tipo: 'qualidade', texto: 'Suíte de testes automatizados cobrindo as regras mais sensíveis (cálculo de cobrança, ciclo de mensalista, autenticação, férias, folha de pagamento), rodada a cada mudança no código antes de ir pro ar.' }
    ]
  }
]

document.addEventListener('DOMContentLoaded', () => {
  renderizarGradeCards('grid-missao-visao-valores', MISSAO_VISAO_VALORES, 'pilar', 'Missão, Visão e Valores', item => abrirModalDetalhe(item, TIPOS_PILAR))
  renderizarGradeCards('grid-papeis-acesso', PAPEIS_ACESSO, 'papel', 'Papel de Acesso', item => abrirModalDetalhe(item, TIPOS_ACESSO))
  renderizarGradeCards('grid-acessibilidade', RECURSOS_ACESSIBILIDADE, 'acessibilidade', 'Recurso de Acessibilidade', item => abrirModalDetalhe(item, PUBLICOS_ACESSIBILIDADE))
  renderizarGradeCards('grid-regras-negocio', REGRAS_NEGOCIO, 'regra', 'Regra de Negócio', item => abrirModalDetalhe(item, TIPOS_REGRA))
  renderizarGradeCards('grid-tecnologia', TECNOLOGIA, 'tecnologia', 'Tecnologia', item => abrirModalDetalhe(item, MOTIVOS_TECNOLOGIA))
})
