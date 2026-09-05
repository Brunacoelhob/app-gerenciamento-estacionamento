import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { ContratoTrabalhoService } from './contrato-trabalho.service'
import { GerarContratoTrabalhoDto } from './dto/gerar-contrato-trabalho.dto'

@ApiTags('Contrato de Trabalho')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('contrato-trabalho')
export class ContratoTrabalhoController {
  constructor (private readonly contratoTrabalhoService: ContratoTrabalhoService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post('gerar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar (nova versão de) contrato de trabalho', description: 'Acesso: admin, rh.' })
  @ApiResponse({ status: 201, description: 'Contrato gerado.', schema: { example: { id: 'clx...', usuarioId: 'clx...', versao: 1, status: 'gerado' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário sem perfil de RH cadastrado.', schema: { example: { erro: 'Funcionário sem perfil de RH cadastrado.' } } })
  @ApiResponse({ status: 409, description: 'Já existe uma nova versão sendo gerada.', schema: { example: { erro: 'Uma nova versão já está sendo gerada para este funcionário. Tente novamente.' } } })
  gerar (@Body() dto: GerarContratoTrabalhoDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.contratoTrabalhoService.gerar(dto, solicitante)
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos de trabalho', description: 'Sem usuarioId, lista os próprios contratos.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de contratos.', schema: { example: [{ id: 'clx...', versao: 1, status: 'assinado' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.contratoTrabalhoService.listar(solicitante, usuarioId)
  }

  @Post(':id/assinar')
  @ApiOperation({ summary: 'Assinar contrato de trabalho', description: 'Só o próprio dono pode assinar. Exige assinatura eletrônica já cadastrada.' })
  @ApiParam({ name: 'id', description: 'Id do contrato.' })
  @ApiResponse({ status: 201, description: 'Contrato assinado.', schema: { example: { id: 'clx...', status: 'assinado' } } })
  @ApiResponse({ status: 400, description: 'É preciso cadastrar uma assinatura eletrônica antes.', schema: { example: { erro: 'Cadastre sua assinatura eletrônica antes de assinar documentos.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono pode assinar.', schema: { example: { erro: 'Você só pode assinar o seu próprio contrato.' } } })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado.', schema: { example: { erro: 'Versão de contrato não encontrada.' } } })
  @ApiResponse({ status: 409, description: 'Contrato já assinado.', schema: { example: { erro: 'Esta versão do contrato já foi assinada.' } } })
  assinar (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.contratoTrabalhoService.assinar(id, solicitante)
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Baixar PDF do contrato de trabalho', description: 'Acesso: o próprio dono, admin ou rh.' })
  @ApiParam({ name: 'id', description: 'Id do contrato.' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Arquivo PDF do contrato de trabalho.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 400, description: 'Contrato ainda não assinado.', schema: { example: { erro: 'Esta versão do contrato ainda não foi assinada.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono, admin ou rh podem baixar.', schema: { example: { erro: 'Você só pode baixar o seu próprio contrato.' } } })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado.', schema: { example: { erro: 'Versão de contrato não encontrada.' } } })
  async baixarPdf (
    @Param('id') id: string,
    @CurrentUser() solicitante: UsuarioAutenticado,
    @Res() res: Response
  ) {
    const pdf = await this.contratoTrabalhoService.gerarPdf(id, solicitante)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="contrato-de-trabalho.pdf"')
    res.send(pdf)
  }
}
