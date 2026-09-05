import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AtualizarTarifaDto } from './dto/atualizar-tarifa.dto'
import { CriarTarifaDto } from './dto/criar-tarifa.dto'
import { TarifasService } from './tarifas.service'

// Listagem fica aberta a qualquer funcionário autenticado (é usada ao abrir
// ticket — ver TicketsService.abrir), mas escrita (criar/editar/remover)
// é restrita a admin/financeiro: valorHora decide diretamente quanto é
// cobrado de cada cliente, então não pode ficar liberado a qualquer
// funcionário — ver Achado 3 da auditoria de segurança.
@ApiTags('Tarifas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('tarifas')
export class TarifasController {
  constructor (private readonly tarifasService: TarifasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tarifas' })
  @ApiResponse({ status: 200, description: 'Lista de tarifas.', schema: { example: [{ id: 'clx...', categoria: 'Comum', valorHora: 8 }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar () {
    return this.tarifasService.listarTodas()
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar tarifa', description: 'Acesso: admin, financeiro.' })
  @ApiResponse({ status: 201, description: 'Tarifa criada.', schema: { example: { id: 'clx...', categoria: 'Comum', valorHora: 8 } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Valor por hora é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  criar (@Body() dto: CriarTarifaDto) {
    return this.tarifasService.criar(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tarifa', description: 'Acesso: admin, financeiro.' })
  @ApiParam({ name: 'id', description: 'Id da tarifa.' })
  @ApiResponse({ status: 200, description: 'Tarifa atualizada.', schema: { example: { id: 'clx...', categoria: 'Comum', valorHora: 9 } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Valor por hora deve ser maior que zero.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  atualizar (@Param('id') id: string, @Body() dto: AtualizarTarifaDto) {
    return this.tarifasService.atualizar(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tarifa', description: 'Acesso: admin, financeiro.' })
  @ApiParam({ name: 'id', description: 'Id da tarifa.' })
  @ApiResponse({ status: 204, description: 'Tarifa removida.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 409, description: 'Tarifa vinculada a um ticket em aberto.', schema: { example: { erro: 'Esta tarifa está vinculada a um ticket em aberto e não pode ser excluída até ele ser fechado.' } } })
  async remover (@Param('id') id: string) {
    await this.tarifasService.remover(id)
  }
}
