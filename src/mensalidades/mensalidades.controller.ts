import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import type { UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AtualizarMensalidadeDto } from './dto/atualizar-mensalidade.dto'
import { MensalidadesService } from './mensalidades.service'

// Não é restrito por padrão: além da tela de Faturamento, estes endpoints
// também são usados pela saída de tickets de mensalistas (cálculo do ciclo
// em Tickets) e pelo histórico de cobranças no modal de Mensalistas — ambos
// acessíveis a funcionários comuns. Só a listagem SEM mensalistaId (o livro
// financeiro completo, usado pela tela de Faturamento) é restrita a
// admin/financeiro — ver checagem em `listar` abaixo.
@ApiTags('Mensalidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('mensalidades')
export class MensalidadesController {
  constructor (private readonly mensalidadesService: MensalidadesService) {}

  // KPIs agregados de todo o faturamento (MRR, recebido no mês, ticket
  // médio, sem ciclo ativo) — mesmo padrão restrito de MetricasController.
  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Get('kpis')
  @ApiOperation({ summary: 'KPIs de mensalidades', description: 'Acesso: admin, financeiro.' })
  @ApiResponse({ status: 200, description: 'KPIs agregados.', schema: { example: { referencia: '2026-09', mrr: 5000, recebidoNoMes: 3200, recebidoNoMesQtd: 12, ticketMedio: 266.67, mensalistasAtivosQtd: 20, semCicloAtivo: 2, semCicloLista: [] } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro (papel não autorizado).', schema: { example: { erro: 'Acesso restrito.' } } })
  kpis () {
    return this.mensalidadesService.calcularKpis()
  }

  @Get()
  @ApiOperation({ summary: 'Listar mensalidades', description: 'Sem mensalistaId, exige papel admin ou financeiro.' })
  @ApiQuery({ name: 'mensalistaId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de mensalidades.', schema: { example: [{ id: 'clx...', mensalistaId: 'clx...', referencia: '2026-09', valor: 250, status: 'pendente', mensalista: { nome: 'João Pereira', placa: 'ABC1D23', categoriaPlano: 'Básico', email: 'joao@example.com' } }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro (quando mensalistaId não é informado).', schema: { example: { erro: 'Acesso restrito a administradores e financeiro.' } } })
  listar (
    @Query('mensalistaId') mensalistaId: string | undefined,
    @CurrentUser() usuario: UsuarioAutenticado
  ) {
    if (!mensalistaId && !['admin', 'financeiro'].includes(usuario.role)) {
      throw new ForbiddenException('Acesso restrito a administradores e financeiro.')
    }
    return this.mensalidadesService.listar(mensalistaId)
  }

  // Restrito a admin/financeiro: é a baixa manual/cancelamento de cobrança
  // da tela de Faturamento — a cobrança automática do fechamento de ticket
  // não passa por aqui (ver comentário em MensalidadesService.atualizar).
  // Sem essa guarda, qualquer funcionário autenticado conseguia cancelar ou
  // marcar como paga a cobrança de qualquer mensalista.
  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar mensalidade (baixa manual, cancelamento, etc.)', description: 'Acesso: admin, financeiro.' })
  @ApiParam({ name: 'id', description: 'Id da mensalidade.' })
  @ApiResponse({ status: 200, description: 'Mensalidade atualizada.', schema: { example: { id: 'clx...', status: 'paga', formaPagamento: 'pix' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Informe o motivo do cancelamento.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Cobrança não encontrada.', schema: { example: { erro: 'Cobrança não encontrada.' } } })
  atualizar (
    @Param('id') id: string,
    @Body() dto: AtualizarMensalidadeDto,
    @CurrentUser() usuario: UsuarioAutenticado
  ) {
    return this.mensalidadesService.atualizar(id, dto, usuario.id)
  }

  @Post(':id/lembrete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar lembrete de cobrança por e-mail' })
  @ApiParam({ name: 'id', description: 'Id da mensalidade.' })
  @ApiResponse({ status: 200, description: 'Lembrete enviado.', schema: { example: { enviado: true } } })
  @ApiResponse({ status: 400, description: 'Mensalista sem e-mail cadastrado.', schema: { example: { erro: 'Este mensalista não tem e-mail cadastrado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 404, description: 'Cobrança não encontrada.', schema: { example: { erro: 'Cobrança não encontrada.' } } })
  enviarLembrete (@Param('id') id: string) {
    return this.mensalidadesService.enviarLembrete(id)
  }
}
