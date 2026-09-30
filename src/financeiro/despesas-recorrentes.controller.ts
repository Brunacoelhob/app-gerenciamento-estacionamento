import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DespesasRecorrentesService } from './despesas-recorrentes.service'
import { CriarDespesaRecorrenteDto } from './dto/criar-despesa-recorrente.dto'

// Moldes de despesa recorrente (aluguel, internet etc.) — só admin/financeiro,
// mesma guarda de Métricas/Faturamento: não há rota aqui visível a
// funcionário comum.
@ApiTags('Despesas Recorrentes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard, RolesGuard)
@Roles('admin', 'financeiro')
@Controller('despesas-recorrentes')
export class DespesasRecorrentesController {
  constructor (private readonly despesasRecorrentesService: DespesasRecorrentesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar despesas recorrentes', description: 'Acesso: admin, financeiro. Por padrão devolve só as ativas.' })
  @ApiQuery({ name: 'incluirInativas', required: false, type: String, example: 'true' })
  @ApiResponse({ status: 200, description: 'Lista de despesas recorrentes.', schema: { example: [{ id: 'clx...', categoria: 'Internet', descricao: 'Plano fibra 500mb', valor: 150, diaVencimento: 10, ativo: true }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  listar (@Query('incluirInativas') incluirInativas?: string) {
    return this.despesasRecorrentesService.listar(incluirInativas === 'true')
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar despesa recorrente', description: 'Acesso: admin, financeiro. Também gera a ocorrência do mês corrente imediatamente.' })
  @ApiResponse({ status: 201, description: 'Despesa recorrente criada.', schema: { example: { id: 'clx...', categoria: 'Internet', descricao: 'Plano fibra 500mb', valor: 150, diaVencimento: 10, ativo: true } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Dia de vencimento deve ser entre 1 e 28.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  criar (@Body() dto: CriarDespesaRecorrenteDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.despesasRecorrentesService.criar(dto, usuario)
  }

  @Patch(':id/desativar')
  @ApiOperation({ summary: 'Desativar despesa recorrente', description: 'Acesso: admin, financeiro. Não gera mais ocorrências futuras, mas mantém o histórico já gerado.' })
  @ApiParam({ name: 'id', description: 'Id da despesa recorrente.' })
  @ApiResponse({ status: 200, description: 'Despesa recorrente desativada.', schema: { example: { id: 'clx...', categoria: 'Internet', ativo: false } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Despesa recorrente não encontrada.', schema: { example: { erro: 'Despesa recorrente não encontrada.' } } })
  desativar (@Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.despesasRecorrentesService.desativar(id, usuario)
  }
}
