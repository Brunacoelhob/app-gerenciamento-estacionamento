/**
 * Lógica da Página de Gestão Financeira
 * DRE simplificado (receita - despesa = lucro) + contas a pagar/despesas.
 * Todo o cálculo (KPIs, comparativo, evolução mensal) vem pronto do servidor
 * — ver src/financeiro/financeiro.service.ts. O front só filtra a lista de
 * despesas já carregada e pinta os números recebidos.
 */

let despesasCache = []
let chartEvolucaoFinanceiro = null

// Estado com o detalhamento por trás de cada KPI, preenchido em
// renderizarResumoFinanceiro() e consumido pelo modal de detalhes
// (abrirDetalhesKpiFinanceiro) — mesmo padrão do Dashboard/Faturamento.
let resumoFinanceiroAtual = {}

document.addEventListener('DOMContentLoaded', async () => {
  const inputReferencia = document.getElementById('filtro-referencia-financeiro')
  if (inputReferencia) {
    inputReferencia.value = referenciaAtualFinanceiro()
    inputReferencia.addEventListener('change', () => carregarFinanceiro())
  }

  await carregarFinanceiro()

  document.getElementById('input-busca-despesa')?.addEventListener('input', aplicarFiltrosDespesas)
  document.getElementById('filtro-status-despesa')?.addEventListener('change', aplicarFiltrosDespesas)
  document.getElementById('filtro-categoria-despesa')?.addEventListener('change', aplicarFiltrosDespesas)

  document.getElementById('btn-retry-page')?.addEventListener('click', () => carregarFinanceiro())
  document.getElementById('btn-nova-despesa')?.addEventListener('click', abrirModalNovaDespesa)
  document.getElementById('btn-nova-despesa-recorrente')?.addEventListener('click', abrirModalNovaDespesaRecorrente)

  // === MODAL DE DETALHES AO CLICAR NOS CARDS DE KPI (mesmo padrão do Dashboard/Faturamento) ===
  document.querySelectorAll('.card-kpi[data-kpi]').forEach(card => {
    card.addEventListener('click', () => abrirDetalhesKpiFinanceiro(card.dataset.kpi))
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        abrirDetalhesKpiFinanceiro(card.dataset.kpi)
      }
    })
  })
})

function referenciaAtualFinanceiro () {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

// Formata a referência do mês de competência ("2026-08") como "08/2026" —
// mesmo formato usado no modal de detalhes dos KPIs.
function formatarReferenciaFinanceiro (referencia) {
  const [ano, mes] = String(referencia || '').split('-')
  return ano && mes ? `${mes}/${ano}` : referencia || '-'
}

function formatarMoedaFinanceiro (valor) {
  const numero = Number(valor || 0)
  const sinal = numero < 0 ? '-' : ''
  return `${sinal}R$ ${Math.abs(numero).toFixed(2).replace('.', ',')}`
}

function formatarDataFinanceiro (iso) {
  if (!iso) return '-'
  const data = new Date(iso)
  return isNaN(data) ? '-' : data.toLocaleDateString('pt-BR')
}

async function carregarFinanceiro () {
  const pageError = document.getElementById('page-error')
  const pageErrorText = document.getElementById('page-error-text')
  const tbody = document.getElementById('tbody-despesas')

  pageError?.classList.add('d-none')
  tbody?.setAttribute('aria-busy', 'true')

  const referencia = document.getElementById('filtro-referencia-financeiro')?.value || referenciaAtualFinanceiro()

  try {
    const [resumo, evolucao, despesas, recorrentes] = await Promise.all([
      ApiService.getFinanceiroResumo(referencia),
      ApiService.getFinanceiroEvolucao(6),
      ApiService.getDespesas({ referencia }),
      ApiService.getDespesasRecorrentes()
    ])

    renderizarResumoFinanceiro(resumo)
    renderizarGraficoEvolucaoFinanceiro(evolucao)
    renderizarDespesasRecorrentes(recorrentes || [])

    despesasCache = despesas || []
    popularFiltroCategoriaDespesa()
    aplicarFiltrosDespesas()
  } catch (error) {
    console.error('Erro ao carregar dados financeiros:', error)

    // Sessão expirada (401) já é tratada por AuthService.tratarSessaoExpirada
    // — logout + redirect pro login já disparados a essa altura.
    if (typeof AuthService !== 'undefined' && !AuthService.estaLogado()) {
      return
    }

    if (pageError && pageErrorText) {
      pageErrorText.textContent = 'Não foi possível carregar os dados financeiros. Verifique sua conexão e tente novamente.'
      pageError.classList.remove('d-none')
    }

    Swal.fire({
      icon: 'error',
      title: 'Erro de Conexão',
      text: 'Não foi possível carregar os dados financeiros.'
    })
  } finally {
    tbody?.setAttribute('aria-busy', 'false')
  }
}

// Monta texto/ícone/cor de comparação com o mês anterior — mesma lógica de
// formatarComparacaoReceitaMesAnterior em metricas.js, mas reutilizável tanto
// pra receita quanto pra despesa/lucro (sinal "bom" inverte pra despesa).
function formatarVariacaoFinanceiro (variacaoPercentual, { positivoEBom = true } = {}) {
  if (variacaoPercentual === null || variacaoPercentual === undefined) {
    return { texto: 'Sem dados no mês anterior para comparar', classe: 'text-muted' }
  }

  const sinal = variacaoPercentual >= 0 ? '+' : ''
  const ehPositivo = variacaoPercentual >= 0
  const ehBom = positivoEBom ? ehPositivo : !ehPositivo
  const classe = ehBom ? 'text-success' : 'text-danger'
  const icone = ehPositivo ? 'fa-arrow-up' : 'fa-arrow-down'

  return {
    texto: `<i class="fas ${icone} me-1" aria-hidden="true"></i>${sinal}${variacaoPercentual.toFixed(1)}% vs mês anterior`,
    classe
  }
}

function renderizarResumoFinanceiro (resumo) {
  resumoFinanceiroAtual = resumo || {}

  const elReceita = document.getElementById('kpi-receita-total')
  if (elReceita) elReceita.textContent = formatarMoedaFinanceiro(resumo.receitaTotal)

  const elDespesa = document.getElementById('kpi-despesa-total')
  if (elDespesa) elDespesa.textContent = formatarMoedaFinanceiro(resumo.despesaTotal)

  const elLucro = document.getElementById('kpi-lucro-liquido')
  if (elLucro) {
    elLucro.textContent = formatarMoedaFinanceiro(resumo.lucroLiquido)
    elLucro.classList.toggle('text-danger', resumo.lucroLiquido < 0)
  }

  const elMargem = document.getElementById('kpi-margem-lucro')
  if (elMargem) {
    elMargem.textContent = resumo.margemLucro === null ? '-' : `${resumo.margemLucro.toFixed(1)}%`
  }

  const comparativo = resumo.comparativoMesAnterior || {}
  const elReceitaComp = document.getElementById('kpi-receita-comparacao')
  if (elReceitaComp) {
    const c = formatarVariacaoFinanceiro(comparativo.variacaoReceita, { positivoEBom: true })
    elReceitaComp.innerHTML = c.texto
    elReceitaComp.className = `text-xs ${c.classe}`
  }
  const elDespesaComp = document.getElementById('kpi-despesa-comparacao')
  if (elDespesaComp) {
    const c = formatarVariacaoFinanceiro(comparativo.variacaoDespesa, { positivoEBom: false })
    elDespesaComp.innerHTML = c.texto
    elDespesaComp.className = `text-xs ${c.classe}`
  }
  const elLucroComp = document.getElementById('kpi-lucro-comparacao')
  if (elLucroComp) {
    const c = formatarVariacaoFinanceiro(comparativo.variacaoLucro, { positivoEBom: true })
    elLucroComp.innerHTML = c.texto
    elLucroComp.className = `text-xs ${c.classe}`
  }

  const elAtrasadas = document.getElementById('kpi-despesas-atrasadas')
  if (elAtrasadas) {
    elAtrasadas.textContent = resumo.despesasAtrasadas > 0
      ? `${formatarMoedaFinanceiro(resumo.despesasAtrasadas)} em despesas atrasadas`
      : ''
  }
}

/**
 * Abre um modal explicando de onde vem o número de um card de KPI da tela
 * Financeiro (mesmo padrão do Dashboard e de Faturamento), usando o
 * detalhamento recebido em renderizarResumoFinanceiro (resumoFinanceiroAtual)
 * para que o texto sempre bata com o valor exibido no cartão.
 */
function abrirDetalhesKpiFinanceiro (chave) {
  if (typeof Swal === 'undefined') return

  const d = resumoFinanceiroAtual
  const refFormatada = formatarReferenciaFinanceiro(d.referencia)

  let title = ''
  let html = ''

  switch (chave) {
    case 'receita-total':
      title = 'Receita Total'
      html = `<p class="text-muted mb-2">Soma de tudo que entrou no estacionamento em ${refFormatada}: tickets sem mensalista fechados no mês (pela data de saída) + mensalidades pagas com referência nesse mês.</p>
        <ul class="text-start mb-2">
          <li>Tickets avulsos fechados: <strong>${formatarMoedaFinanceiro(d.receitaTickets)}</strong></li>
          <li>Mensalidades pagas: <strong>${formatarMoedaFinanceiro(d.receitaMensalidades)}</strong></li>
        </ul>
        <p class="fs-5 mb-0">Total: <strong>${formatarMoedaFinanceiro(d.receitaTotal)}</strong></p>`
      break
    case 'despesa-total':
      title = 'Despesas do Mês (+ folha)'
      html = `<p class="text-muted mb-2">Soma de tudo que saiu em ${refFormatada}: despesas marcadas como pagas nesse mês + folha de pagamento (holerites já pagos, soma do salário líquido). Despesas ainda pendentes não entram aqui — só quando são efetivamente baixadas.</p>
        <ul class="text-start mb-2">
          <li>Despesas pagas: <strong>${formatarMoedaFinanceiro(d.despesasPagas)}</strong></li>
          <li>Folha de pagamento paga: <strong>${formatarMoedaFinanceiro(d.custoFolha)}</strong></li>
        </ul>
        <p class="fs-5 mb-2">Total: <strong>${formatarMoedaFinanceiro(d.despesaTotal)}</strong></p>
        ${d.despesasPendentes > 0
          ? `<p class="text-xs text-muted mb-0">Além disso, há <strong>${formatarMoedaFinanceiro(d.despesasPendentes)}</strong> em despesas pendentes neste mês${d.despesasAtrasadas > 0 ? `, das quais <strong class="text-danger">${formatarMoedaFinanceiro(d.despesasAtrasadas)}</strong> já venceram sem pagamento` : ''} — isso é visão de contas a pagar, não abate o lucro ainda.</p>`
          : '<p class="text-xs text-muted mb-0">Nenhuma despesa pendente neste mês.</p>'}`
      break
    case 'lucro-liquido':
      title = 'Lucro Líquido'
      html = `<p class="text-muted mb-2">Receita total menos despesa total (incluindo folha) do mês — o DRE simplificado de ${refFormatada}.</p>
        <p class="fs-5 mb-0">${formatarMoedaFinanceiro(d.receitaTotal)} − ${formatarMoedaFinanceiro(d.despesaTotal)} = <strong class="${d.lucroLiquido < 0 ? 'text-danger' : ''}">${formatarMoedaFinanceiro(d.lucroLiquido)}</strong></p>`
      break
    case 'margem-lucro':
      title = 'Margem de Lucro'
      html = d.margemLucro === null
        ? '<p class="text-muted mb-0">Sem receita registrada em ' + refFormatada + ' para calcular a margem.</p>'
        : `<p class="text-muted mb-2">Lucro líquido dividido pela receita total do mês, em percentual — mostra quanto de cada real que entra sobra depois de todas as despesas (incluindo folha).</p>
        <p class="fs-5 mb-0">${formatarMoedaFinanceiro(d.lucroLiquido)} ÷ ${formatarMoedaFinanceiro(d.receitaTotal)} = <strong>${d.margemLucro.toFixed(1)}%</strong></p>`
      break
    default:
      return
  }

  Swal.fire({
    title,
    html,
    icon: 'info',
    confirmButtonText: 'Fechar'
  })
}

function renderizarGraficoEvolucaoFinanceiro (evolucao) {
  const canvas = document.getElementById('chart-evolucao-financeiro')
  if (!canvas || typeof Chart === 'undefined') return
  const ctx = canvas.getContext('2d')

  if (chartEvolucaoFinanceiro) chartEvolucaoFinanceiro.destroy()

  chartEvolucaoFinanceiro = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: evolucao.map(item => item.mes),
      datasets: [
        { label: 'Receita', data: evolucao.map(item => item.receita), backgroundColor: 'rgba(25, 135, 84, 0.7)' },
        { label: 'Despesa', data: evolucao.map(item => item.despesa), backgroundColor: 'rgba(220, 53, 69, 0.7)' },
        {
          label: 'Lucro',
          data: evolucao.map(item => item.lucro),
          type: 'line',
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.15)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: 'bottom' } }
    }
  })
}

function renderizarDespesasRecorrentes (lista) {
  const tbody = document.getElementById('tbody-despesas-recorrentes')
  if (!tbody) return

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">Nenhuma despesa recorrente cadastrada.</td></tr>'
    return
  }

  tbody.innerHTML = lista
    .map(r => `
      <tr>
        <td>${ApiService.sanitizeText(r.categoria)}</td>
        <td>${ApiService.sanitizeText(r.descricao)}</td>
        <td>${formatarMoedaFinanceiro(r.valor)}</td>
        <td>Dia ${r.diaVencimento}</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-danger" data-acao="desativar-recorrente" data-id="${r.id}">
            <i class="fas fa-ban me-1" aria-hidden="true"></i>Desativar
          </button>
        </td>
      </tr>
    `)
    .join('')

  tbody.querySelectorAll('[data-acao="desativar-recorrente"]').forEach(botao => {
    botao.addEventListener('click', () => desativarDespesaRecorrente(botao.dataset.id))
  })
}

function popularFiltroCategoriaDespesa () {
  const select = document.getElementById('filtro-categoria-despesa')
  if (!select) return

  const valorAtual = select.value
  const categorias = [...new Set(despesasCache.map(d => d.categoria).filter(Boolean))].sort()

  select.innerHTML = '<option value="TODOS">Todas as categorias</option>' +
    categorias.map(cat => `<option value="${ApiService.sanitizeText(cat)}">${ApiService.sanitizeText(cat)}</option>`).join('')

  if (categorias.includes(valorAtual)) select.value = valorAtual
}

// Só compara a data-calendário (chave "YYYY-MM-DD"), nunca o instante bruto
// (`new Date(iso) < new Date()`): isso marcaria uma despesa que vence HOJE
// como atrasada assim que passasse meia-noite UTC — ainda à noite do dia
// anterior em fusos atrás de UTC (Brasil, UTC-3). Mesmo critério usado no
// backend (ver estaAtrasada em src/financeiro/financeiro-datas.util.ts).
function ehDataAnteriorAHoje (dataIso) {
  if (!dataIso) return false
  const chaveData = String(dataIso).slice(0, 10)
  const hoje = new Date()
  const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  return chaveData < chaveHoje
}

function aplicarFiltrosDespesas () {
  const termo = (document.getElementById('input-busca-despesa')?.value || '').toLowerCase().trim()
  const statusFiltro = document.getElementById('filtro-status-despesa')?.value || 'TODOS'
  const categoriaFiltro = document.getElementById('filtro-categoria-despesa')?.value || 'TODOS'

  let filtradas = despesasCache.map(d => ({
    ...d,
    atrasada: d.status === 'pendente' && ehDataAnteriorAHoje(d.dataVencimento)
  }))

  if (statusFiltro === 'atrasada') {
    filtradas = filtradas.filter(d => d.atrasada)
  } else if (statusFiltro !== 'TODOS') {
    filtradas = filtradas.filter(d => d.status === statusFiltro)
  }

  if (categoriaFiltro !== 'TODOS') {
    filtradas = filtradas.filter(d => d.categoria === categoriaFiltro)
  }

  if (termo) {
    filtradas = filtradas.filter(d => (d.descricao || '').toLowerCase().includes(termo))
  }

  renderizarTabelaDespesas(filtradas)
}

const ROTULO_STATUS_DESPESA = { pendente: 'Pendente', paga: 'Paga' }
const CLASSE_STATUS_DESPESA = { pendente: 'status-pendente', paga: 'status-pago' }

function renderizarTabelaDespesas (lista) {
  const tbody = document.getElementById('tbody-despesas')
  if (!tbody) return

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Nenhuma despesa encontrada.</td></tr>'
    return
  }

  tbody.innerHTML = lista
    .map(d => {
      const rotuloStatus = d.atrasada ? 'Atrasada' : (ROTULO_STATUS_DESPESA[d.status] || d.status)
      const classeStatus = d.atrasada ? 'status-cancelado' : (CLASSE_STATUS_DESPESA[d.status] || '')
      const botaoExcluir = d.despesaRecorrenteId
        ? ''
        : `
          <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${d.id}">
            <i class="fas fa-trash" aria-hidden="true"></i>
          </button>
        `
      const acoes = d.status === 'pendente'
        ? `
          <button type="button" class="btn btn-sm btn-success" data-acao="pagar" data-id="${d.id}">
            <i class="fas fa-check me-1" aria-hidden="true"></i>Marcar Paga
          </button>
          ${botaoExcluir}
        `
        // data-id (não data-uri): o comprovante fica em despesasCache, nunca
        // embutido como atributo — a lista inteira é re-renderizada a cada
        // filtro/busca, e embutir o base64 (até ~6MB por despesa) travaria a
        // digitação com várias despesas pagas com comprovante.
        : (d.comprovanteAnexo
            ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-acao="ver-comprovante" data-id="${d.id}">
                <i class="fas fa-paperclip me-1" aria-hidden="true"></i>Comprovante
              </button>`
            : '')

      return `
        <tr>
          <td>${ApiService.sanitizeText(d.categoria)}</td>
          <td>${ApiService.sanitizeText(d.descricao)}</td>
          <td>${ApiService.sanitizeText(d.referencia)}</td>
          <td>${formatarDataFinanceiro(d.dataVencimento)}</td>
          <td>${formatarMoedaFinanceiro(d.valor)}</td>
          <td><span class="badge-status ${classeStatus}">${rotuloStatus}</span></td>
          <td class="d-flex gap-1">${acoes}</td>
        </tr>
      `
    })
    .join('')

  tbody.querySelectorAll('[data-acao="pagar"]').forEach(b => b.addEventListener('click', () => marcarDespesaPaga(b.dataset.id)))
  tbody.querySelectorAll('[data-acao="excluir"]').forEach(b => b.addEventListener('click', () => excluirDespesa(b.dataset.id)))
  tbody.querySelectorAll('[data-acao="ver-comprovante"]').forEach(b => b.addEventListener('click', () => {
    const despesa = despesasCache.find(d => d.id === b.dataset.id)
    if (despesa?.comprovanteAnexo) abrirAnexoComprovante(despesa.comprovanteAnexo)
  }))
}

async function abrirModalNovaDespesa () {
  const { isConfirmed, value: dados } = await Swal.fire({
    title: 'Nova Despesa',
    html: `
      <div class="mb-3 text-start">
        <label for="swal-despesa-categoria" class="form-label fw-semibold">Categoria</label>
        <input type="text" id="swal-despesa-categoria" class="form-control" placeholder="Ex.: Manutenção, Energia...">
      </div>
      <div class="mb-3 text-start">
        <label for="swal-despesa-descricao" class="form-label fw-semibold">Descrição</label>
        <input type="text" id="swal-despesa-descricao" class="form-control" placeholder="Ex.: Reparo da cancela">
      </div>
      <div class="mb-3 text-start">
        <label for="swal-despesa-valor" class="form-label fw-semibold">Valor (R$)</label>
        <input type="number" id="swal-despesa-valor" class="form-control" min="0.01" step="0.01">
      </div>
      <div class="text-start">
        <label for="swal-despesa-vencimento" class="form-label fw-semibold">Vencimento</label>
        <input type="date" id="swal-despesa-vencimento" class="form-control">
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Criar Despesa',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#0d6efd',
    preConfirm: () => {
      const categoria = document.getElementById('swal-despesa-categoria').value.trim()
      const descricao = document.getElementById('swal-despesa-descricao').value.trim()
      const valor = Number(document.getElementById('swal-despesa-valor').value)
      const dataVencimento = document.getElementById('swal-despesa-vencimento').value

      if (!categoria || !descricao) {
        Swal.showValidationMessage('Informe categoria e descrição.')
        return false
      }
      if (!valor || valor <= 0) {
        Swal.showValidationMessage('Informe um valor válido.')
        return false
      }
      if (!dataVencimento) {
        Swal.showValidationMessage('Informe a data de vencimento.')
        return false
      }
      return { categoria, descricao, valor, dataVencimento }
    }
  })

  if (!isConfirmed) return

  try {
    await ApiService.criarDespesa(dados)
    toastSucesso('Despesa criada com sucesso.')
    await carregarFinanceiro()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao criar despesa', text: error.message })
  }
}

async function abrirModalNovaDespesaRecorrente () {
  const { isConfirmed, value: dados } = await Swal.fire({
    title: 'Nova Despesa Recorrente',
    html: `
      <p class="text-muted text-start">Se repete todo mês (ex.: aluguel, internet) — a primeira ocorrência já nasce lançada no mês corrente.</p>
      <div class="mb-3 text-start">
        <label for="swal-recorrente-categoria" class="form-label fw-semibold">Categoria</label>
        <input type="text" id="swal-recorrente-categoria" class="form-control" placeholder="Ex.: Aluguel, Internet...">
      </div>
      <div class="mb-3 text-start">
        <label for="swal-recorrente-descricao" class="form-label fw-semibold">Descrição</label>
        <input type="text" id="swal-recorrente-descricao" class="form-control" placeholder="Ex.: Aluguel do galpão">
      </div>
      <div class="mb-3 text-start">
        <label for="swal-recorrente-valor" class="form-label fw-semibold">Valor (R$)</label>
        <input type="number" id="swal-recorrente-valor" class="form-control" min="0.01" step="0.01">
      </div>
      <div class="text-start">
        <label for="swal-recorrente-dia" class="form-label fw-semibold">Dia de vencimento (1-28)</label>
        <input type="number" id="swal-recorrente-dia" class="form-control" min="1" max="28" step="1">
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Criar Despesa Recorrente',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#0d6efd',
    preConfirm: () => {
      const categoria = document.getElementById('swal-recorrente-categoria').value.trim()
      const descricao = document.getElementById('swal-recorrente-descricao').value.trim()
      const valor = Number(document.getElementById('swal-recorrente-valor').value)
      const diaVencimento = Number(document.getElementById('swal-recorrente-dia').value)

      if (!categoria || !descricao) {
        Swal.showValidationMessage('Informe categoria e descrição.')
        return false
      }
      if (!valor || valor <= 0) {
        Swal.showValidationMessage('Informe um valor válido.')
        return false
      }
      if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28) {
        Swal.showValidationMessage('Dia de vencimento deve ser entre 1 e 28.')
        return false
      }
      return { categoria, descricao, valor, diaVencimento }
    }
  })

  if (!isConfirmed) return

  try {
    await ApiService.criarDespesaRecorrente(dados)
    toastSucesso('Despesa recorrente criada.')
    await carregarFinanceiro()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao criar despesa recorrente', text: error.message })
  }
}

async function marcarDespesaPaga (id) {
  const { isConfirmed, value: resultado } = await Swal.fire({
    title: 'Dar baixa na despesa',
    html: `
      <div class="mb-3 text-start">
        <label for="swal-forma-pagamento-despesa" class="form-label fw-semibold">Forma de Pagamento:</label>
        <select id="swal-forma-pagamento-despesa" class="form-select">
          <option value="pix" selected>📱 PIX</option>
          <option value="cartao_credito">💳 Cartão de Crédito</option>
          <option value="cartao_debito">💳 Cartão de Débito</option>
          <option value="dinheiro">💵 Dinheiro</option>
          <option value="transferencia">🏦 Transferência</option>
        </select>
      </div>
      <div class="text-start">
        <label for="swal-comprovante-despesa" class="form-label fw-semibold">Anexar Comprovante (opcional)</label>
        <input type="file" class="form-control" id="swal-comprovante-despesa" accept="image/png,image/jpeg,image/webp,application/pdf">
        <div class="form-text">Imagem (PNG/JPEG/WEBP) ou PDF, até 4MB.</div>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirmar Pagamento',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#0e3a2f',
    preConfirm: async () => {
      const formaPagamento = document.getElementById('swal-forma-pagamento-despesa').value
      const arquivo = document.getElementById('swal-comprovante-despesa').files[0]

      if (!arquivo) return { formaPagamento }

      try {
        const comprovanteAnexo = await lerComprovanteComoDataURI(arquivo)
        return { formaPagamento, comprovanteAnexo, comprovanteNomeArquivo: arquivo.name }
      } catch (error) {
        Swal.showValidationMessage(error.message)
        return false
      }
    }
  })

  if (!isConfirmed) return

  try {
    await ApiService.atualizarDespesa(id, { status: 'paga', ...resultado })
    toastSucesso('Despesa marcada como paga.')
    await carregarFinanceiro()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao atualizar despesa', text: error.message })
  }
}

async function excluirDespesa (id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Excluir despesa?',
    text: 'Só é possível excluir despesas ainda pendentes.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3d0c13',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Voltar'
  })

  if (!isConfirmed) return

  try {
    await ApiService.removerDespesa(id)
    toastSucesso('Despesa excluída.')
    await carregarFinanceiro()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao excluir despesa', text: error.message })
  }
}

async function desativarDespesaRecorrente (id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Desativar despesa recorrente?',
    text: 'Para de gerar novas ocorrências mensais — as já lançadas continuam existindo.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3d0c13',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sim, desativar',
    cancelButtonText: 'Voltar'
  })

  if (!isConfirmed) return

  try {
    await ApiService.desativarDespesaRecorrente(id)
    toastSucesso('Despesa recorrente desativada.')
    await carregarFinanceiro()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erro ao desativar despesa recorrente', text: error.message })
  }
}
