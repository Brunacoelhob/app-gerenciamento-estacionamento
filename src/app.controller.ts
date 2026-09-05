import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ADICIONAL_VAGA_COBERTA_VALOR, TEMPO_TOLERANCIA_MINUTOS } from './cobranca/cobranca.service'
import { DURACAO_CICLO_DIAS } from './mensalidade-ciclo/mensalidade-ciclo.service'

@ApiTags('App')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Healthcheck', description: 'Rota pública usada para verificar se a API está no ar.' })
  @ApiResponse({ status: 200, description: 'API operante.', schema: { example: { ok: true } } })
  health () {
    return { ok: true }
  }

  // Constantes de regra de cobrança usadas só pra prévia de valor mostrada
  // no front antes de confirmar o fechamento de um ticket (Tickets e
  // Dashboard) — o valor cobrado de fato é sempre recalculado no backend
  // (TicketsService.fechar), mas a prévia não pode divergir se essas regras
  // mudarem só aqui.
  @Get('config')
  @ApiOperation({ summary: 'Configurações públicas', description: 'Constantes de regra de cobrança usadas pelo front para prévia de valores.' })
  @ApiResponse({ status: 200, description: 'Constantes de configuração.', schema: { example: { toleranciaMinutos: 15, duracaoCicloMensalistaDias: 30, adicionalVagaCobertaValor: 5 } } })
  config () {
    return {
      toleranciaMinutos: TEMPO_TOLERANCIA_MINUTOS,
      duracaoCicloMensalistaDias: DURACAO_CICLO_DIAS,
      adicionalVagaCobertaValor: ADICIONAL_VAGA_COBERTA_VALOR
    }
  }
}
