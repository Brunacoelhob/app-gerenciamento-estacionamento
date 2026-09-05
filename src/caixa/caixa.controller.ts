import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { CaixaService } from './caixa.service'
import { AbrirCaixaDto } from './dto/abrir-caixa.dto'
import { FecharCaixaDto } from './dto/fechar-caixa.dto'

// Mesmos guards de TicketsController (não restrito por papel): quem registra
// tickets é quem abre/fecha o caixa do dia.
@ApiTags('Caixa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('caixa')
export class CaixaController {
  constructor (private readonly caixaService: CaixaService) {}

  @Get('hoje')
  @ApiOperation({ summary: 'Status do caixa de hoje' })
  @ApiResponse({ status: 200, description: 'Situação do caixa do dia.', schema: { example: { aberto: true, caixa: { id: 'clx...', valorAbertura: 100, abertoPor: { nome: 'Maria da Silva' } }, valorEsperadoFechamento: 480 } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  obterStatusHoje () {
    return this.caixaService.obterStatusHoje()
  }

  @Post('abrir')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir o caixa do dia' })
  @ApiResponse({ status: 201, description: 'Caixa aberto.', schema: { example: { id: 'clx...', valorAbertura: 100, abertoPor: { nome: 'Maria da Silva' } } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Informe o valor contado em caixa.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'O caixa de hoje já foi aberto.', schema: { example: { erro: 'O caixa de hoje já foi aberto.' } } })
  abrir (@Body() dto: AbrirCaixaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.caixaService.abrir(dto, usuario.id)
  }

  // Restrito a admin/financeiro: fechar o caixa é a conferência financeira
  // do dia (compara o contado contra o esperado) — abrir continua liberado
  // a qualquer funcionário (é só registrar o troco inicial contado).
  @UseGuards(RolesGuard)
  @Roles('admin', 'financeiro')
  @Post(':id/fechar')
  @ApiOperation({ summary: 'Fechar um caixa', description: 'Acesso: admin, financeiro. Só o caixa do dia atual pode ser fechado.' })
  @ApiParam({ name: 'id', description: 'Id do caixa.' })
  @ApiResponse({ status: 201, description: 'Caixa fechado.', schema: { example: { id: 'clx...', valorAbertura: 100, valorFechamento: 480, abertoPor: { nome: 'Maria da Silva' }, fechadoPor: { nome: 'Maria da Silva' } } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Informe o valor contado em caixa.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Caixa não encontrado.', schema: { example: { erro: 'Caixa não encontrado.' } } })
  @ApiResponse({ status: 409, description: 'Este caixa já foi fechado, ou não é o caixa do dia atual.', schema: { example: { erro: 'Este caixa já foi fechado.' } } })
  fechar (
    @Param('id') id: string,
    @Body() dto: FecharCaixaDto,
    @CurrentUser() usuario: UsuarioAutenticado
  ) {
    return this.caixaService.fechar(id, dto, usuario.id)
  }
}
