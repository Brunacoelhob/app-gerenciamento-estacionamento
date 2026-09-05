import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DecidirTrabalhoExtraDto } from './dto/decidir-trabalho-extra.dto'
import { SolicitarTrabalhoExtraDto } from './dto/solicitar-trabalho-extra.dto'
import { TrabalhoExtraService } from './trabalho-extra.service'

@ApiTags('Trabalho Extra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('ponto/trabalho-extra')
export class TrabalhoExtraController {
  constructor (private readonly trabalhoExtraService: TrabalhoExtraService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar autorização de trabalho extra' })
  @ApiResponse({ status: 201, description: 'Solicitação criada.', schema: { example: { id: 'clx...', data: '2026-09-13', motivo: 'Cobertura de plantão.', status: 'pendente' } } })
  @ApiResponse({ status: 400, description: 'Data já é dia da escala, ou data no passado.', schema: { example: { erro: 'Este já é um dia da sua escala normal — não precisa de autorização.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 404, description: 'Você ainda não tem um perfil de RH cadastrado.', schema: { example: { erro: 'Você ainda não tem um perfil de RH cadastrado. Fale com o RH.' } } })
  @ApiResponse({ status: 409, description: 'Já existe solicitação para essa data.', schema: { example: { erro: 'Você já tem uma solicitação para esta data.' } } })
  solicitar (@Body() dto: SolicitarTrabalhoExtraDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.trabalhoExtraService.solicitar(solicitante.id, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitações de trabalho extra', description: 'Sem usuarioId, lista as próprias solicitações.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de solicitações.', schema: { example: [{ id: 'clx...', data: '2026-09-13', motivo: 'Cobertura de plantão.', status: 'pendente' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.trabalhoExtraService.listar(solicitante, usuarioId)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch(':id')
  @ApiOperation({ summary: 'Aprovar ou rejeitar solicitação de trabalho extra', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'id', description: 'Id da solicitação.' })
  @ApiResponse({ status: 200, description: 'Solicitação decidida.', schema: { example: { id: 'clx...', status: 'aprovada' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada.', schema: { example: { erro: 'Solicitação não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Solicitação já decidida.', schema: { example: { erro: 'Esta solicitação já foi decidida.' } } })
  decidir (
    @Param('id') id: string,
    @Body() dto: DecidirTrabalhoExtraDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.trabalhoExtraService.decidir(id, dto, solicitante)
  }
}
