import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { CriarJustificativaDto } from './dto/criar-justificativa.dto'
import { JustificativasPontoService } from './justificativas-ponto.service'

@ApiTags('Justificativas de Ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('ponto/justificativas')
export class JustificativasPontoController {
  constructor (private readonly justificativasPontoService: JustificativasPontoService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post()
  @ApiOperation({ summary: 'Lançar justificativa de ponto', description: 'Acesso: admin, rh.' })
  @ApiResponse({ status: 201, description: 'Justificativa criada.', schema: { example: { id: 'clx...', usuarioId: 'clx...', data: '2026-09-10', tipo: 'atestado' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Data deve estar no formato YYYY-MM-DD.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário sem perfil de RH cadastrado.', schema: { example: { erro: 'Funcionário sem perfil de RH cadastrado.' } } })
  @ApiResponse({ status: 409, description: 'Já existe justificativa lançada para essa data.', schema: { example: { erro: 'Já existe uma justificativa lançada para este funcionário nesta data.' } } })
  criar (@Body() dto: CriarJustificativaDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.justificativasPontoService.criar(dto, solicitante)
  }

  @Get()
  @ApiOperation({ summary: 'Listar justificativas de ponto', description: 'Sem usuarioId, lista as próprias justificativas.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de justificativas.', schema: { example: [{ id: 'clx...', data: '2026-09-10', tipo: 'atestado' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só é possível ver as próprias justificativas (exceto admin/rh).', schema: { example: { erro: 'Você só pode ver as próprias justificativas.' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.justificativasPontoService.listar(solicitante, usuarioId)
  }
}
