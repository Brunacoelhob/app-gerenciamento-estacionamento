import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { GerarEspelhoPontoDto } from './dto/gerar-espelho-ponto.dto'
import { EspelhoPontoService } from './espelho-ponto.service'

@ApiTags('Espelho de Ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('espelho-ponto')
export class EspelhoPontoController {
  constructor (private readonly espelhoPontoService: EspelhoPontoService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post('gerar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar espelho de ponto do mês', description: 'Acesso: admin, rh. O mês precisa já estar encerrado.' })
  @ApiResponse({ status: 201, description: 'Espelho de ponto gerado.', schema: { example: { id: 'clx...', usuarioId: 'clx...', referencia: '2026-08', status: 'gerado' } } })
  @ApiResponse({ status: 400, description: 'Mês ainda não encerrado.', schema: { example: { erro: 'Só é possível gerar o espelho de um mês já encerrado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário sem perfil de RH cadastrado.', schema: { example: { erro: 'Funcionário sem perfil de RH cadastrado.' } } })
  @ApiResponse({ status: 409, description: 'Espelho já gerado para essa referência.', schema: { example: { erro: 'Já existe um espelho de ponto gerado para este funcionário nesta referência.' } } })
  gerar (@Body() dto: GerarEspelhoPontoDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.espelhoPontoService.gerar(dto, solicitante)
  }

  @Get()
  @ApiOperation({ summary: 'Listar espelhos de ponto', description: 'Sem usuarioId, lista os próprios espelhos.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de espelhos de ponto.', schema: { example: [{ id: 'clx...', referencia: '2026-08', status: 'assinado' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.espelhoPontoService.listar(solicitante, usuarioId)
  }

  @Post(':id/assinar')
  @ApiOperation({ summary: 'Assinar espelho de ponto', description: 'Só o próprio dono pode assinar. Exige assinatura eletrônica já cadastrada.' })
  @ApiParam({ name: 'id', description: 'Id do espelho de ponto.' })
  @ApiResponse({ status: 201, description: 'Espelho assinado.', schema: { example: { id: 'clx...', status: 'assinado' } } })
  @ApiResponse({ status: 400, description: 'É preciso cadastrar uma assinatura eletrônica antes.', schema: { example: { erro: 'Cadastre sua assinatura eletrônica antes de assinar documentos.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono pode assinar.', schema: { example: { erro: 'Você só pode assinar o seu próprio espelho de ponto.' } } })
  @ApiResponse({ status: 404, description: 'Espelho não encontrado.', schema: { example: { erro: 'Espelho de ponto não encontrado.' } } })
  @ApiResponse({ status: 409, description: 'Espelho já assinado.', schema: { example: { erro: 'Este espelho de ponto já foi assinado.' } } })
  assinar (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.espelhoPontoService.assinar(id, solicitante)
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Baixar PDF do espelho de ponto', description: 'Acesso: o próprio dono, admin ou rh.' })
  @ApiParam({ name: 'id', description: 'Id do espelho de ponto.' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Arquivo PDF do espelho de ponto.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 400, description: 'Espelho ainda não assinado.', schema: { example: { erro: 'Este espelho de ponto ainda não foi assinado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono, admin ou rh podem baixar.', schema: { example: { erro: 'Você só pode baixar o seu próprio espelho de ponto.' } } })
  @ApiResponse({ status: 404, description: 'Espelho não encontrado.', schema: { example: { erro: 'Espelho de ponto não encontrado.' } } })
  async baixarPdf (
    @Param('id') id: string,
    @CurrentUser() solicitante: UsuarioAutenticado,
    @Res() res: Response
  ) {
    const pdf = await this.espelhoPontoService.gerarPdf(id, solicitante)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="espelho-de-ponto.pdf"')
    res.send(pdf)
  }
}
