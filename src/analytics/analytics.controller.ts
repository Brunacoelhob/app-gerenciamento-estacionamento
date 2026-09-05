import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { seconds, Throttle } from '@nestjs/throttler'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { EventosThrottlerGuard } from '../common/guards/eventos-throttler.guard'
import { AnalyticsService } from './analytics.service'
import { RegistrarEventosDto } from './dto/registrar-eventos.dto'

// Sem guard de auth: o banner de LGPD aparece antes do login, e a captura de
// telemetria roda em qualquer tela, autenticada ou não. Quem controla se o
// navegador manda algo é o consentimento (window.analyticsPermitido no
// front), não a sessão. O guard de rate limit existe só pra impedir abuso
// do endpoint.
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor (private readonly analyticsService: AnalyticsService) {}

  @UseGuards(EventosThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post('eventos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registrar eventos de telemetria', description: 'Rota pública, rate-limited. Usada para eventos de visualização de tela e tempo-na-tela.' })
  @ApiResponse({ status: 204, description: 'Eventos registrados.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'tipo must be one of the following values: visualizacao, tempo-na-tela' } } })
  @ApiResponse({ status: 429, description: 'Muitos eventos enviados — tente novamente em instantes.', schema: { example: { erro: 'Muitos eventos enviados. Tente novamente em instantes.' } } })
  async registrarEventos (@Body() dto: RegistrarEventosDto) {
    await this.analyticsService.registrarEventos(dto.eventos)
  }
}
