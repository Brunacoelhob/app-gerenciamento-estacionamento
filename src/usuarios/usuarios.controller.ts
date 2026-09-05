import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto'
import { CriarUsuarioDto } from './dto/criar-usuario.dto'
import { UsuariosService } from './usuarios.service'

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor (private readonly usuariosService: UsuariosService) {}

  // Listagem também aberta a RH e gestor (RolesGuard, não o AdminGuard fixo
  // usado no resto do controller): RH precisa enxergar os funcionários pra
  // vincular perfil de RH, justificativas de ponto, férias e folha de
  // pagamento; gestor precisa pra gerenciamento e relatório de desempenho
  // (nunca vê dado de RH em si — isso continua restrito a admin/rh, ver
  // ehGestaoDeRh).
  @UseGuards(RolesGuard)
  @Roles('admin', 'rh', 'gestor')
  @Get()
  @ApiOperation({ summary: 'Listar usuários', description: 'Lista todos os usuários (CPF mascarado), ordenados por nome. Acesso: admin, rh, gestor.' })
  @ApiResponse({ status: 200, description: 'Lista de usuários.', schema: { example: [{ id: 'clx...', nome: 'Maria da Silva', cpf: '123.***.***-00', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a admin, rh ou gestor.', schema: { example: { erro: 'Acesso restrito.' } } })
  listar () {
    return this.usuariosService.listar()
  }

  // Precisa vir antes de ":id" — senão o Nest trata "verificar-cpf" como um id.
  @UseGuards(AdminGuard)
  @Get('verificar-cpf')
  @ApiOperation({ summary: 'Verificar CPF duplicado', description: 'Acesso: admin.' })
  @ApiQuery({ name: 'cpf', required: true, type: String, example: '123.456.789-00' })
  @ApiQuery({ name: 'excluirId', required: false, type: String, description: 'Id de usuário a ignorar na checagem (edição do próprio registro).' })
  @ApiResponse({ status: 200, description: 'Resultado da checagem.', schema: { example: { duplicado: false } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a administradores.', schema: { example: { erro: 'Acesso restrito a administradores.' } } })
  async verificarCpf (@Query('cpf') cpf: string, @Query('excluirId') excluirId?: string) {
    const duplicado = await this.usuariosService.existeCpfDuplicado(cpf, excluirId)
    return { duplicado }
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por id', description: 'Acesso: admin.' })
  @ApiParam({ name: 'id', description: 'Id do usuário.' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado (ou null se não existir).', schema: { example: { id: 'clx...', nome: 'Maria da Silva', cpf: '123.456.789-00', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a administradores.', schema: { example: { erro: 'Acesso restrito a administradores.' } } })
  buscarPorId (@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id)
  }

  @UseGuards(AdminGuard)
  @Post()
  @ApiOperation({ summary: 'Criar funcionário', description: 'Acesso: admin.' })
  @ApiResponse({ status: 201, description: 'Usuário criado.', schema: { example: { id: 'clx...', nome: 'Maria da Silva', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Nome é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a administradores.', schema: { example: { erro: 'Acesso restrito a administradores.' } } })
  @ApiResponse({ status: 409, description: 'CPF ou e-mail já cadastrado.', schema: { example: { erro: 'Já existe um usuário cadastrado com este CPF ou e-mail.' } } })
  criar (@Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criarFuncionario(dto)
  }

  // Sem AdminGuard de propósito: é a rota também usada pelo modal "Meu
  // Perfil", onde qualquer funcionário edita a própria conta. Quem decide se
  // o solicitante pode editar o alvo (ele mesmo, ou é admin) é o service —
  // ver a checagem em UsuariosService.atualizarPerfil.
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário', description: 'Qualquer usuário autenticado pode editar o próprio perfil; apenas admin pode editar outros usuários ou alterar role/ativo.' })
  @ApiParam({ name: 'id', description: 'Id do usuário.' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado (pode incluir novo token se o próprio usuário completou o CPF pendente).', schema: { example: { id: 'clx...', nome: 'Maria da Silva', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos, ou senha atual incorreta.', schema: { example: { erro: 'Senha atual incorreta.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Você só pode editar o seu próprio perfil.', schema: { example: { erro: 'Você só pode editar o seu próprio perfil.' } } })
  @ApiResponse({ status: 409, description: 'CPF ou e-mail já em uso.', schema: { example: { erro: 'Este e-mail já está em uso por outra conta.' } } })
  atualizar (
    @Param('id') id: string,
    @Body() dto: AtualizarUsuarioDto,
    @CurrentUser() solicitante: UsuarioAutenticado
  ) {
    return this.usuariosService.atualizarPerfil(id, dto, solicitante)
  }
}
