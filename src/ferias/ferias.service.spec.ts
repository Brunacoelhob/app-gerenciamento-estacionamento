import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { AuditoriaService } from '../auditoria/auditoria.service'
import { parseDataLocal } from './ferias-datas.util'
import { FeriasService } from './ferias.service'

function criarPrismaFake (seed: { perfis?: any[], ferias?: any[] } = {}) {
  const perfis = seed.perfis ?? []
  const ferias = seed.ferias ?? []

  return {
    ferias,
    perfilRH: {
      async findUnique ({ where: { usuarioId } }: any) { return perfis.find(p => p.usuarioId === usuarioId) ?? null },
      async findMany ({ where }: any) { return perfis.filter(p => p.gestorId === where.gestorId) }
    },
    solicitacaoFerias: {
      async findUnique ({ where: { id } }: any) { return ferias.find(f => f.id === id) ?? null },
      async create ({ data }: any) {
        const nova = { id: `ferias-${ferias.length + 1}`, status: 'pendente', criadoEm: new Date(), ...data }
        ferias.push(nova)
        return nova
      },
      async update ({ where: { id }, data }: any) {
        const solicitacao = ferias.find(f => f.id === id)
        Object.assign(solicitacao, data)
        return solicitacao
      },
      async findMany ({ where }: any) {
        return ferias.filter(f =>
          (!where?.usuarioId || (where.usuarioId.in ? where.usuarioId.in.includes(f.usuarioId) : f.usuarioId === where.usuarioId)) &&
          (!where?.status?.in || where.status.in.includes(f.status))
        )
      }
    }
  }
}

function criarAuditoriaFake (): AuditoriaService {
  return { registrar: jest.fn() } as unknown as AuditoriaService
}

function criarService (seed?: Parameters<typeof criarPrismaFake>[0]) {
  const prismaFake = criarPrismaFake(seed)
  const auditoriaFake = criarAuditoriaFake()
  const service = new FeriasService(prismaFake as any, auditoriaFake)
  return { service, prismaFake, auditoriaFake }
}

const HOJE = new Date(2026, 7, 25) // 25/ago/2026

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(HOJE)
})

afterEach(() => {
  jest.useRealTimers()
})

// 90 dias a partir de hoje (25/ago) cai bem depois de novembro — usado como
// data de início "segura" em cenários que não testam a regra de antecedência.
const INICIO_COM_ANTECEDENCIA = '2026-12-01'
const FIM_COM_ANTECEDENCIA = '2026-12-10' // 10 dias

describe('FeriasService', () => {
  describe('solicitar', () => {
    it('recusa quando não tem perfil de RH', async () => {
      const { service } = criarService()
      await expect(service.solicitar('u1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }))
        .rejects.toBeInstanceOf(NotFoundException)
    })

    it('recusa quando a data de fim é anterior à de início', async () => {
      const { service } = criarService({ perfis: [{ usuarioId: 'u1' }] })
      await expect(service.solicitar('u1', { dataInicio: '2026-12-10', dataFim: '2026-12-01' }))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('recusa quando a antecedência é menor que 90 dias', async () => {
      const { service } = criarService({ perfis: [{ usuarioId: 'u1' }] })
      await expect(service.solicitar('u1', { dataInicio: '2026-09-01', dataFim: '2026-09-10' }))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('cria a solicitação com os dias calculados corretamente (inclusive)', async () => {
      const { service, prismaFake } = criarService({ perfis: [{ usuarioId: 'u1' }] })
      const solicitacao = await service.solicitar('u1', {
        dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA
      })
      expect(solicitacao.dias).toBe(10) // 01 a 10/dez, inclusive
      expect(solicitacao.status).toBe('pendente')
      expect(prismaFake.ferias).toHaveLength(1)
    })

    it('recusa quando ultrapassa 60 dias somando com pendentes/aprovadas do mesmo ano', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'aprovada',
          dias: 55,
          dataInicio: parseDataLocal('2026-01-10'),
          dataFim: parseDataLocal('2026-03-05')
        }]
      })
      await expect(service.solicitar('u1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('recusa quando se sobrepõe a uma solicitação pendente/aprovada existente', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'pendente',
          dias: 5,
          dataInicio: parseDataLocal('2026-12-05'),
          dataFim: parseDataLocal('2026-12-09')
        }]
      })
      await expect(service.solicitar('u1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }))
        .rejects.toBeInstanceOf(ConflictException)
    })

    it('detecta sobreposição na borda exata mesmo com datas no formato real do banco (meia-noite UTC)', async () => {
      // Replica o formato que o Postgres devolve pra @db.Date (meia-noite
      // UTC do dia gravado — ver ferias-datas.util.ts). Sem normalizarDataDoBanco,
      // essa comparação de borda (fim da existente == início da nova) falha
      // silenciosamente por causa do desvio de fuso.
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'pendente',
          dias: 1,
          dataInicio: new Date(Date.UTC(2026, 11, 1)),
          dataFim: new Date(Date.UTC(2026, 11, 1))
        }]
      })
      await expect(service.solicitar('u1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }))
        .rejects.toBeInstanceOf(ConflictException)
    })

    it('conta os dias de um período que atravessa a virada do ano contra o limite de 60/ano de CADA ano tocado, mesmo sem sobrepor a solicitação existente', async () => {
      // Regressão do bug original: f1 (60 dias, 02/dez/2026-30/jan/2027) usa
      // 30 dias de 2026 e 30 dias de 2027. Uma segunda solicitação de 60 dias
      // começando logo depois que f1 termina (31/jan/2027-31/mar/2027, sem
      // se sobrepor a f1) usa mais 60 dias inteiramente em 2027. Antes do
      // fix, o filtro "mesmo ano de início" (2026 vs 2027) escondia f1 da
      // segunda checagem, e as duas solicitações juntas aprovavam 120 dias
      // corridos de férias — quase o dobro do limite anual.
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'aprovada',
          dias: 60,
          dataInicio: parseDataLocal('2026-12-02'),
          dataFim: parseDataLocal('2027-01-30')
        }]
      })
      await expect(service.solicitar('u1', { dataInicio: '2027-01-31', dataFim: '2027-03-31' }))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('recusa quando o total ratreado por ano civil ultrapassa 60 dias, mesmo sem sobrepor a outra solicitação do mesmo ano de destino', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'aprovada',
          dias: 45,
          // 45 dias inteiramente em 2027 (jan-fev).
          dataInicio: parseDataLocal('2027-01-01'),
          dataFim: parseDataLocal('2027-02-14')
        }]
      })
      // Novo período começa logo depois que f1 termina (sem sobreposição de
      // datas), mas soma mais 45 dias em 2027 — 45 + 45 = 90 > 60 no mesmo
      // ano civil, mesmo que o ano de INÍCIO da nova solicitação seja o
      // mesmo de f1 (o bug original só aparecia quando os anos de início
      // diferiam; este caso cobre o rateio por ano civil em si).
      await expect(service.solicitar('u1', { dataInicio: '2027-02-15', dataFim: '2027-03-31' }))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('permite quando não há sobreposição nem estouro de limite', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'u1' }],
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'aprovada',
          dias: 10,
          dataInicio: parseDataLocal('2026-01-10'),
          dataFim: parseDataLocal('2026-01-19')
        }]
      })
      const solicitacao = await service.solicitar('u1', {
        dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA
      })
      expect(solicitacao.dias).toBe(10)
    })
  })

  describe('listar', () => {
    it('funcionário não pode listar férias de outra pessoa', async () => {
      const { service } = criarService()
      const solicitante: any = { id: 'u1', role: 'funcionario' }
      await expect(service.listar(solicitante, 'u2')).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('rh vê férias de todo mundo', async () => {
      const { service } = criarService({
        ferias: [
          { id: 'f1', usuarioId: 'u1', status: 'pendente', dias: 5, dataInicio: parseDataLocal('2026-12-01'), dataFim: parseDataLocal('2026-12-05') },
          { id: 'f2', usuarioId: 'u2', status: 'pendente', dias: 5, dataInicio: parseDataLocal('2026-12-01'), dataFim: parseDataLocal('2026-12-05') }
        ]
      })
      const solicitante: any = { id: 'rh1', role: 'rh' }
      const resultado = await service.listar(solicitante)
      expect(resultado).toHaveLength(2)
    })

    it('gestor vê só as próprias férias e as do time que reporta direto a ele', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'subordinado', gestorId: 'gestor1' }, { usuarioId: 'outroTime', gestorId: 'outroGestor' }],
        ferias: [
          { id: 'f1', usuarioId: 'gestor1', status: 'pendente', dias: 5, dataInicio: parseDataLocal('2026-12-01'), dataFim: parseDataLocal('2026-12-05') },
          { id: 'f2', usuarioId: 'subordinado', status: 'pendente', dias: 5, dataInicio: parseDataLocal('2026-12-01'), dataFim: parseDataLocal('2026-12-05') },
          { id: 'f3', usuarioId: 'outroTime', status: 'pendente', dias: 5, dataInicio: parseDataLocal('2026-12-01'), dataFim: parseDataLocal('2026-12-05') }
        ]
      })
      const solicitante: any = { id: 'gestor1', role: 'gestor' }
      const resultado = await service.listar(solicitante)
      expect(resultado.map((f: any) => f.id).sort()).toEqual(['f1', 'f2'])
    })

    it('gestor não pode listar férias de quem não reporta a ele', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'outroTime', gestorId: 'outroGestor' }]
      })
      const solicitante: any = { id: 'gestor1', role: 'gestor' }
      await expect(service.listar(solicitante, 'outroTime')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('decidir', () => {
    it('recusa decidir uma solicitação já decidida', async () => {
      const { service } = criarService({
        ferias: [{ id: 'f1', usuarioId: 'u1', status: 'aprovada', dias: 5 }]
      })
      const solicitante: any = { id: 'rh1', role: 'rh' }
      await expect(service.decidir('f1', { status: 'rejeitada' }, solicitante))
        .rejects.toBeInstanceOf(ConflictException)
    })

    it('aprova e audita a decisão', async () => {
      const { service, prismaFake, auditoriaFake } = criarService({
        ferias: [{ id: 'f1', usuarioId: 'u1', status: 'pendente', dias: 5 }]
      })
      const solicitante: any = { id: 'rh1', role: 'rh' }

      const resultado = await service.decidir('f1', { status: 'aprovada' }, solicitante)

      expect(resultado.status).toBe('aprovada')
      expect(prismaFake.ferias[0].decididoPorId).toBe('rh1')
      expect(auditoriaFake.registrar).toHaveBeenCalledWith(expect.objectContaining({ acao: 'ferias.aprovar' }))
    })

    it('gestor aprova férias de um subordinado direto', async () => {
      const { service, prismaFake } = criarService({
        perfis: [{ usuarioId: 'subordinado', gestorId: 'gestor1' }],
        ferias: [{ id: 'f1', usuarioId: 'subordinado', status: 'pendente', dias: 5 }]
      })
      const solicitante: any = { id: 'gestor1', role: 'gestor' }

      const resultado = await service.decidir('f1', { status: 'aprovada' }, solicitante)

      expect(resultado.status).toBe('aprovada')
      expect(prismaFake.ferias[0].decididoPorId).toBe('gestor1')
    })

    it('gestor não pode decidir férias de quem não é subordinado direto dele', async () => {
      const { service } = criarService({
        perfis: [{ usuarioId: 'outroTime', gestorId: 'outroGestor' }],
        ferias: [{ id: 'f1', usuarioId: 'outroTime', status: 'pendente', dias: 5 }]
      })
      const solicitante: any = { id: 'gestor1', role: 'gestor' }
      await expect(service.decidir('f1', { status: 'aprovada' }, solicitante))
        .rejects.toBeInstanceOf(ForbiddenException)
    })

    it('admin/rh não pode decidir a própria solicitação de férias', async () => {
      const { service } = criarService({
        ferias: [{ id: 'f1', usuarioId: 'rh1', status: 'pendente', dias: 5 }]
      })
      const solicitante: any = { id: 'rh1', role: 'rh' }
      await expect(service.decidir('f1', { status: 'aprovada' }, solicitante))
        .rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('editar', () => {
    const solicitanteRh: any = { id: 'rh1', role: 'rh' }

    it('recusa editar solicitação inexistente', async () => {
      const { service } = criarService()
      await expect(service.editar('f1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }, solicitanteRh))
        .rejects.toBeInstanceOf(NotFoundException)
    })

    it('recusa editar solicitação já decidida', async () => {
      const { service } = criarService({
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'aprovada',
          dias: 5,
          dataInicio: parseDataLocal('2026-12-01'),
          dataFim: parseDataLocal('2026-12-05')
        }]
      })
      await expect(service.editar('f1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }, solicitanteRh))
        .rejects.toBeInstanceOf(ConflictException)
    })

    it('admin/rh não pode editar a própria solicitação de férias', async () => {
      const { service } = criarService({
        ferias: [{
          id: 'f1',
          usuarioId: 'rh1',
          status: 'pendente',
          dias: 5,
          dataInicio: parseDataLocal('2026-12-01'),
          dataFim: parseDataLocal('2026-12-05')
        }]
      })
      await expect(service.editar('f1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }, solicitanteRh))
        .rejects.toBeInstanceOf(ForbiddenException)
    })

    it('recusa nova data sem 90 dias de antecedência', async () => {
      const { service } = criarService({
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'pendente',
          dias: 5,
          dataInicio: parseDataLocal('2026-12-01'),
          dataFim: parseDataLocal('2026-12-05')
        }]
      })
      await expect(service.editar('f1', { dataInicio: '2026-09-01', dataFim: '2026-09-05' }, solicitanteRh))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('não conta a própria solicitação contra o limite de 60 dias/ano ao reavaliar', async () => {
      const { service } = criarService({
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'pendente',
          dias: 55,
          dataInicio: parseDataLocal('2026-12-01'),
          dataFim: parseDataLocal('2027-01-24')
        }]
      })
      // Editar as próprias datas dessa mesma solicitação (ainda 55 dias) não
      // deveria "bater" com ela mesma e estourar o limite.
      const resultado = await service.editar('f1', { dataInicio: '2026-12-05', dataFim: '2027-01-28' }, solicitanteRh)
      expect(resultado.dias).toBe(55)
    })

    it('recusa nova data que se sobrepõe a OUTRA solicitação pendente/aprovada', async () => {
      const { service } = criarService({
        ferias: [
          {
            id: 'f1',
            usuarioId: 'u1',
            status: 'pendente',
            dias: 5,
            dataInicio: parseDataLocal('2026-12-01'),
            dataFim: parseDataLocal('2026-12-05')
          },
          {
            id: 'f2',
            usuarioId: 'u1',
            status: 'aprovada',
            dias: 5,
            dataInicio: parseDataLocal('2026-12-20'),
            dataFim: parseDataLocal('2026-12-24')
          }
        ]
      })
      await expect(service.editar('f1', { dataInicio: '2026-12-18', dataFim: '2026-12-22' }, solicitanteRh))
        .rejects.toBeInstanceOf(ConflictException)
    })

    it('edita as datas e audita a alteração', async () => {
      const { service, prismaFake, auditoriaFake } = criarService({
        ferias: [{
          id: 'f1',
          usuarioId: 'u1',
          status: 'pendente',
          dias: 5,
          dataInicio: parseDataLocal('2026-12-01'),
          dataFim: parseDataLocal('2026-12-05')
        }]
      })

      const resultado = await service.editar('f1', { dataInicio: INICIO_COM_ANTECEDENCIA, dataFim: FIM_COM_ANTECEDENCIA }, solicitanteRh)

      expect(resultado.dias).toBe(10)
      expect(prismaFake.ferias[0].dataInicio).toEqual(parseDataLocal(INICIO_COM_ANTECEDENCIA))
      expect(auditoriaFake.registrar).toHaveBeenCalledWith(expect.objectContaining({ acao: 'ferias.editar' }))
    })
  })
})
