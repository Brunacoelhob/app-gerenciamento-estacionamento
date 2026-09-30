import { Injectable } from '@nestjs/common'
import type { UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { DespesasRecorrentesService } from './despesas-recorrentes.service'
import { estaAtrasada, referenciaAnterior, referenciaAtual, referenciaDe, rangeDoMes } from './financeiro-datas.util'

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function variacaoPercentual (atual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

interface TotaisDoMes {
  receitaTickets: number
  receitaMensalidades: number
  despesasPagas: number
  custoFolha: number
}

@Injectable()
export class FinanceiroService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly despesasRecorrentesService: DespesasRecorrentesService
  ) {}

  // Agregados de um único mês de competência — reaproveitado pelo resumo
  // (mês atual + mês anterior, pro comparativo) e pela série de evolução.
  private async calcularTotaisDoMes (referencia: string): Promise<TotaisDoMes> {
    const { inicio, fim } = rangeDoMes(referencia)

    const [ticketsAgg, mensalidadesAgg, despesasPagasAgg, holeritesAgg] = await Promise.all([
      this.prisma.ticket.aggregate({
        where: { status: 'fechado', dataSaida: { gte: inicio, lt: fim } },
        _sum: { valorTotal: true }
      }),
      this.prisma.mensalidade.aggregate({
        where: { status: 'paga', referencia },
        _sum: { valor: true }
      }),
      this.prisma.despesa.aggregate({
        where: { status: 'paga', referencia },
        _sum: { valor: true }
      }),
      this.prisma.holerite.aggregate({
        where: { status: 'pago', referencia },
        _sum: { salarioLiquido: true }
      })
    ])

    return {
      receitaTickets: Number(ticketsAgg._sum.valorTotal || 0),
      receitaMensalidades: Number(mensalidadesAgg._sum.valor || 0),
      despesasPagas: Number(despesasPagasAgg._sum.valor || 0),
      custoFolha: Number(holeritesAgg._sum.salarioLiquido || 0)
    }
  }

  private montarResumo (totais: TotaisDoMes) {
    const receitaTotal = totais.receitaTickets + totais.receitaMensalidades
    const despesaTotal = totais.despesasPagas + totais.custoFolha
    const lucroLiquido = receitaTotal - despesaTotal
    const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : null

    return { ...totais, receitaTotal, despesaTotal, lucroLiquido, margemLucro }
  }

  /**
   * DRE simplificado de um mês de competência: receita (tickets +
   * mensalidades) menos despesa (contas pagas + folha de pagamento paga no
   * mês) = lucro líquido. Despesas ainda pendentes entram à parte (visão de
   * contas a pagar), não abatem o lucro já realizado.
   */
  async calcularResumo (referencia: string | undefined, solicitante: UsuarioAutenticado) {
    const referenciaAlvo = referencia || referenciaAtual()

    // Só garante a ocorrência do mês corrente (não tem sentido "gerar" uma
    // despesa recorrente retroativa pra um mês passado que já fechou).
    if (referenciaAlvo === referenciaAtual()) {
      await this.despesasRecorrentesService.garantirOcorrenciasDoMes(solicitante)
    }

    const referenciaAnteriorAlvo = referenciaAnterior(referenciaAlvo)

    const [totaisAtual, totaisAnterior, despesasPendentes] = await Promise.all([
      this.calcularTotaisDoMes(referenciaAlvo),
      this.calcularTotaisDoMes(referenciaAnteriorAlvo),
      this.prisma.despesa.findMany({
        where: { referencia: referenciaAlvo, status: 'pendente' },
        include: { despesaRecorrente: { select: { categoria: true } } },
        orderBy: { dataVencimento: 'asc' }
      })
    ])

    const resumoAtual = this.montarResumo(totaisAtual)
    const resumoAnterior = this.montarResumo(totaisAnterior)

    const despesasPendentesComStatus = despesasPendentes.map(d => ({
      ...d,
      valor: Number(d.valor),
      atrasada: estaAtrasada(d.dataVencimento)
    }))
    const totalDespesasPendentes = despesasPendentesComStatus.reduce((soma, d) => soma + d.valor, 0)
    const totalDespesasAtrasadas = despesasPendentesComStatus
      .filter(d => d.atrasada)
      .reduce((soma, d) => soma + d.valor, 0)

    return {
      referencia: referenciaAlvo,
      ...resumoAtual,
      despesasPendentes: totalDespesasPendentes,
      despesasAtrasadas: totalDespesasAtrasadas,
      listaDespesasPendentes: despesasPendentesComStatus,
      comparativoMesAnterior: {
        referencia: referenciaAnteriorAlvo,
        receitaTotal: resumoAnterior.receitaTotal,
        despesaTotal: resumoAnterior.despesaTotal,
        lucroLiquido: resumoAnterior.lucroLiquido,
        variacaoReceita: variacaoPercentual(resumoAtual.receitaTotal, resumoAnterior.receitaTotal),
        variacaoDespesa: variacaoPercentual(resumoAtual.despesaTotal, resumoAnterior.despesaTotal),
        variacaoLucro: variacaoPercentual(resumoAtual.lucroLiquido, resumoAnterior.lucroLiquido)
      }
    }
  }

  // Série mensal (mais antigo -> mais recente) pro gráfico de evolução da
  // tela Financeiro — mesmo estilo de MetricasService.calcular (busca tudo
  // do período de uma vez e soma em JS), não N consultas agregadas por mês:
  // calcularTotaisDoMes faz 4 aggregate() em paralelo por referência, então
  // usá-lo aqui disparia até `meses * 4` queries simultâneas (96 pra
  // meses=24). Com 4 findMany() cobrindo o período inteiro, o total fica
  // constante independente de quantos meses o gráfico pedir.
  async calcularEvolucao (meses: number) {
    const referencias: string[] = []
    let cursor = referenciaAtual()
    for (let i = 0; i < meses; i++) {
      referencias.unshift(cursor)
      cursor = referenciaAnterior(cursor)
    }

    const referenciaMaisAntiga = referencias[0]
    const { inicio: inicioDoPeriodo } = rangeDoMes(referenciaMaisAntiga)

    const [tickets, mensalidades, despesas, holerites] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { status: 'fechado', dataSaida: { gte: inicioDoPeriodo } },
        select: { dataSaida: true, valorTotal: true }
      }),
      this.prisma.mensalidade.findMany({
        where: { status: 'paga', referencia: { gte: referenciaMaisAntiga } },
        select: { referencia: true, valor: true }
      }),
      this.prisma.despesa.findMany({
        where: { status: 'paga', referencia: { gte: referenciaMaisAntiga } },
        select: { referencia: true, valor: true }
      }),
      this.prisma.holerite.findMany({
        where: { status: 'pago', referencia: { gte: referenciaMaisAntiga } },
        select: { referencia: true, salarioLiquido: true }
      })
    ])

    const receitaPorMes: Record<string, number> = {}
    tickets.forEach(t => {
      if (!t.dataSaida) return
      const ref = referenciaDe(t.dataSaida)
      receitaPorMes[ref] = (receitaPorMes[ref] || 0) + Number(t.valorTotal || 0)
    })
    mensalidades.forEach(m => {
      receitaPorMes[m.referencia] = (receitaPorMes[m.referencia] || 0) + Number(m.valor || 0)
    })

    const despesaPorMes: Record<string, number> = {}
    despesas.forEach(d => {
      despesaPorMes[d.referencia] = (despesaPorMes[d.referencia] || 0) + Number(d.valor || 0)
    })
    holerites.forEach(h => {
      despesaPorMes[h.referencia] = (despesaPorMes[h.referencia] || 0) + Number(h.salarioLiquido || 0)
    })

    return referencias.map(ref => {
      const receita = receitaPorMes[ref] || 0
      const despesa = despesaPorMes[ref] || 0
      const [ano, mes] = ref.split('-')
      return {
        mes: `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`,
        referencia: ref,
        receita,
        despesa,
        lucro: receita - despesa
      }
    })
  }
}
