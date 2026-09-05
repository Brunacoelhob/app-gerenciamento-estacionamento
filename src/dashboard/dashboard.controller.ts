import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { DashboardService } from './dashboard.service'

// Não é admin-only: o painel principal é a tela inicial de qualquer
// funcionário autenticado (ver index.html).
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('dashboard')
export class DashboardController {
  constructor (private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs do painel principal' })
  @ApiQuery({ name: 'tipo', required: false, type: String, description: 'Filtra por tipo de vaga (comum/coberta/mensalista) ou "todos".' })
  @ApiResponse({ status: 200, description: 'KPIs agregados do estacionamento.', schema: { example: { vagasLivres: 10, vagasOcupadas: 15, faturamentoHoje: 320, ticketMedio: 21.3, tempoMedioPermanenciaMinutos: 95 } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  kpis (@Query('tipo') tipo?: string) {
    return this.dashboardService.calcularKpis(tipo)
  }

  @Get('ranking-vagas')
  @ApiOperation({ summary: 'Ranking de uso das vagas' })
  @ApiResponse({ status: 200, description: 'Ranking de vagas por uso.', schema: { example: [{ codigo: 'A01', totalTickets: 42 }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  rankingVagas () {
    return this.dashboardService.calcularRankingVagas()
  }
}
