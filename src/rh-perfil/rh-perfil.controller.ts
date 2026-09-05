import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DefinirPerfilRhDto } from './dto/definir-perfil-rh.dto'
import { RhPerfilService } from './rh-perfil.service'

@ApiTags('Perfil de RH')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('rh-perfil')
export class RhPerfilController {
  constructor (private readonly rhPerfilService: RhPerfilService) {}

  // Precisa vir antes de ":usuarioId" — senão o Nest trata "me" como um id.
  @Get('me')
  @ApiOperation({ summary: 'Buscar meu perfil de RH' })
  @ApiResponse({ status: 200, description: 'Perfil de RH do usuário autenticado (ou null se ainda não definido).', schema: { example: { usuarioId: 'clx...', cargo: 'Analista de Operações', salarioBase: 2500, tipoContrato: 'clt' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  buscarMeuPerfil (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.rhPerfilService.buscarPorUsuarioId(solicitante.id, solicitante)
  }

  // Também precisa vir antes de ":usuarioId", mesmo motivo do "me" acima.
  // Sem RolesGuard: qualquer funcionário autenticado pode ver a árvore
  // completa (só nome/cargo, nunca dado sensível).
  @Get('organograma')
  @ApiOperation({ summary: 'Organograma da empresa', description: 'Só nome/cargo/hierarquia — nunca dado sensível de RH.' })
  @ApiResponse({ status: 200, description: 'Árvore do organograma.', schema: { example: [{ usuarioId: 'clx...', nome: 'Maria da Silva', cargo: 'Diretora', role: 'admin', filhos: [] }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  buscarOrganograma () {
    return this.rhPerfilService.buscarOrganograma()
  }

  // Também precisa vir antes de ":usuarioId". Só rh/admin — é quem abre o
  // modal "Dados de RH" e usa isso pra popular o <select> de cargo.
  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Get('cargos')
  @ApiOperation({ summary: 'Listar cargos já cadastrados', description: 'Acesso: admin, rh.' })
  @ApiResponse({ status: 200, description: 'Lista de cargos distintos.', schema: { example: [{ cargo: 'Analista de Operações', vagaOrigem: 'Analista de Operações Jr.' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  listarCargos () {
    return this.rhPerfilService.listarCargos()
  }

  @Get(':usuarioId')
  @ApiOperation({ summary: 'Buscar perfil de RH por usuário', description: 'Acesso: admin, rh, ou o próprio usuário.' })
  @ApiParam({ name: 'usuarioId', description: 'Id do usuário.' })
  @ApiResponse({ status: 200, description: 'Perfil de RH (ou null se não definido).', schema: { example: { usuarioId: 'clx...', cargo: 'Analista de Operações', salarioBase: 2500, tipoContrato: 'clt' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou você só pode ver o seu próprio perfil de RH.', schema: { example: { erro: 'Você só pode ver o seu próprio perfil de RH.' } } })
  buscarPorUsuarioId (@Param('usuarioId') usuarioId: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.rhPerfilService.buscarPorUsuarioId(usuarioId, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Patch(':usuarioId')
  @ApiOperation({ summary: 'Definir (upsert) perfil de RH', description: 'Acesso: admin, rh. Sempre reenvia o perfil completo.' })
  @ApiParam({ name: 'usuarioId', description: 'Id do usuário.' })
  @ApiResponse({ status: 200, description: 'Perfil de RH salvo.', schema: { example: { usuarioId: 'clx...', cargo: 'Analista de Operações', salarioBase: 2500, tipoContrato: 'clt' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Cargo é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH, ou funcionário não pode ser o próprio gestor.', schema: { example: { erro: 'Um funcionário não pode ser o próprio gestor.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário não encontrado, ou gestor informado não encontrado.', schema: { example: { erro: 'Funcionário não encontrado.' } } })
  definir (
    @Param('usuarioId') usuarioId: string,
    @Body() dto: DefinirPerfilRhDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.rhPerfilService.definir(usuarioId, dto, solicitante)
  }
}
