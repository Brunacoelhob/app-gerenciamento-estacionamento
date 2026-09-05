import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditoriaService } from '../auditoria/auditoria.service'
import type { UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ehGestaoDeRh } from '../common/utils/papel.util'
import { PrismaService } from '../prisma/prisma.service'
import { DecidirFeriasDto } from './dto/decidir-ferias.dto'
import { SolicitarFeriasDto } from './dto/solicitar-ferias.dto'
import { anosDoPeriodo, dataSemHora, diasNoAno, diferencaEmDias, normalizarDataDoBanco, parseDataLocal } from './ferias-datas.util'

const ANTECEDENCIA_MINIMA_DIAS = 90
const LIMITE_DIAS_POR_ANO = 60

@Injectable()
export class FeriasService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService
  ) {}

  async solicitar (usuarioId: string, dto: SolicitarFeriasDto) {
    const perfil = await this.prisma.perfilRH.findUnique({ where: { usuarioId } })
    if (!perfil) {
      throw new NotFoundException('Você ainda não tem um perfil de RH cadastrado. Fale com o RH.')
    }

    const dataInicio = parseDataLocal(dto.dataInicio)
    const dataFim = parseDataLocal(dto.dataFim)
    const dias = await this.validarRegras(usuarioId, dataInicio, dataFim)

    return await this.prisma.solicitacaoFerias.create({ data: { usuarioId, dataInicio, dataFim, dias } })
  }

  // Compartilhado por solicitar() e editar(): antecedência mínima, limite de
  // 60 dias/ano (rateado por ano civil) e sobreposição contra TODAS as
  // solicitações pendente/aprovada do usuário. `ignorarId` exclui a própria
  // solicitação da soma/checagem de sobreposição — necessário ao editar,
  // senão ela sempre "bateria" com ela mesma.
  private async validarRegras (
    usuarioId: string,
    dataInicio: Date,
    dataFim: Date,
    ignorarId?: string
  ): Promise<number> {
    if (dataFim < dataInicio) {
      throw new BadRequestException('A data de fim não pode ser anterior à data de início.')
    }
    const dias = diferencaEmDias(dataFim, dataInicio) + 1

    const hoje = dataSemHora(new Date())
    if (diferencaEmDias(dataInicio, hoje) < ANTECEDENCIA_MINIMA_DIAS) {
      throw new BadRequestException(
        `Férias precisam ser solicitadas com pelo menos ${ANTECEDENCIA_MINIMA_DIAS} dias de antecedência.`
      )
    }

    // Soma contra pendente+aprovada (não só aprovada): se todas as
    // pendentes fossem aprovadas, não pode passar de 60 dias/ano — evita
    // aprovar/rejeitar só por causa de estouro de limite depois do fato.
    //
    // Importante: busca TODAS as solicitações ativas do usuário, sem
    // filtrar por ano — um período que começa em dezembro/2026 e termina em
    // janeiro/2027 precisa ser comparado (sobreposição) e contado (limite,
    // rateado por ano civil via diasNoAno) contra qualquer outra
    // solicitação, mesmo uma que comece só no ano seguinte. Filtrar por
    // "mesmo ano de início" deixava dois períodos de 60 dias cada, um
    // começando em dez/2026 e outro em jan/2027, completamente invisíveis
    // um para o outro.
    const solicitacoesAtivas = (await this.prisma.solicitacaoFerias.findMany({
      where: { usuarioId, status: { in: ['pendente', 'aprovada'] } }
    })).filter(s => s.id !== ignorarId)

    const sobrepoe = solicitacoesAtivas.some(s => {
      const inicioExistente = normalizarDataDoBanco(s.dataInicio)
      const fimExistente = normalizarDataDoBanco(s.dataFim)
      return dataInicio <= fimExistente && dataFim >= inicioExistente
    })
    if (sobrepoe) {
      throw new ConflictException('Já existe uma solicitação sua (pendente ou aprovada) que se sobrepõe a este período.')
    }

    for (const ano of anosDoPeriodo(dataInicio, dataFim)) {
      const diasNoAnoAtual = diasNoAno(dataInicio, dataFim, ano)
      const diasJaUsadosNoAno = solicitacoesAtivas.reduce((soma, s) => {
        const inicioExistente = normalizarDataDoBanco(s.dataInicio)
        const fimExistente = normalizarDataDoBanco(s.dataFim)
        return soma + diasNoAno(inicioExistente, fimExistente, ano)
      }, 0)

      if (diasJaUsadosNoAno + diasNoAnoAtual > LIMITE_DIAS_POR_ANO) {
        throw new BadRequestException(
          `Você já tem ${diasJaUsadosNoAno} dia(s) de férias solicitados/aprovados em ${ano}. Esta solicitação ultrapassaria o limite de ${LIMITE_DIAS_POR_ANO} dias por ano em ${ano}.`
        )
      }
    }

    return dias
  }

  // Admin/RH corrigindo as datas de uma solicitação ainda pendente (ex.:
  // ajuste combinado com o funcionário) — diferente de decidir(), que só
  // aprova/rejeita. Reaplica as mesmas regras de solicitar() contra a nova
  // data, excluindo a própria solicitação da soma/sobreposição.
  async editar (id: string, dto: SolicitarFeriasDto, solicitante: UsuarioAutenticado) {
    const solicitacao = await this.prisma.solicitacaoFerias.findUnique({ where: { id } })
    if (!solicitacao) {
      throw new NotFoundException('Solicitação de férias não encontrada.')
    }
    if (solicitacao.status !== 'pendente') {
      throw new ConflictException('Só é possível editar uma solicitação ainda pendente.')
    }
    // Mesma lógica de decidir(): admin/rh não edita as próprias datas de
    // férias sem um segundo par de olhos — evita reescrever o próprio
    // período pendente pra escapar do limite anual ou de uma sobreposição.
    if (solicitacao.usuarioId === solicitante.id) {
      throw new ForbiddenException('Você não pode editar a própria solicitação de férias.')
    }

    const dataInicio = parseDataLocal(dto.dataInicio)
    const dataFim = parseDataLocal(dto.dataFim)
    const dias = await this.validarRegras(solicitacao.usuarioId, dataInicio, dataFim, id)

    const atualizada = await this.prisma.solicitacaoFerias.update({
      where: { id },
      data: { dataInicio, dataFim, dias }
    })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: 'ferias.editar',
      entidade: 'SolicitacaoFerias',
      entidadeId: id,
      dadosAntes: { dataInicio: solicitacao.dataInicio, dataFim: solicitacao.dataFim, dias: solicitacao.dias },
      dadosDepois: { dataInicio: atualizada.dataInicio, dataFim: atualizada.dataFim, dias: atualizada.dias }
    })

    return atualizada
  }

  async listar (solicitante: UsuarioAutenticado, usuarioId?: string) {
    if (ehGestaoDeRh(solicitante.role)) {
      return await this.prisma.solicitacaoFerias.findMany({
        where: usuarioId ? { usuarioId } : {},
        include: { usuario: { select: { nome: true } } },
        orderBy: { dataInicio: 'desc' }
      })
    }

    // Gestor: mesma coisa que RH/admin, mas restrito às próprias
    // solicitações + as do time que reporta direto a ele (via
    // PerfilRH.gestorId) — nunca as de outros times.
    if (solicitante.role === 'gestor') {
      if (usuarioId && usuarioId !== solicitante.id) {
        await this.exigirSubordinadoDireto(usuarioId, solicitante.id)
      }
      const idsDoTime = await this.idsSubordinadosDiretos(solicitante.id)
      return await this.prisma.solicitacaoFerias.findMany({
        where: usuarioId ? { usuarioId } : { usuarioId: { in: [solicitante.id, ...idsDoTime] } },
        include: { usuario: { select: { nome: true } } },
        orderBy: { dataInicio: 'desc' }
      })
    }

    if (usuarioId && usuarioId !== solicitante.id) {
      throw new ForbiddenException('Você só pode ver as próprias solicitações de férias.')
    }
    return await this.prisma.solicitacaoFerias.findMany({
      where: { usuarioId: solicitante.id },
      orderBy: { dataInicio: 'desc' }
    })
  }

  // Confere se `usuarioId` reporta diretamente a `gestorId` (PerfilRH.gestorId)
  // — usado pelo Gestor tanto pra listar quanto pra decidir férias de terceiros,
  // já que ele só pode enxergar/aprovar o próprio time, nunca a empresa toda.
  private async exigirSubordinadoDireto (usuarioId: string, gestorId: string) {
    const perfil = await this.prisma.perfilRH.findUnique({ where: { usuarioId }, select: { gestorId: true } })
    if (perfil?.gestorId !== gestorId) {
      throw new ForbiddenException('Você só pode ver ou decidir solicitações de férias do seu próprio time.')
    }
  }

  private async idsSubordinadosDiretos (gestorId: string): Promise<string[]> {
    const subordinados = await this.prisma.perfilRH.findMany({ where: { gestorId }, select: { usuarioId: true } })
    return subordinados.map(s => s.usuarioId)
  }

  async decidir (id: string, dto: DecidirFeriasDto, solicitante: UsuarioAutenticado) {
    const solicitacao = await this.prisma.solicitacaoFerias.findUnique({ where: { id } })
    if (!solicitacao) {
      throw new NotFoundException('Solicitação de férias não encontrada.')
    }
    if (solicitacao.status !== 'pendente') {
      throw new ConflictException('Esta solicitação já foi decidida.')
    }
    // Vale para qualquer papel (inclusive admin/rh): ninguém decide a
    // própria solicitação de férias — sem essa checagem, um usuário rh/admin
    // conseguia se auto-aprovar 60 dias de férias pagas sem segundo aprovador.
    if (solicitacao.usuarioId === solicitante.id) {
      throw new ForbiddenException('Você não pode decidir a própria solicitação de férias.')
    }
    if (solicitante.role === 'gestor') {
      await this.exigirSubordinadoDireto(solicitacao.usuarioId, solicitante.id)
    }

    const atualizada = await this.prisma.solicitacaoFerias.update({
      where: { id },
      data: { status: dto.status, decididoPorId: solicitante.id, decididoEm: new Date() }
    })

    await this.auditoriaService.registrar({
      usuarioId: solicitante.id,
      papel: solicitante.role,
      acao: dto.status === 'aprovada' ? 'ferias.aprovar' : 'ferias.rejeitar',
      entidade: 'SolicitacaoFerias',
      entidadeId: id,
      dadosAntes: { status: solicitacao.status },
      dadosDepois: { status: atualizada.status }
    })

    return atualizada
  }
}
