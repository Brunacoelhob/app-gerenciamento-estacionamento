import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DespesasService } from './despesas.service'
import { AtualizarDespesaDto } from './dto/atualizar-despesa.dto'
import { CriarDespesaDto } from './dto/criar-despesa.dto'

// Contas a pagar/despesas do estacionamento — só admin/financeiro (dado
// financeiro sensível, mesma guarda de Métricas/Faturamento).
@ApiTags('Despesas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard, RolesGuard)
@Roles('admin', 'financeiro')
@Controller('despesas')
export class DespesasController {
  constructor (private readonly despesasService: DespesasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar despesas', description: 'Acesso: admin, financeiro. Gera automaticamente as ocorrências do mês corrente das despesas recorrentes ativas antes de listar.' })
  @ApiQuery({ name: 'referencia', required: false, type: String, example: '2026-09' })
  @ApiQuery({ name: 'status', required: false, enum: ['pendente', 'paga'] })
  @ApiQuery({ name: 'categoria', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de despesas.', schema: { example: [{ id: 'clx...', categoria: 'Aluguel', descricao: 'Aluguel — set/2026', valor: 3500, status: 'pendente', dataVencimento: '2026-09-10T00:00:00.000Z' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  listar (
    @Query('referencia') referencia: string | undefined,
    @Query('status') status: string | undefined,
    @Query('categoria') categoria: string | undefined,
    @CurrentUser() usuario: UsuarioAutenticado
  ) {
    return this.despesasService.listar({ referencia, status, categoria }, usuario)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar despesa avulsa', description: 'Acesso: admin, financeiro.' })
  @ApiResponse({ status: 201, description: 'Despesa criada.', schema: { example: { id: 'clx...', categoria: 'Aluguel', descricao: 'Aluguel — set/2026', valor: 3500, status: 'pendente' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Informe o valor da despesa.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  criar (@Body() dto: CriarDespesaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.despesasService.criar(dto, usuario)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar despesa', description: 'Acesso: admin, financeiro.' })
  @ApiParam({ name: 'id', description: 'Id da despesa.' })
  @ApiResponse({ status: 200, description: 'Despesa atualizada.', schema: { example: { id: 'clx...', categoria: 'Aluguel', status: 'paga' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos, ou despesa já paga não pode mais ser editada.', schema: { example: { erro: 'Esta despesa já foi paga e não pode mais ser editada.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada.', schema: { example: { erro: 'Despesa não encontrada.' } } })
  atualizar (
    @Param('id') id: string,
    @Body() dto: AtualizarDespesaDto,
    @CurrentUser() usuario: UsuarioAutenticado
  ) {
    return this.despesasService.atualizar(id, dto, usuario)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover despesa pendente', description: 'Acesso: admin, financeiro. Só é possível remover despesas com status pendente, não geradas por uma recorrência.' })
  @ApiParam({ name: 'id', description: 'Id da despesa.' })
  @ApiResponse({ status: 200, description: 'Despesa removida.', schema: { example: { removida: true } } })
  @ApiResponse({ status: 400, description: 'Só é possível excluir despesas pendentes, ou despesa gerada por recorrência.', schema: { example: { erro: 'Só é possível excluir despesas pendentes.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada.', schema: { example: { erro: 'Despesa não encontrada.' } } })
  remover (@Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.despesasService.remover(id, usuario)
  }
}
