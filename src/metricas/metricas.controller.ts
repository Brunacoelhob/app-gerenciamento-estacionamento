import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { MetricasService } from './metricas.service'

// Métricas expõe receita/KPIs agregados do estacionamento inteiro — por
// isso é restrito a admin e financeiro (ver guarda de rota em
// views/metricas.html). O cálculo roda inteiro aqui: o front nunca recebe a
// lista crua de tickets/mensalidades/mensalistas/vagas pra essa tela.
@ApiTags('Métricas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard, RolesGuard)
@Roles('admin', 'financeiro')
@Controller('metricas')
export class MetricasController {
  constructor (private readonly metricasService: MetricasService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas agregadas', description: 'Acesso: admin, financeiro.' })
  @ApiQuery({ name: 'periodo', required: false, enum: ['7_dias', '30_dias', 'mes_atual', 'todos'] })
  @ApiResponse({ status: 200, description: 'Payload completo de métricas (KPIs, gráficos, comparativos).', schema: { example: { periodo: '30_dias', receitaTotal: 12000, kpis: {}, graficos: {} } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e financeiro.', schema: { example: { erro: 'Acesso restrito.' } } })
  obter (@Query('periodo') periodo?: string) {
    return this.metricasService.calcular(periodo)
  }
}
