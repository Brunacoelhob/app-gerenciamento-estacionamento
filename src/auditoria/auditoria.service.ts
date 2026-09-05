import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '../../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

export interface RegistrarAuditoriaParams {
  usuarioId: string
  papel: string
  acao: string
  entidade: string
  entidadeId: string
  dadosAntes?: Record<string, unknown> | null
  dadosDepois?: Record<string, unknown> | null
}

export interface FiltrosAuditoria {
  entidade?: string
  entidadeId?: string
  usuarioId?: string
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name)

  constructor (private readonly prisma: PrismaService) {}

  // Chamado manualmente (sem interceptor/decorator) por cada service de RH
  // que altera dado sensível — mesmo estilo "explícito" já usado no projeto
  // (ver Mensalidade.alteradoPor). Nunca lança: um log de auditoria que falha
  // não deve derrubar a operação de negócio que está sendo registrada — o
  // try/catch abaixo cumpre essa promessa de fato (antes, qualquer falha no
  // insert — FK inválida, indisponibilidade momentânea do banco — propagava
  // e abortava a operação de negócio que estava sendo auditada).
  async registrar (params: RegistrarAuditoriaParams): Promise<void> {
    try {
      await this.prisma.logAuditoria.create({
        data: {
          usuarioId: params.usuarioId,
          papel: params.papel as Prisma.LogAuditoriaCreateInput['papel'],
          acao: params.acao,
          entidade: params.entidade,
          entidadeId: params.entidadeId,
          dadosAntes: (params.dadosAntes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          dadosDepois: (params.dadosDepois as Prisma.InputJsonValue) ?? Prisma.JsonNull
        }
      })
    } catch (erro) {
      this.logger.error({ err: erro, ...params }, 'Falha ao gravar log de auditoria')
    }
  }

  // GET /auditoria — restrito a admin e rh (ver RolesGuard no controller).
  async listar (filtros: FiltrosAuditoria = {}) {
    return await this.prisma.logAuditoria.findMany({
      where: {
        ...(filtros.entidade ? { entidade: filtros.entidade } : {}),
        ...(filtros.entidadeId ? { entidadeId: filtros.entidadeId } : {}),
        ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {})
      },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' }
    })
  }
}
