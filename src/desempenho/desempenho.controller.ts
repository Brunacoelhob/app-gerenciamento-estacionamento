import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { DesempenhoService } from './desempenho.service'

// Só admin/rh/gestor — desempenho é dado de gestão sobre terceiros, nunca
// visível pro funcionário comum.
@ApiTags('Desempenho')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'rh', 'gestor')
@Controller('desempenho')
export class DesempenhoController {
  constructor (private readonly desempenhoService: DesempenhoService) {}

  @Get()
  @ApiOperation({ summary: 'Relatório de desempenho por funcionário', description: 'Acesso: admin, rh, gestor.' })
  @ApiQuery({ name: 'referencia', required: false, type: String, example: '2026-09', description: 'Formato YYYY-MM.' })
  @ApiResponse({ status: 200, description: 'Relatório de desempenho.', schema: { example: [{ usuarioId: 'clx...', nome: 'Maria da Silva', totalAtendimentos: 120 }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a administradores, RH e gestores.', schema: { example: { erro: 'Acesso restrito.' } } })
  relatorio (@Query('referencia') referencia?: string) {
    return this.desempenhoService.relatorio(referencia)
  }
}
