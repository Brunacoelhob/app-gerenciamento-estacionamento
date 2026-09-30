import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { FinanceiroService } from './financeiro.service'

// DRE simplificado (receita - despesa = lucro) — só admin/financeiro, mesma
// guarda de Métricas/Faturamento.
@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard, RolesGuard)
@Roles('admin', 'financeiro')
@Controller('financeiro')
export class FinanceiroController {
  constructor (private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo financeiro (DRE) do mês', description: 'Acesso: admin, financeiro.' })
  @ApiQuery({ name: 'referencia', required: false, type: String, example: '2026-09', description: 'Formato YYYY-MM. Padrão: mês atual.' })
  @ApiResponse({ status: 200, description: 'DRE simplificado do mês.', schema: { example: { referencia: '2026-09', receitaTickets: 3200, receitaMensalidades: 5000, despesasPagas: 3650, custoFolha: 4000, receitaTotal: 8200, despesaTotal: 7650, lucroLiquido: 550, margemLucro: 6.7, despesasPendentes: 2, despesasAtrasadas: 0, listaDespesasPendentes: [], comparativoMesAnterior: {} } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  resumo (@Query('referencia') referencia: string | undefined, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.financeiroService.calcularResumo(referencia, usuario)
  }

  @Get('evolucao')
  @ApiOperation({ summary: 'Evolução financeira mensal', description: 'Acesso: admin, financeiro.' })
  @ApiQuery({ name: 'meses', required: false, type: String, example: '6', description: 'Quantidade de meses (1–24). Padrão: 6.' })
  @ApiResponse({ status: 200, description: 'Série histórica de receita/despesa/lucro por mês.', schema: { example: [{ mes: 'set/26', referencia: '2026-09', receita: 8200, despesa: 7650, lucro: 550 }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  evolucao (@Query('meses') meses?: string) {
    const quantidade = Number(meses) > 0 ? Math.min(Number(meses), 24) : 6
    return this.financeiroService.calcularEvolucao(quantidade)
  }
}
