import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DefinirEtapaCarreiraDto } from './dto/definir-etapa-carreira.dto'
import { EtapasCarreiraService } from './etapas-carreira.service'

@ApiTags('Etapas de Carreira')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('etapas-carreira')
export class EtapasCarreiraController {
  constructor (private readonly etapasCarreiraService: EtapasCarreiraService) {}

  // Sem @Roles(): qualquer usuário autenticado enxerga o catálogo inteiro —
  // é o que alimenta a trilha de carreira exibida na aba "Meus Dados de RH".
  @Get()
  @ApiOperation({ summary: 'Listar etapas de carreira' })
  @ApiResponse({ status: 200, description: 'Lista de etapas, ordenadas.', schema: { example: [{ id: 'clx...', ordem: 1, titulo: 'Analista Jr.', faixaSalarial: 'R$ 2.000 - R$ 2.800' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar () {
    return this.etapasCarreiraService.listar()
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post()
  @ApiOperation({ summary: 'Criar etapa de carreira', description: 'Acesso: admin, rh.' })
  @ApiResponse({ status: 201, description: 'Etapa criada.', schema: { example: { id: 'clx...', ordem: 1, titulo: 'Analista Jr.' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Título é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 409, description: 'Já existe etapa cadastrada nessa ordem.', schema: { example: { erro: 'Já existe uma etapa cadastrada com essa ordem.' } } })
  criar (@Body() dto: DefinirEtapaCarreiraDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.etapasCarreiraService.criar(dto, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch(':id')
  @ApiOperation({ summary: 'Editar etapa de carreira', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'id', description: 'Id da etapa.' })
  @ApiResponse({ status: 200, description: 'Etapa atualizada.', schema: { example: { id: 'clx...', ordem: 1, titulo: 'Analista Jr.' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Título é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Etapa não encontrada.', schema: { example: { erro: 'Etapa de carreira não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Já existe etapa cadastrada nessa ordem.', schema: { example: { erro: 'Já existe uma etapa cadastrada com essa ordem.' } } })
  editar (
    @Param('id') id: string,
    @Body() dto: DefinirEtapaCarreiraDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.etapasCarreiraService.editar(id, dto, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Delete(':id')
  @ApiOperation({ summary: 'Remover etapa de carreira', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'id', description: 'Id da etapa.' })
  @ApiResponse({ status: 200, description: 'Etapa removida.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Etapa não encontrada.', schema: { example: { erro: 'Etapa de carreira não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Etapa atribuída a um ou mais funcionários.', schema: { example: { erro: 'Esta etapa está atribuída a um ou mais funcionários e não pode ser removida.' } } })
  remover (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.etapasCarreiraService.remover(id, solicitante)
  }
}
