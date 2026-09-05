import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AtualizarItemPdiDto } from './dto/atualizar-item-pdi.dto'
import { CriarItemPdiDto } from './dto/criar-item-pdi.dto'
import { MoverItemPdiDto } from './dto/mover-item-pdi.dto'
import { PdiService } from './pdi.service'

@ApiTags('PDI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('pdi')
export class PdiController {
  constructor (private readonly pdiService: PdiService) {}

  // Precisa vir antes de ":usuarioId" — senão o Nest trata "me" como um id.
  @Get('me')
  @ApiOperation({ summary: 'Listar meu PDI' })
  @ApiResponse({ status: 200, description: 'Lista de itens do PDI do usuário autenticado.', schema: { example: [{ id: 'clx...', titulo: 'Concluir curso de Excel avançado', concluido: false }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listarMeuPdi (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pdiService.listarPorUsuario(solicitante.id, solicitante)
  }

  @Get(':usuarioId')
  @ApiOperation({ summary: 'Listar PDI de um usuário', description: 'Acesso: admin, rh, ou o próprio usuário.' })
  @ApiParam({ name: 'usuarioId', description: 'Id do usuário.' })
  @ApiResponse({ status: 200, description: 'Lista de itens do PDI.', schema: { example: [{ id: 'clx...', titulo: 'Concluir curso de Excel avançado', concluido: false }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores, RH ou o próprio usuário.', schema: { example: { erro: 'Você só pode ver o seu próprio PDI.' } } })
  listarPorUsuario (@Param('usuarioId') usuarioId: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pdiService.listarPorUsuario(usuarioId, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post(':usuarioId')
  @ApiOperation({ summary: 'Criar item de PDI', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'usuarioId', description: 'Id do usuário.' })
  @ApiResponse({ status: 201, description: 'Item criado.', schema: { example: { id: 'clx...', titulo: 'Concluir curso de Excel avançado', concluido: false } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Título é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário não encontrado.', schema: { example: { erro: 'Funcionário não encontrado.' } } })
  criar (
    @Param('usuarioId') usuarioId: string,
    @Body() dto: CriarItemPdiDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.pdiService.criar(usuarioId, dto, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch('item/:itemId')
  @ApiOperation({ summary: 'Editar item de PDI', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'itemId', description: 'Id do item de PDI.' })
  @ApiResponse({ status: 200, description: 'Item atualizado.', schema: { example: { id: 'clx...', titulo: 'Concluir curso de Excel avançado', concluido: false } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Título não pode ficar vazio.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Item de PDI não encontrado.', schema: { example: { erro: 'Item de PDI não encontrado.' } } })
  editar (
    @Param('itemId') itemId: string,
    @Body() dto: AtualizarItemPdiDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.pdiService.editar(itemId, dto, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch('item/:itemId/concluir')
  @ApiOperation({ summary: 'Marcar item de PDI como concluído', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'itemId', description: 'Id do item de PDI.' })
  @ApiResponse({ status: 200, description: 'Item concluído.', schema: { example: { id: 'clx...', concluido: true } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Item de PDI não encontrado.', schema: { example: { erro: 'Item de PDI não encontrado.' } } })
  concluir (@Param('itemId') itemId: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pdiService.concluir(itemId, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch('item/:itemId/reabrir')
  @ApiOperation({ summary: 'Reabrir item de PDI concluído', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'itemId', description: 'Id do item de PDI.' })
  @ApiResponse({ status: 200, description: 'Item reaberto.', schema: { example: { id: 'clx...', concluido: false } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Item de PDI não encontrado.', schema: { example: { erro: 'Item de PDI não encontrado.' } } })
  reabrir (@Param('itemId') itemId: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pdiService.reabrir(itemId, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch('item/:itemId/mover')
  @ApiOperation({ summary: 'Reordenar item de PDI', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'itemId', description: 'Id do item de PDI.' })
  @ApiResponse({ status: 200, description: 'Item reordenado (ou inalterado, se já estiver na ponta).', schema: { example: { id: 'clx...', titulo: 'Concluir curso de Excel avançado' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'direcao must be one of the following values: cima, baixo' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Item de PDI não encontrado.', schema: { example: { erro: 'Item de PDI não encontrado.' } } })
  mover (
    @Param('itemId') itemId: string,
    @Body() dto: MoverItemPdiDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.pdiService.mover(itemId, dto.direcao, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Delete('item/:itemId')
  @ApiOperation({ summary: 'Remover item de PDI', description: 'Acesso: admin, rh.' })
  @ApiParam({ name: 'itemId', description: 'Id do item de PDI.' })
  @ApiResponse({ status: 200, description: 'Item removido.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Item de PDI não encontrado.', schema: { example: { erro: 'Item de PDI não encontrado.' } } })
  remover (@Param('itemId') itemId: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pdiService.remover(itemId, solicitante)
  }
}
