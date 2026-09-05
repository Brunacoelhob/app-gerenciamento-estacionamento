import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DecidirFeriasDto } from './dto/decidir-ferias.dto'
import { SolicitarFeriasDto } from './dto/solicitar-ferias.dto'
import { FeriasService } from './ferias.service'

@ApiTags('Férias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('ferias')
export class FeriasController {
  constructor (private readonly feriasService: FeriasService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar férias' })
  @ApiResponse({ status: 201, description: 'Solicitação criada.', schema: { example: { id: 'clx...', dataInicio: '2026-12-01', dataFim: '2026-12-15', status: 'pendente' } } })
  @ApiResponse({ status: 400, description: 'Fim antes do início, antecedência mínima de 90 dias, ou limite de 60 dias/ano excedido.', schema: { example: { erro: 'Férias precisam ser solicitadas com pelo menos 90 dias de antecedência.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 404, description: 'Você ainda não tem um perfil de RH cadastrado.', schema: { example: { erro: 'Você ainda não tem um perfil de RH cadastrado. Fale com o RH.' } } })
  @ApiResponse({ status: 409, description: 'Sobreposição com outro período de férias.', schema: { example: { erro: 'Já existe uma solicitação sua (pendente ou aprovada) que se sobrepõe a este período.' } } })
  solicitar (@Body() dto: SolicitarFeriasDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.feriasService.solicitar(solicitante.id, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitações de férias', description: 'Sem usuarioId, lista as próprias solicitações.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de solicitações.', schema: { example: [{ id: 'clx...', dataInicio: '2026-12-01', dataFim: '2026-12-15', status: 'pendente' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou você só pode ver as próprias solicitações de férias.', schema: { example: { erro: 'Você só pode ver as próprias solicitações de férias.' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.feriasService.listar(solicitante, usuarioId)
  }

  // Gestor também decide, mas só sobre solicitações do próprio time — a
  // checagem de "é mesmo subordinado direto deste gestor" fica no service
  // (FeriasService.decidir), já que o RolesGuard só sabe checar o papel, não
  // a relação gestor/subordinado de cada solicitação específica.
  @UseGuards(RolesGuard)
  @Roles('admin', 'rh', 'gestor')
  @Patch(':id')
  @ApiOperation({ summary: 'Aprovar ou rejeitar solicitação de férias', description: 'Acesso: admin, rh, ou gestor do time (só sobre subordinados diretos).' })
  @ApiParam({ name: 'id', description: 'Id da solicitação.' })
  @ApiResponse({ status: 200, description: 'Solicitação decidida.', schema: { example: { id: 'clx...', status: 'aprovada' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito, ou gestor só decide sobre o próprio time.', schema: { example: { erro: 'Você só pode ver ou decidir solicitações de férias do seu próprio time.' } } })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada.', schema: { example: { erro: 'Solicitação de férias não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Só é possível decidir solicitações pendentes.', schema: { example: { erro: 'Esta solicitação já foi decidida.' } } })
  decidir (
    @Param('id') id: string,
    @Body() dto: DecidirFeriasDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.feriasService.decidir(id, dto, solicitante)
  }

  // Rota própria (não pode ser PATCH :id de novo, já usada por decidir) —
  // admin/RH corrigindo as datas de uma solicitação ainda pendente.
  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch(':id/datas')
  @ApiOperation({ summary: 'Editar datas de uma solicitação pendente', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'id', description: 'Id da solicitação.' })
  @ApiResponse({ status: 200, description: 'Solicitação atualizada.', schema: { example: { id: 'clx...', dataInicio: '2026-12-02', dataFim: '2026-12-16', status: 'pendente' } } })
  @ApiResponse({ status: 400, description: 'Datas inválidas.', schema: { example: { erro: 'A data de fim não pode ser anterior à data de início.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada.', schema: { example: { erro: 'Solicitação de férias não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Só é possível editar solicitações pendentes, ou sobreposição com outro período.', schema: { example: { erro: 'Só é possível editar uma solicitação ainda pendente.' } } })
  editar (
    @Param('id') id: string,
    @Body() dto: SolicitarFeriasDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.feriasService.editar(id, dto, solicitante)
  }
}
