import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard, type UsuarioAutenticado } from '../common/guards/jwt-auth.guard'
import { ProfileCompleteGuard } from '../common/guards/profile-complete.guard'
import { AssinaturaEletronicaService } from './assinatura-eletronica.service'
import { CadastrarAssinaturaDto } from './dto/cadastrar-assinatura.dto'

// Só rotas "me" — assinatura eletrônica é sempre a do próprio usuário
// logado, nunca gerenciada por terceiros (nem RH/admin cadastram por ele).
@ApiTags('Assinatura Eletrônica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProfileCompleteGuard)
@Controller('assinatura-eletronica')
export class AssinaturaEletronicaController {
  constructor (private readonly assinaturaEletronicaService: AssinaturaEletronicaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Buscar minha assinatura eletrônica' })
  @ApiResponse({ status: 200, description: 'Assinatura cadastrada (ou null se ainda não houver).', schema: { example: { usuarioId: 'clx...', imagemDataUri: 'data:image/png;base64,iVBORw0KG...' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  buscarMinha (@CurrentUser() solicitante: UsuarioAutenticado) {
    return this.assinaturaEletronicaService.buscarMinha(solicitante.id)
  }

  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar minha assinatura eletrônica', description: 'Só é possível cadastrar uma vez — não há rota de edição.' })
  @ApiResponse({ status: 201, description: 'Assinatura cadastrada.', schema: { example: { usuarioId: 'clx...', imagemDataUri: 'data:image/png;base64,iVBORw0KG...' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos.', schema: { example: { erro: 'Assinatura inválida.' } } })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: { example: { erro: 'Token de autenticação ausente.' } } })
  @ApiResponse({ status: 403, description: 'Cadastro incompleto — informe o CPF para continuar.', schema: { example: { erro: 'Cadastro incompleto: informe seu CPF para continuar.', codigo: 'PERFIL_INCOMPLETO' } } })
  @ApiResponse({ status: 409, description: 'Você já tem uma assinatura eletrônica cadastrada.', schema: { example: { erro: 'Você já tem uma assinatura eletrônica cadastrada.' } } })
  cadastrar (@Body() dto: CadastrarAssinaturaDto, @CurrentUser() solicitante: UsuarioAutenticado) {
    return this.assinaturaEletronicaService.cadastrar(solicitante.id, dto)
  }
}
