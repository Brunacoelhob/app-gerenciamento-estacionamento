import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { AtualizarMensalistaDto } from './dto/atualizar-mensalista.dto'
import { CriarMensalistaDto } from './dto/criar-mensalista.dto'
import { MensalistasService } from './mensalistas.service'

@ApiTags('Mensalistas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('mensalistas')
export class MensalistasController {
  constructor (private readonly mensalistasService: MensalistasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mensalistas', description: 'CPF sempre mascarado nesta listagem.' })
  @ApiResponse({ status: 200, description: 'Lista de mensalistas.', schema: { example: [{ id: 'clx...', nome: 'João Pereira', cpf: '123.***.***-00', placa: 'ABC1D23', telefone: '(11) 91234-5678', valorMensalidade: 250, ativo: true }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar () {
    return this.mensalistasService.listarTodos()
  }

  // Precisa vir antes de ":id" — senão o Nest trata "verificar-cpf" como um id.
  @Get('verificar-cpf')
  @ApiOperation({ summary: 'Verificar CPF duplicado' })
  @ApiQuery({ name: 'cpf', required: true, type: String, example: '123.456.789-00' })
  @ApiQuery({ name: 'excluirId', required: false, type: String, description: 'Id de mensalista a ignorar na checagem (edição do próprio registro).' })
  @ApiResponse({ status: 200, description: 'Resultado da checagem.', schema: { example: { duplicado: false } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  async verificarCpf (@Query('cpf') cpf: string, @Query('excluirId') excluirId?: string) {
    const duplicado = await this.mensalistasService.existeCpfDuplicado(cpf, excluirId)
    return { duplicado }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar mensalista por id', description: 'CPF completo só é devolvido para usuários admin.' })
  @ApiParam({ name: 'id', description: 'Id do mensalista.' })
  @ApiResponse({ status: 200, description: 'Mensalista encontrado (ou null se não existir).', schema: { example: { id: 'clx...', nome: 'João Pereira', cpf: '123.456.789-00', placa: 'ABC1D23', telefone: '(11) 91234-5678', valorMensalidade: 250, ativo: true } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  buscarPorId (@Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.mensalistasService.buscarPorId(id, usuario)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar mensalista' })
  @ApiResponse({ status: 201, description: 'Mensalista criado.', schema: { example: { id: 'clx...', nome: 'João Pereira', cpf: '123.456.789-00', placa: 'ABC1D23', telefone: '(11) 91234-5678', valorMensalidade: 250, ativo: true } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Placa deve estar no formato ABC1234 ou ABC1D23.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'CPF ou placa já cadastrados.', schema: { example: { erro: 'Já existe um mensalista cadastrado com este CPF.' } } })
  criar (@Body() dto: CriarMensalistaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.mensalistasService.criar(dto, usuario)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar mensalista', description: 'CPF e valorMensalidade só são alterados se o solicitante for admin.' })
  @ApiParam({ name: 'id', description: 'Id do mensalista.' })
  @ApiResponse({ status: 200, description: 'Mensalista atualizado.', schema: { example: { id: 'clx...', nome: 'João Pereira', cpf: '123.456.789-00', placa: 'ABC1D23', telefone: '(11) 91234-5678', valorMensalidade: 250, ativo: true } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'O telefone é obrigatório e não pode ser removido.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 404, description: 'Mensalista não encontrado.', schema: { example: { erro: 'Mensalista não encontrado.' } } })
  @ApiResponse({ status: 409, description: 'CPF ou placa já cadastrados em outro mensalista.', schema: { example: { erro: 'Já existe um mensalista cadastrado com este placa.' } } })
  atualizar (@Param('id') id: string, @Body() dto: AtualizarMensalistaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.mensalistasService.atualizar(id, dto, usuario)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover mensalista' })
  @ApiParam({ name: 'id', description: 'Id do mensalista.' })
  @ApiResponse({ status: 204, description: 'Mensalista removido.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'Mensalista possui histórico de mensalidades vinculado.', schema: { example: { erro: 'Este mensalista tem histórico de cobranças e não pode ser excluído. Use "Inativar" em vez disso.' } } })
  async remover (@Param('id') id: string) {
    await this.mensalistasService.remover(id)
  }
}
