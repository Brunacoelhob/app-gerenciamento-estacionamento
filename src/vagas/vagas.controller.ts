import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { AtualizarVagaDto } from './dto/atualizar-vaga.dto'
import { CriarVagaDto } from './dto/criar-vaga.dto'
import { VagasService } from './vagas.service'

// Sem AdminGuard, mesmo padrão de Tarifas: gestão de vaga é operacional
// (abrir/fechar ticket depende de vaga livre), não uma configuração restrita
// a admin.
@ApiTags('Vagas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('vagas')
export class VagasController {
  constructor (private readonly vagasService: VagasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vagas', description: 'Lista todas as vagas, ordenadas por código.' })
  @ApiResponse({ status: 200, description: 'Lista de vagas.', schema: { example: [{ id: 'clx...', codigo: 'A01', tipo: 'comum', status: 'livre', acessivel: false }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar () {
    return this.vagasService.listarTodas()
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar vaga' })
  @ApiResponse({ status: 201, description: 'Vaga criada.', schema: { example: { id: 'clx...', codigo: 'A01', tipo: 'comum', status: 'livre', acessivel: false } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Código da vaga é obrigatório.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  criar (@Body() dto: CriarVagaDto) {
    return this.vagasService.criar(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar vaga' })
  @ApiParam({ name: 'id', description: 'Id da vaga.' })
  @ApiResponse({ status: 200, description: 'Vaga atualizada.', schema: { example: { id: 'clx...', codigo: 'A01', tipo: 'comum', status: 'ocupada', acessivel: false } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Tipo de vaga inválido.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  atualizar (@Param('id') id: string, @Body() dto: AtualizarVagaDto) {
    return this.vagasService.atualizar(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover vaga' })
  @ApiParam({ name: 'id', description: 'Id da vaga.' })
  @ApiResponse({ status: 204, description: 'Vaga removida.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'Vaga possui tickets vinculados.', schema: { example: { erro: 'Esta vaga tem tickets vinculados (mesmo já fechados) e não pode ser excluída. Marque como "Manutenção" em vez disso.' } } })
  async remover (@Param('id') id: string) {
    await this.vagasService.remover(id)
  }
}
