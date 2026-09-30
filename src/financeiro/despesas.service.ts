import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { AuditoriaService } from '../auditoria/auditoria.service'
import { DespesasRecorrentesService } from './despesas-recorrentes.service'
import { AtualizarDespesaDto } from './dto/atualizar-despesa.dto'
import { CriarDespesaDto } from './dto/criar-despesa.dto'
import { parseDataVencimento } from './financeiro-datas.util'

export interface FiltrosDespesa {
  referencia?: string
  status?: string
  categoria?: string
}

@Injectable()
export class DespesasService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
    private readonly despesasRecorrentesService: DespesasRecorrentesService
  ) {}

  async listar (filtros: FiltrosDespesa, solicitante: UsuarioAutenticado) {
    // Garante que a ocorrência do mês corrente de cada despesa recorrente
    // ativa já existe antes de listar — ver DespesasRecorrentesService.
    await this.despesasRecorrentesService.garantirOcorrenciasDoMes(solicitante)

    return await this.prisma.despesa.findMany({
      where: {
        ...(filtros.referencia ? { referencia: filtros.referencia } : {}),
        ...(filtros.status ? { status: filtros.status as any } : {}),
        ...(filtros.categoria ? { categoria: filtros.categoria } : {})
      },
      include: {
        criadoPor: { select: { nome: true } },
        alteradoPor: { select: { nome: true } },
        despesaRecorrente: { select: { id: true, categoria: true } }
      },
      orderBy: { dataVencimento: 'desc' }
    })
  }

  async criar (dto: CriarDespesaDto, solicitante: UsuarioAutenticado) {
    const despesa = await this.prisma.despesa.create({
      data: {
        categoria: dto.categoria,
        descricao: dto.descricao,
        valor: dto.valor,
        referencia: dto.dataVencimento.slice(0, 7),
        dataVencimento: parseDataVencimento(dto.dataVencimento),
        observacoes: dto.observacoes,
        criadoPorId: solicitante.id
      }
    })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: 'despesa.criar',
      entidade: 'Despesa',
      entidadeId: despesa.id,
      dadosDepois: { categoria: dto.categoria, descricao: dto.descricao, valor: dto.valor, dataVencimento: dto.dataVencimento }
    })

    return despesa
  }

  async atualizar (id: string, dto: AtualizarDespesaDto, solicitante: UsuarioAutenticado) {
    const despesa = await this.prisma.despesa.findUnique({ where: { id } })
    if (!despesa) {
      throw new NotFoundException('Despesa não encontrada.')
    }
    if (despesa.status === 'paga' && dto.status !== 'pendente') {
      // Uma despesa já paga fica imutável (mesma filosofia de holerite
      // pago) — a única mudança permitida depois de paga é reabri-la.
      throw new BadRequestException('Esta despesa já foi paga e não pode mais ser editada.')
    }

    const marcandoComoPaga = dto.status === 'paga' && despesa.status !== 'paga'

    const atualizada = await this.prisma.despesa.update({
      where: { id },
      data: {
        ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.dataVencimento !== undefined
          ? { dataVencimento: parseDataVencimento(dto.dataVencimento), referencia: dto.dataVencimento.slice(0, 7) }
          : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.formaPagamento !== undefined ? { formaPagamento: dto.formaPagamento } : {}),
        ...(dto.comprovanteAnexo !== undefined ? { comprovanteAnexo: dto.comprovanteAnexo } : {}),
        ...(dto.comprovanteNomeArquivo !== undefined ? { comprovanteNomeArquivo: dto.comprovanteNomeArquivo } : {}),
        ...(marcandoComoPaga ? { dataPagamento: new Date() } : {}),
        ...(dto.status === 'pendente' ? { dataPagamento: null } : {}),
        alteradoPorId: solicitante.id,
        alteradoEm: new Date()
      }
    })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: marcandoComoPaga ? 'despesa.pagar' : 'despesa.editar',
      entidade: 'Despesa',
      entidadeId: id,
      dadosAntes: { status: despesa.status, valor: Number(despesa.valor) },
      dadosDepois: { status: atualizada.status, valor: Number(atualizada.valor) }
    })

    return atualizada
  }

  async remover (id: string, solicitante: UsuarioAutenticado) {
    const despesa = await this.prisma.despesa.findUnique({ where: { id } })
    if (!despesa) {
      throw new NotFoundException('Despesa não encontrada.')
    }
    if (despesa.status !== 'pendente') {
      throw new BadRequestException('Só é possível excluir despesas pendentes.')
    }
    if (despesa.despesaRecorrenteId) {
      // Excluir aqui só teria efeito até o próximo acesso: garantirOcorrenciasDoMes
      // não tem como saber que esta ocorrência já existiu e foi removida de
      // propósito, então a recriaria sozinha na próxima listagem/resumo. Quem
      // não quer mais essa despesa deve desativar a recorrência (ou editar o
      // valor/descrição desta ocorrência, que permanece permitido).
      throw new BadRequestException('Esta despesa foi gerada por uma despesa recorrente — desative a recorrência em vez de excluir a ocorrência.')
    }

    await this.prisma.despesa.delete({ where: { id } })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: 'despesa.excluir',
      entidade: 'Despesa',
      entidadeId: id,
      dadosAntes: { categoria: despesa.categoria, descricao: despesa.descricao, valor: Number(despesa.valor) }
    })

    return { removida: true }
  }
}
