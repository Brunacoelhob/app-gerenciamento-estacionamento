import { BadRequestException, NotFoundException } from '@nestjs/common'
import { DespesasService } from './despesas.service'

const USUARIO: any = { id: 'u1', role: 'financeiro' }

function criarPrismaFake (seed: { despesas?: any[] } = {}) {
  const despesas = seed.despesas ?? []
  let proximoId = 1

  return {
    despesas,
    despesa: {
      async findMany ({ where }: any = {}) {
        return despesas.filter(d =>
          (!where?.referencia || d.referencia === where.referencia) &&
          (!where?.status || d.status === where.status) &&
          (!where?.categoria || d.categoria === where.categoria)
        )
      },
      async findUnique ({ where: { id } }: any) {
        return despesas.find(d => d.id === id) ?? null
      },
      async create ({ data }: any) {
        const despesa = { id: String(proximoId++), status: 'pendente', ...data }
        despesas.push(despesa)
        return despesa
      },
      async update ({ where: { id }, data }: any) {
        const despesa = despesas.find(d => d.id === id)
        Object.assign(despesa, data)
        return despesa
      },
      async delete ({ where: { id } }: any) {
        const indice = despesas.findIndex(d => d.id === id)
        despesas.splice(indice, 1)
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
  const despesasRecorrentesFake = { garantirOcorrenciasDoMes: async () => {} }
  const service = new DespesasService(prismaFake as any, auditoriaFake as any, despesasRecorrentesFake as any)
  return { service, prismaFake, auditoriaFake }
}

describe('DespesasService', () => {
  describe('criar', () => {
    it('cria uma despesa avulsa com referência derivada do vencimento', async () => {
      const { service, prismaFake, auditoriaFake } = criarService()

      const despesa: any = await service.criar(
        { categoria: 'Manutenção', descricao: 'Reparo de cancela', valor: 450, dataVencimento: '2026-09-15' },
        USUARIO
      )

      expect(despesa.referencia).toBe('2026-09')
      expect(despesa.status).toBe('pendente')
      expect(despesa.criadoPorId).toBe('u1')
      expect(prismaFake.despesas).toHaveLength(1)
      expect(auditoriaFake.chamadas.some((c: any) => c.acao === 'despesa.criar')).toBe(true)
    })

    // Regressão: `new Date('2026-09-15')` (parse ISO direto) é interpretado
    // como meia-noite UTC — em fuso atrás de UTC (Brasil, UTC-3) isso volta
    // um dia (14/09) quando lido de volta com getters locais. criar() precisa
    // usar parseDataVencimento (meia-noite local), não o parser ISO direto.
    it('não perde um dia ao gravar a data de vencimento (fuso do servidor)', async () => {
      const { service } = criarService()

      const despesa: any = await service.criar(
        { categoria: 'Aluguel', descricao: 'Aluguel do galpão', valor: 2000, dataVencimento: '2026-09-15' },
        USUARIO
      )

      expect(despesa.dataVencimento.getFullYear()).toBe(2026)
      expect(despesa.dataVencimento.getMonth()).toBe(8) // setembro = índice 8
      expect(despesa.dataVencimento.getDate()).toBe(15)
    })
  })

  describe('atualizar', () => {
    it('marcar como paga seta dataPagamento e registra auditoria', async () => {
      const { service, prismaFake, auditoriaFake } = criarService({
        despesas: [{ id: 'd1', categoria: 'Água', descricao: 'Conta de água', valor: 120, referencia: '2026-09', status: 'pendente' }]
      })

      const atualizada: any = await service.atualizar('d1', { status: 'paga', formaPagamento: 'pix' }, USUARIO)

      expect(atualizada.status).toBe('paga')
      expect(atualizada.dataPagamento).toBeInstanceOf(Date)
      expect(atualizada.alteradoPorId).toBe('u1')
      expect(prismaFake.despesas[0].status).toBe('paga')
      expect(auditoriaFake.chamadas.some((c: any) => c.acao === 'despesa.pagar')).toBe(true)
    })

    it('recusa editar uma despesa já paga', async () => {
      const { service } = criarService({
        despesas: [{ id: 'd1', categoria: 'Água', descricao: 'Conta de água', valor: 120, referencia: '2026-09', status: 'paga' }]
      })

      await expect(service.atualizar('d1', { valor: 999 }, USUARIO)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('recusa atualizar despesa inexistente', async () => {
      const { service } = criarService()
      await expect(service.atualizar('inexistente', { status: 'paga' }, USUARIO)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('remover', () => {
    it('exclui despesa pendente', async () => {
      const { service, prismaFake } = criarService({
        despesas: [{ id: 'd1', categoria: 'Água', descricao: 'Conta de água', valor: 120, referencia: '2026-09', status: 'pendente' }]
      })

      await service.remover('d1', USUARIO)

      expect(prismaFake.despesas).toHaveLength(0)
    })

    it('recusa excluir despesa já paga', async () => {
      const { service } = criarService({
        despesas: [{ id: 'd1', categoria: 'Água', descricao: 'Conta de água', valor: 120, referencia: '2026-09', status: 'paga' }]
      })

      await expect(service.remover('d1', USUARIO)).rejects.toBeInstanceOf(BadRequestException)
    })

    // Regressão: excluir uma ocorrência gerada por despesa recorrente não
    // "cola" — garantirOcorrenciasDoMes não sabe que ela existiu e foi
    // removida de propósito, então a recriaria sozinha no próximo acesso.
    it('recusa excluir despesa gerada por uma despesa recorrente', async () => {
      const { service, prismaFake } = criarService({
        despesas: [{ id: 'd1', categoria: 'Aluguel', descricao: 'Aluguel', valor: 2000, referencia: '2026-09', status: 'pendente', despesaRecorrenteId: 'r1' }]
      })

      await expect(service.remover('d1', USUARIO)).rejects.toBeInstanceOf(BadRequestException)
      expect(prismaFake.despesas).toHaveLength(1)
    })
  })
})
