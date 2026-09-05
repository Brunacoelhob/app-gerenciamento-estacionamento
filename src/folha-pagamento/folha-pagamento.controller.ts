import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { GerarHoleriteDto } from './dto/gerar-holerite.dto'
import { FolhaPagamentoService } from './folha-pagamento.service'

@ApiTags('Folha de Pagamento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('folha-pagamento')
export class FolhaPagamentoController {
  constructor (private readonly folhaPagamentoService: FolhaPagamentoService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post('gerar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar holerite do mês', description: 'Acesso: admin, rh. O mês precisa já estar encerrado.' })
  @ApiResponse({ status: 201, description: 'Holerite gerado.', schema: { example: { id: 'clx...', usuarioId: 'clx...', referencia: '2026-08', status: 'gerado' } } })
  @ApiResponse({ status: 400, description: 'Mês ainda não encerrado.', schema: { example: { erro: 'Só é possível gerar o holerite de um mês já encerrado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Funcionário sem perfil de RH cadastrado.', schema: { example: { erro: 'Funcionário sem perfil de RH cadastrado.' } } })
  @ApiResponse({ status: 409, description: 'Holerite já gerado para essa referência.', schema: { example: { erro: 'Já existe um holerite gerado para este funcionário nesta referência.' } } })
  gerar (@Body() dto: GerarHoleriteDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.folhaPagamentoService.gerar(dto, solicitante)
  }

  @Get()
  @ApiOperation({ summary: 'Listar holerites', description: 'Sem usuarioId, lista os próprios holerites.' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de holerites.', schema: { example: [{ id: 'clx...', referencia: '2026-08', status: 'pago' }] } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  listar (@CurrentUser() solicitante: UsuarioAutenticado, @Query('usuarioId') usuarioId?: string) {
    return this.folhaPagamentoService.listar(solicitante, usuarioId)
  }

  @Post(':id/assinar')
  @ApiOperation({ summary: 'Assinar holerite', description: 'Só o próprio dono pode assinar. Exige assinatura eletrônica já cadastrada.' })
  @ApiParam({ name: 'id', description: 'Id do holerite.' })
  @ApiResponse({ status: 201, description: 'Holerite assinado.', schema: { example: { id: 'clx...', status: 'assinado' } } })
  @ApiResponse({ status: 400, description: 'É preciso cadastrar uma assinatura eletrônica antes.', schema: { example: { erro: 'Cadastre sua assinatura eletrônica antes de assinar documentos.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono pode assinar.', schema: { example: { erro: 'Você só pode assinar o seu próprio holerite.' } } })
  @ApiResponse({ status: 404, description: 'Holerite não encontrado.', schema: { example: { erro: 'Holerite não encontrado.' } } })
  @ApiResponse({ status: 409, description: 'Holerite já assinado.', schema: { example: { erro: 'Este holerite já foi assinado.' } } })
  assinar (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.folhaPagamentoService.assinar(id, solicitante)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'rh')
  @Post(':id/pagar')
  @ApiOperation({ summary: 'Marcar holerite como pago', description: 'Acesso: admin, rh. Exige que o holerite já esteja assinado.' })
  @ApiParam({ name: 'id', description: 'Id do holerite.' })
  @ApiResponse({ status: 201, description: 'Holerite marcado como pago.', schema: { example: { id: 'clx...', status: 'pago' } } })
  @ApiResponse({ status: 400, description: 'É preciso estar assinado antes de pagar.', schema: { example: { erro: 'O holerite precisa estar assinado pelo funcionário antes de ser pago.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou acesso restrito a administradores e RH.', schema: { example: { erro: 'Acesso restrito.' } } })
  @ApiResponse({ status: 404, description: 'Holerite não encontrado.', schema: { example: { erro: 'Holerite não encontrado.' } } })
  @ApiResponse({ status: 409, description: 'Holerite já pago.', schema: { example: { erro: 'Este holerite já foi pago.' } } })
  pagar (@Param('id') id: string, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.folhaPagamentoService.pagar(id, solicitante)
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Baixar PDF do holerite', description: 'Acesso: o próprio dono, admin ou rh.' })
  @ApiParam({ name: 'id', description: 'Id do holerite.' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Arquivo PDF do holerite.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 400, description: 'Holerite ainda não assinado.', schema: { example: { erro: 'Este holerite ainda não foi assinado.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar, ou só o próprio dono, admin ou rh podem baixar.', schema: { example: { erro: 'Você só pode baixar o seu próprio holerite.' } } })
  @ApiResponse({ status: 404, description: 'Holerite não encontrado.', schema: { example: { erro: 'Holerite não encontrado.' } } })
  async baixarPdf (
    @Param('id') id: string,
    @CurrentUser() solicitante: UsuarioAutenticado,
    @Res() res: Response
  ) {
    const pdf = await this.folhaPagamentoService.gerarPdf(id, solicitante)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="holerite.pdf"')
    res.send(pdf)
  }
}
