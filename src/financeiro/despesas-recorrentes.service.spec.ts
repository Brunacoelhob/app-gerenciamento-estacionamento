import { NotFoundException } from '@nestjs/common'
import { DespesasRecorrentesService } from './despesas-recorrentes.service'
import { referenciaAtual } from './financeiro-datas.util'

const USUARIO: any = { id: 'u1', role: 'financeiro' }

function criarPrismaFake (seed: { recorrentes?: any[], despesas?: any[] } = {}) {
  const recorrentes = seed.recorrentes ?? []
  const despesas = seed.despesas ?? []
  let proximoRecorrenteId = 1
  let proximoDespesaId = 1

  return {
    recorrentes,
    despesas,
    despesaRecorrente: {
      async findMany ({ where }: any = {}) {
        if (!where) return [...recorrentes]
        return recorrentes.filter(r => where.ativo === undefined || r.ativo === where.ativo)
      },
      async findUnique ({ where: { id } }: any) {
        return recorrentes.find(r => r.id === id) ?? null
      },
      async create ({ data }: any) {
        const recorrente = { id: String(proximoRecorrenteId++), ativo: true, ...data }
        recorrentes.push(recorrente)
        return recorrente
      },
      async update ({ where: { id }, data }: any) {
        const recorrente = recorrentes.find(r => r.id === id)
        Object.assign(recorrente, data)
        return recorrente
      }
    },
    despesa: {
      async findMany ({ where }: any) {
        return despesas.filter(d =>
          d.referencia === where.referencia &&
          where.despesaRecorrenteId.in.includes(d.despesaRecorrenteId)
        )
      },
      async create ({ data }: any) {
        const existente = despesas.find(
          d => d.despesaRecorrenteId === data.despesaRecorrenteId && d.referencia === data.referencia
        )
        if (existente) {
          const erro: any = new Error('unique violation')
          erro.code = 'P2002'
          const { Prisma } = require('../../generated/prisma')
          Object.setPrototypeOf(erro, Prisma.PrismaClientKnownRequestError.prototype)
          throw erro
        }
        const despesa = { id: String(proximoDespesaId++), status: 'pendente', ...data }
        despesas.push(despesa)
        return despesa
      }
    }
  }
}

function criarAuditoriaFake () {
  const chamadas: any[] = []
  return { chamadas, registrar: async (params: any) => { chamadas.push(params) } }
}

function criarService (seed?: Parameters<typeof criarPrismaFake>[0]) {
  const prismaFake = criarPrismaFake(seed)
  const auditoriaFake = criarAuditoriaFake()
  const service = new DespesasRecorrentesService(prismaFake as any, auditoriaFake as any)
  return { service, prismaFake, auditoriaFake }
}

describe('DespesasRecorrentesService', () => {
  describe('garantirOcorrenciasDoMes', () => {
    it('gera a ocorrência do mês corrente para um molde ativo que ainda não tem uma', async () => {
      const { service, prismaFake } = criarService({
        recorrentes: [{ id: 'r1', categoria: 'Aluguel', descricao: 'Aluguel do galpão', valor: 2000, diaVencimento: 5, ativo: true }]
      })

      await service.garantirOcorrenciasDoMes(USUARIO)

      expect(prismaFake.despesas).toHaveLength(1)
      expect(prismaFake.despesas[0].referencia).toBe(referenciaAtual())
      expect(prismaFake.despesas[0].despesaRecorrenteId).toBe('r1')
      expect(prismaFake.despesas[0].status).toBe('pendente')
    })

    it('não duplica a ocorrência se chamado duas vezes no mesmo mês', async () => {
      const { service, prismaFake } = criarService({
        recorrentes: [{ id: 'r1', categoria: 'Aluguel', descricao: 'Aluguel', valor: 2000, diaVencimento: 5, ativo: true }]
      })

      await service.garantirOcorrenciasDoMes(USUARIO)
      await service.garantirOcorrenciasDoMes(USUARIO)

      expect(prismaFake.despesas).toHaveLength(1)
    })

    it('não gera ocorrência para molde inativo', async () => {
      const { service, prismaFake } = criarService({
        recorrentes: [{ id: 'r1', categoria: 'Aluguel', descricao: 'Aluguel', valor: 2000, diaVencimento: 5, ativo: false }]
      })

      await service.garantirOcorrenciasDoMes(USUARIO)

      expect(prismaFake.despesas).toHaveLength(0)
    })
  })

  describe('criar', () => {
    it('cria o molde e já gera a ocorrência do mês corrente', async () => {
      const { service, prismaFake, auditoriaFake } = criarService()

      const recorrente: any = await service.criar(
        { categoria: 'Internet', descricao: 'Link dedicado', valor: 300, diaVencimento: 10 },
        USUARIO
      )

      expect(recorrente.ativo).toBe(true)
      expect(prismaFake.despesas).toHaveLength(1)
      expect(prismaFake.despesas[0].despesaRecorrenteId).toBe(recorrente.id)
      expect(auditoriaFake.chamadas.some((c: any) => c.acao === 'despesaRecorrente.criar')).toBe(true)
    })
  })

  describe('desativar', () => {
    it('marca o molde como inativo', async () => {
      const { service, prismaFake } = criarService({
        recorrentes: [{ id: 'r1', categoria: 'Aluguel', descricao: 'Aluguel', valor: 2000, diaVencimento: 5, ativo: true }]
      })

      const atualizado: any = await service.desativar('r1', USUARIO)

      expect(atualizado.ativo).toBe(false)
      expect(prismaFake.recorrentes[0].ativo).toBe(false)
    })

    it('recusa desativar molde inexistente', async () => {
      const { service } = criarService()
      await expect(service.desativar('inexistente', USUARIO)).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
