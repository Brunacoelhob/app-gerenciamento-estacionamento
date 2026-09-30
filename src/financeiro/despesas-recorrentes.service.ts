import { Injectable, NotFoundException } from '@nestjs/common'
import type { UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { AuditoriaService } from '../auditoria/auditoria.service'
import { ehConflitoUnico } from '../common/utils/prisma-erro.util'
import { CriarDespesaRecorrenteDto } from './dto/criar-despesa-recorrente.dto'
import { dataVencimentoNoMes, referenciaAtual } from './financeiro-datas.util'

@Injectable()
export class DespesasRecorrentesService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService
  ) {}

  listar (incluirInativas = false) {
    return this.prisma.despesaRecorrente.findMany({
      where: incluirInativas ? undefined : { ativo: true },
      include: { criadoPor: { select: { nome: true } } },
      orderBy: { categoria: 'asc' }
    })
  }

  async criar (dto: CriarDespesaRecorrenteDto, solicitante: UsuarioAutenticado) {
    const recorrente = await this.prisma.despesaRecorrente.create({
      data: {
        categoria: dto.categoria,
        descricao: dto.descricao,
        valor: dto.valor,
        diaVencimento: dto.diaVencimento,
        criadoPorId: solicitante.id
      }
    })

    // Já nasce com a ocorrência do mês corrente — mesmo espírito de
    // MensalidadeCicloService.abrirNovoCiclo (não fica esperando o próximo
    // acesso pra existir a primeira parcela).
    await this.garantirOcorrenciasDoMes(solicitante)

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: 'despesaRecorrente.criar',
      entidade: 'DespesaRecorrente',
      entidadeId: recorrente.id,
      dadosDepois: { categoria: dto.categoria, descricao: dto.descricao, valor: dto.valor, diaVencimento: dto.diaVencimento }
    })

    return recorrente
  }

  async desativar (id: string, solicitante: UsuarioAutenticado) {
    const recorrente = await this.prisma.despesaRecorrente.findUnique({ where: { id } })
    if (!recorrente) {
      throw new NotFoundException('Despesa recorrente não encontrada.')
    }

    const atualizada = await this.prisma.despesaRecorrente.update({
      where: { id },
      data: { ativo: false }
    })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: 'despesaRecorrente.desativar',
      entidade: 'DespesaRecorrente',
      entidadeId: id
    })

    return atualizada
  }

  /**
   * Geração preguiçosa (lazy) da ocorrência do mês corrente — chamada no
   * início de DespesasService.listar() e FinanceiroService.calcularResumo(),
   * nunca por um job agendado (não existe scheduler no projeto). Para cada
   * molde ativo, cria a Despesa do mês se ainda não existir; a constraint
   * @@unique([despesaRecorrenteId, referencia]) garante que chamadas
   * concorrentes não dupliquem a ocorrência.
   */
  async garantirOcorrenciasDoMes (solicitante: UsuarioAutenticado): Promise<void> {
    const referencia = referenciaAtual()
    const moldesAtivos = await this.prisma.despesaRecorrente.findMany({ where: { ativo: true } })
    if (moldesAtivos.length === 0) return

    const jaGeradas = await this.prisma.despesa.findMany({
      where: { referencia, despesaRecorrenteId: { in: moldesAtivos.map(m => m.id) } },
      select: { despesaRecorrenteId: true }
    })
    const idsJaGerados = new Set(jaGeradas.map(d => d.despesaRecorrenteId))

    const moldesFaltantes = moldesAtivos.filter(m => !idsJaGerados.has(m.id))
    if (moldesFaltantes.length === 0) return

    // Cria uma a uma (não em lote transacional): duas requisições concorrentes
    // no primeiro acesso do mês podem tentar gerar a mesma ocorrência ao
    // mesmo tempo — a constraint @@unique garante que só uma vence, e a
    // outra apenas ignora o conflito em vez de derrubar a listagem inteira.
    for (const molde of moldesFaltantes) {
      try {
        await this.prisma.despesa.create({
          data: {
            categoria: molde.categoria,
            descricao: molde.descricao,
            valor: molde.valor,
            referencia,
            dataVencimento: dataVencimentoNoMes(referencia, molde.diaVencimento),
            despesaRecorrenteId: molde.id,
            criadoPorId: solicitante.id
          }
        })
      } catch (erro) {
        if (!ehConflitoUnico(erro)) throw erro
      }
    }
  }
}
