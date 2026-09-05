import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AuditoriaService } from './auditoria.service'

// Antes só admin acessava ("RH é fiscalizado, não fiscaliza a si mesmo").
// Decisão de produto: RH passa a enxergar a trilha de auditoria também
// (inclusive ações do próprio RH) — mesmo padrão RolesGuard/@Roles já usado
// no resto do módulo de RH (rh-perfil, pdi, folha-pagamento etc.).
@ApiTags('Auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'rh')
@Controller('auditoria')
export class AuditoriaController {
  constructor (private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria', description: 'Acesso: admin, rh.' })
  @ApiQuery({ name: 'entidade', required: false, type: String, example: 'Mensalista' })
  @ApiQuery({ name: 'entidadeId', required: false, type: String })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de logs, mais recentes primeiro.', schema: { example: [{ id: 'clx...', entidade: 'Mensalista', entidadeId: 'clx...', acao: 'atualizar', usuario: { nome: 'Maria da Silva' }, criadoEm: '2026-09-04T10:00:00.000Z' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  listar (
    @Query('entidade') entidade?: string,
    @Query('entidadeId') entidadeId?: string,
    @Query('usuarioId') usuarioId?: string
  ) {
    return this.auditoriaService.listar({ entidade, entidadeId, usuarioId })
  }
}
