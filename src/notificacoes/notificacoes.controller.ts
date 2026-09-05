import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { NotificacoesService } from './notificacoes.service'

@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor (private readonly notificacoesService: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar minhas notificações' })
  @ApiResponse({ status: 200, description: 'Lista de notificações do usuário autenticado.', schema: { example: [{ id: 'clx...', titulo: 'Férias aprovadas', lida: false, criadoEm: '2026-09-04T10:00:00.000Z' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listarMinhas (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.notificacoesService.listarMinhas(solicitante.id)
  }

  @Patch(':id/lida')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', description: 'Id da notificação.' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida.', schema: { example: { id: 'clx...', titulo: 'Férias aprovadas', lida: true } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou esta notificação não é sua.', schema: { example: { erro: 'Esta notificação não é sua.' } } })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada.', schema: { example: { erro: 'Notificação não encontrada.' } } })
  marcarComoLida (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.notificacoesService.marcarComoLida(id, solicitante.id)
  }
}
