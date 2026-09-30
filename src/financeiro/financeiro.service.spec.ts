import { FinanceiroService } from './financeiro.service'
import { referenciaAtual } from './financeiro-datas.util'

const USUARIO: any = { id: 'u1', role: 'financeiro' }

// `where.referencia` aparece tanto como igualdade exata (calcularResumo, via
// calcularTotaisDoMes) quanto como range `{ gte }` (calcularEvolucao, que
// busca o período inteiro de uma vez) — este helper cobre as duas formas.
function bateReferencia (valor: string, condicao: any): boolean {
  if (condicao === undefined) return true
  if (typeof condicao === 'string') return valor === condicao
  if (condicao.gte !== undefined) return valor >= condicao.gte
  return true
}

function criarPrismaFake (seed: { tickets?: any[], mensalidades?: any[], despesas?: any[], holerites?: any[] } = {}) {
  const tickets = seed.tickets ?? []
  const mensalidades = seed.mensalidades ?? []
  const despesas = seed.despesas ?? []
  const holerites = seed.holerites ?? []

  return {
    ticket: {
      async aggregate ({ where }: any) {
        const soma = tickets
          .filter(t => t.status === where.status && t.dataSaida >= where.dataSaida.gte && t.dataSaida < where.dataSaida.lt)
          .reduce((acc, t) => acc + Number(t.valorTotal || 0), 0)
        return { _sum: { valorTotal: soma } }
      },
      async findMany ({ where }: any) {
        return tickets.filter(t => t.status === where.status && t.dataSaida >= where.dataSaida.gte)
      }
    },
    mensalidade: {
      async aggregate ({ where }: any) {
        const soma = mensalidades
          .filter(m => m.status === where.status && m.referencia === where.referencia)
          .reduce((acc, m) => acc + Number(m.valor || 0), 0)
        return { _sum: { valor: soma } }
      },
      async findMany ({ where }: any) {
        return mensalidades.filter(m => m.status === where.status && bateReferencia(m.referencia, where.referencia))
      }
    },
    despesa: {
      async aggregate ({ where }: any) {
        const soma = despesas
          .filter(d => d.status === where.status && d.referencia === where.referencia)
          .reduce((acc, d) => acc + Number(d.valor || 0), 0)
        return { _sum: { valor: soma } }
      },
      async findMany ({ where }: any) {
        return despesas.filter(d => d.status === where.status && bateReferencia(d.referencia, where.referencia))
      }
    },
    holerite: {
      async aggregate ({ where }: any) {
        const soma = holerites
          .filter(h => h.status === where.status && h.referencia === where.referencia)
          .reduce((acc, h) => acc + Number(h.salarioLiquido || 0), 0)
        return { _sum: { salarioLiquido: soma } }
      },
      async findMany ({ where }: any) {
        return holerites.filter(h => h.status === where.status && bateReferencia(h.referencia, where.referencia))
      }
    }
  }
}

function criarService (seed?: Parameters<typeof criarPrismaFake>[0]) {
  const prismaFake = criarPrismaFake(seed)
  const despesasRecorrentesFake = { garantirOcorrenciasDoMes: async () => {} }
  const service = new FinanceiroService(prismaFake as any, despesasRecorrentesFake as any)
  return { service, prismaFake }
}

describe('FinanceiroService', () => {
  describe('calcularResumo', () => {
    it('calcula receita, despesa (incluindo folha) e lucro do mês corrente', async () => {
      const referencia = referenciaAtual()
      const inicioDoMes = new Date(referencia + '-10')
      const { service } = criarService({
        tickets: [{ status: 'fechado', valorTotal: 100, dataSaida: inicioDoMes }],
        mensalidades: [{ status: 'paga', referencia, valor: 300 }],
        despesas: [{ status: 'paga', referencia, valor: 150 }],
        holerites: [{ status: 'pago', referencia, salarioLiquido: 2000 }]
      })

      const resumo = await service.calcularResumo(undefined, USUARIO)

      expect(resumo.receitaTickets).toBe(100)
      expect(resumo.receitaMensalidades).toBe(300)
      expect(resumo.receitaTotal).toBe(400)
      expect(resumo.custoFolha).toBe(2000)
      expect(resumo.despesaTotal).toBe(2150) // 150 pago + 2000 folha
      expect(resumo.lucroLiquido).toBe(400 - 2150)
    })

    it('marca despesas pendentes vencidas como atrasadas', async () => {
      const referencia = referenciaAtual()
      const vencida = new Date(2020, 0, 1) // bem no passado
      const aVencer = new Date(2099, 0, 1) // bem no futuro
      const { service } = criarService({
        despesas: [
          { referencia, status: 'pendente', valor: 50, dataVencimento: vencida },
          { referencia, status: 'pendente', valor: 70, dataVencimento: aVencer }
        ]
      })

      const resumo: any = await service.calcularResumo(undefined, USUARIO)

      expect(resumo.despesasPendentes).toBe(120)
      expect(resumo.despesasAtrasadas).toBe(50)
      const vencidaNaLista = resumo.listaDespesasPendentes.find((d: any) => d.valor === 50)
      const aVencerNaLista = resumo.listaDespesasPendentes.find((d: any) => d.valor === 70)
      expect(vencidaNaLista.atrasada).toBe(true)
      expect(aVencerNaLista.atrasada).toBe(false)
    })

    // Regressão: uma despesa que vence HOJE não pode aparecer como atrasada
    // (bug corrigido — ver estaAtrasada em financeiro-datas.util.ts).
    it('não marca como atrasada uma despesa que vence hoje', async () => {
      const referencia = referenciaAtual()
      const hoje = new Date()
      const venceHojeComoViriaDoBanco = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
      const { service } = criarService({
        despesas: [{ referencia, status: 'pendente', valor: 90, dataVencimento: venceHojeComoViriaDoBanco }]
      })

      const resumo: any = await service.calcularResumo(undefined, USUARIO)

      expect(resumo.despesasAtrasadas).toBe(0)
      expect(resumo.listaDespesasPendentes[0].atrasada).toBe(false)
    })

    it('retorna variação nula no comparativo quando não há dados no mês anterior', async () => {
      const { service } = criarService()
      const resumo = await service.calcularResumo(undefined, USUARIO)
      expect(resumo.comparativoMesAnterior.variacaoReceita).toBeNull()
    })
  })

  describe('calcularEvolucao', () => {
    it('retorna uma entrada por mês, do mais antigo pro mais recente, terminando no mês corrente', async () => {
      const { service } = criarService()
      const evolucao = await service.calcularEvolucao(3)

      expect(evolucao).toHaveLength(3)
      expect(evolucao[2].referencia).toBe(referenciaAtual())
    })

    it('soma receita/despesa/lucro do mês corrente e ignora meses fora da janela pedida', async () => {
      const referencia = referenciaAtual()
      const inicioDoMes = new Date(referencia + '-10')
      const { service } = criarService({
        tickets: [{ status: 'fechado', valorTotal: 100, dataSaida: inicioDoMes }],
        mensalidades: [{ status: 'paga', referencia, valor: 300 }],
        despesas: [
          { status: 'paga', referencia, valor: 150 },
          // Mais de 24 meses atrás — fora de qualquer janela pedida no teste.
          { status: 'paga', referencia: '2000-01', valor: 999 }
        ],
        holerites: [{ status: 'pago', referencia, salarioLiquido: 2000 }]
      })

      const evolucao = await service.calcularEvolucao(1)

      expect(evolucao).toHaveLength(1)
      expect(evolucao[0].referencia).toBe(referencia)
      expect(evolucao[0].receita).toBe(400) // 100 ticket + 300 mensalidade
      expect(evolucao[0].despesa).toBe(2150) // 150 despesa + 2000 folha
      expect(evolucao[0].lucro).toBe(400 - 2150)
    })
  })
})
