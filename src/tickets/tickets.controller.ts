import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AbrirTicketDto } from './dto/abrir-ticket.dto'
import { FecharTicketDto } from './dto/fechar-ticket.dto'
import { TicketsService } from './tickets.service'

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('tickets')
export class TicketsController {
  constructor (private readonly ticketsService: TicketsService) {}

  // KPIs de faturamento avulso (bloco separado dos KPIs de mensalista na
  // tela de Faturamento) — mesma restrição de acesso de MensalidadesController.kpis.
  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Get('kpis-avulsos')
  @ApiOperation({ summary: 'KPIs de faturamento avulso', description: 'Acesso: admin, financeiro.' })
  @ApiResponse({ status: 200, description: 'KPIs agregados.', schema: { example: { receitaMesAtual: 3200, quantidadeMesAtual: 48, ticketMedio: 66.67, abertosAgora: 5 } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  kpisAvulsos () {
    return this.ticketsService.calcularKpisAvulsos()
  }

  // Sem `page`, devolve a lista completa (já filtrada por status/termo, se
  // vierem) — usado pelo Dashboard (tickets ativos) e pela exportação
  // CSV/Excel, que precisam do resultado inteiro, não só uma página. Com
  // `page`, pagina no backend — usado pela tabela da tela de Tickets (ver
  // ApiClient.getTickets em assets/js/models/api.js).
  @Get()
  @ApiOperation({ summary: 'Listar tickets', description: 'Sem `page`, devolve a lista completa. Com `page`, pagina no backend.' })
  @ApiQuery({ name: 'page', required: false, type: String, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, type: String, example: '10' })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'aberto' })
  @ApiQuery({ name: 'termo', required: false, type: String, description: 'Busca livre (placa, vaga, etc.).' })
  @ApiResponse({ status: 200, description: 'Lista de tickets (ou objeto paginado, se `page` for informado).', schema: { example: [{ id: 'clx...', placa: 'ABC1D23', entrada: '2026-09-04T10:00:00.000Z', status: 'aberto', vaga: { codigo: 'A01', tipo: 'comum' } }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('termo') termo?: string
  ) {
    if (!page) {
      return this.ticketsService.listar({ status, termo })
    }

    const paginaNum = Math.max(1, Number(page) || 1)
    const tamanho = Math.min(100, Math.max(1, Number(pageSize) || 10))

    return this.ticketsService.listar({ status, termo }, { skip: (paginaNum - 1) * tamanho, take: tamanho })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir ticket' })
  @ApiResponse({ status: 201, description: 'Ticket criado.', schema: { example: { id: 'clx...', placa: 'ABC1D23', entrada: '2026-09-04T10:00:00.000Z', status: 'aberto' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Placa é obrigatória.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'Caixa fechado (código CAIXA_FECHADO), vaga inválida/ocupada, ou placa já com ticket aberto.', schema: { example: { erro: 'O caixa do dia ainda não foi aberto. Conte o valor em espécie e abra o caixa antes de registrar um ticket.', codigo: 'CAIXA_FECHADO' } } })
  abrir (@Body() dto: AbrirTicketDto) {
    return this.ticketsService.abrir(dto)
  }

  @Post(':id/fechar')
  @ApiOperation({ summary: 'Fechar ticket' })
  @ApiParam({ name: 'id', description: 'Id do ticket.' })
  @ApiResponse({ status: 201, description: 'Ticket fechado.', schema: { example: { id: 'clx...', placa: 'ABC1D23', status: 'fechado', valorCobrado: 16 } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Forma de pagamento inválida.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'Ticket inválido ou já finalizado.', schema: { example: { erro: 'Ticket inválido ou já finalizado.' } } })
  fechar (
    @Param('id') id: string,
    @Body() dto: FecharTicketDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.ticketsService.fechar(id, dto, solicitante.id)
  }

  @Post(':id/comprovante-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar comprovante por e-mail', description: 'Só funciona para tickets já fechados e vinculados a um mensalista com e-mail cadastrado.' })
  @ApiParam({ name: 'id', description: 'Id do ticket.' })
  @ApiResponse({ status: 200, description: 'Comprovante enviado.', schema: { example: { enviado: true } } })
  @ApiResponse({ status: 400, description: 'Ticket ainda não fechado, ou mensalista sem e-mail.', schema: { example: { erro: 'O comprovante só pode ser enviado para um ticket já encerrado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado.', schema: { example: { erro: 'Ticket não encontrado.' } } })
  enviarComprovanteEmail (@Param('id') id: string) {
    return this.ticketsService.enviarComprovanteEmail(id)
  }

  // Restrito a admin: um ticket é o registro primário de receita avulsa —
  // apagá-lo remove evidência de faturamento, então fica reservado ao
  // papel mais privilegiado, e a exclusão passa a ficar auditada.
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ticket', description: 'Acesso: admin.' })
  @ApiParam({ name: 'id', description: 'Id do ticket.' })
  @ApiResponse({ status: 204, description: 'Ticket removido.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado.', schema: { example: { erro: 'Ticket não encontrado.' } } })
  async remover (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    await this.ticketsService.remover(id, solicitante)
  }
}
