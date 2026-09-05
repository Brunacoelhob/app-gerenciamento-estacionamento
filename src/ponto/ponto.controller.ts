import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { PontoCalculoService } from './ponto-calculo.service'
import { PontoService } from './ponto.service'

@ApiTags('Ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('ponto')
export class PontoController {
  constructor (
    private readonly pontoService: PontoService,
    private readonly pontoCalculoService: PontoCalculoService
  ) {}

  @Post('entrada')
  @ApiOperation({ summary: 'Registrar entrada' })
  @ApiResponse({ status: 201, description: 'Entrada registrada.', schema: { example: { id: 'clx...', usuarioId: 'clx...', entrada: '2026-09-04T11:00:00.000Z', saida: null } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou fora da escala sem autorização de trabalho extra aprovada.', schema: { example: { erro: 'Hoje não é um dia da sua escala. Trabalhar fora da escala exige uma solicitação aprovada previamente.' } } })
  @ApiResponse({ status: 404, description: 'Você ainda não tem um perfil de RH cadastrado.', schema: { example: { erro: 'Você ainda não tem um perfil de RH cadastrado. Fale com o RH.' } } })
  @ApiResponse({ status: 409, description: 'Você já registrou entrada hoje.', schema: { example: { erro: 'Você já registrou entrada hoje.' } } })
  registrarEntrada (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pontoService.registrarEntrada(solicitante.id)
  }

  @Post('saida')
  @ApiOperation({ summary: 'Registrar saída' })
  @ApiResponse({ status: 201, description: 'Saída registrada.', schema: { example: { id: 'clx...', usuarioId: 'clx...', entrada: '2026-09-04T11:00:00.000Z', saida: '2026-09-04T19:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só é possível registrar o próprio ponto.', schema: { example: { erro: 'Você só pode ver o seu próprio ponto.' } } })
  @ApiResponse({ status: 404, description: 'Você ainda não tem um perfil de RH cadastrado.', schema: { example: { erro: 'Você ainda não tem um perfil de RH cadastrado. Fale com o RH.' } } })
  @ApiResponse({ status: 409, description: 'Registre a entrada antes de registrar a saída, ou você já registrou saída hoje.', schema: { example: { erro: 'Registre a entrada antes de registrar a saída.' } } })
  registrarSaida (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.pontoService.registrarSaida(solicitante.id)
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros de ponto', description: 'Sem usuarioId, lista os próprios registros.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiQuery({ name: 'referencia', required: false, type: String, example: '2026-09', description: 'Formato YYYY-MM.' })
  @ApiResponse({ status: 200, description: 'Lista de registros de ponto.', schema: { example: [{ id: 'clx...', entrada: '2026-09-04T11:00:00.000Z', saida: '2026-09-04T19:00:00.000Z' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (
    @CurrentUser() solicitante: UsuarioAutenticado,
    @Query('usuarioId') usuarioId?: string,
    @Query('referencia') referencia?: string
  ) {
    return this.pontoService.listar(usuarioId || solicitante.id, solicitante, referencia)
  }

  // Resumo mensal calculado (horas normais/extras/fora de escala, faltas) —
  // usado tanto pela tela de ponto do próprio funcionário quanto, mais
  // adiante, pelo espelho de ponto e pela folha de pagamento.
  @Get('resumo')
  @ApiOperation({ summary: 'Resumo mensal de ponto', description: 'Horas normais/extras/fora de escala e faltas, calculadas para o mês.' })
  @ApiQuery({ name: 'referencia', required: true, type: String, example: '2026-09', description: 'Formato YYYY-MM.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Resumo do mês.', schema: { example: { referencia: '2026-09', dias: [], totais: { horasNormais: 160, horasExtras: 4, faltas: 0 } } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só é possível ver o próprio resumo (exceto admin/rh/gestor do time).', schema: { example: { erro: 'Você só pode ver o seu próprio resumo de ponto.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário sem perfil de RH cadastrado.', schema: { example: { erro: 'Funcionário sem perfil de RH cadastrado.' } } })
  resumo (
    @CurrentUser() solicitante: UsuarioAutenticado,
    @Query('referencia') referencia: string,
    @Query('usuarioId') usuarioId?: string
  ) {
    return this.pontoCalculoService.resumoMes(usuarioId || solicitante.id, referencia, solicitante)
  }
}
