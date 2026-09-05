import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { minutes, Throttle } from '@nestjs/throttler'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthThrottlerGuard } from '../common/guards/auth-throttler.guard'
import { AuthService } from './auth.service'
import { ConfirmarResetDto } from './dto/confirmar-reset.dto'
import { GoogleDto } from './dto/google.dto'
import { LoginDto } from './dto/login.dto'
import { RegistrarDto } from './dto/registrar.dto'
import { SolicitarResetDto } from './dto/solicitar-reset.dto'

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor (private readonly authService: AuthService) {}

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com CPF e senha', description: 'Autentica um usuário local (não-Google) e devolve o token JWT.' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.', schema: { example: { token: 'eyJhbGciOiJIUzI1NiIs...', usuario: { id: 'clx...', nome: 'Maria da Silva', cpf: '123.456.789-00', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true } } } })
  @ApiResponse({ status: 401, description: 'CPF ou senha inválidos.', schema: { example: { erro: 'CPF ou senha inválidos.' } } })
  @ApiResponse({ status: 403, description: 'Usuário inativo.', schema: { example: { erro: 'Este usuário está inativo. Fale com um administrador do sistema.' } } })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde alguns minutos.', schema: { example: { erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' } } })
  login (@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar novo usuário', description: 'Cria uma conta local (CPF/senha) e devolve o token JWT.' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso.', schema: { example: { token: 'eyJhbGciOiJIUzI1NiIs...', usuario: { id: 'clx...', nome: 'Maria da Silva', cpf: '123.456.789-00', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: true } } } })
  @ApiResponse({ status: 409, description: 'CPF ou e-mail já cadastrado.', schema: { example: { erro: 'Já existe uma conta cadastrada com este CPF.' } } })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde alguns minutos.', schema: { example: { erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' } } })
  registrar (@Body() dto: RegistrarDto) {
    return this.authService.registrar(dto)
  }

  // Sem AuthThrottlerGuard: ao contrário de login/registrar/reset, não há
  // senha ou código pra tentar adivinhar por força bruta — a credencial é um
  // ID token assinado pelo Google, verificado com a chave pública dele (ver
  // AuthService.google), então não faz sentido limitar tentativas aqui.
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login/cadastro via Google', description: 'Verifica o ID token do Google Identity Services e autentica (ou cria) o usuário correspondente.' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.', schema: { example: { token: 'eyJhbGciOiJIUzI1NiIs...', usuario: { id: 'clx...', nome: 'Maria da Silva', email: 'maria@example.com', role: 'funcionario', ativo: true, temSenha: false } } } })
  @ApiResponse({ status: 400, description: 'Não foi possível ler os dados da conta Google.', schema: { example: { erro: 'Não foi possível ler os dados da conta Google.' } } })
  @ApiResponse({ status: 401, description: 'Credencial do Google inválida ou expirada.', schema: { example: { erro: 'Credencial do Google inválida ou expirada.' } } })
  @ApiResponse({ status: 403, description: 'Usuário inativo.', schema: { example: { erro: 'Este usuário está inativo. Fale com um administrador do sistema.' } } })
  @ApiResponse({ status: 503, description: 'Login com Google não configurado no servidor.', schema: { example: { erro: 'Login com Google não está configurado neste servidor (GOOGLE_CLIENT_ID ausente).' } } })
  google (@Body() dto: GoogleDto) {
    return this.authService.google(dto)
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('reset/solicitar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar redefinição de senha', description: 'Envia um código de confirmação por e-mail para redefinir a senha.' })
  @ApiResponse({ status: 200, description: 'Código enviado (se a conta existir e tiver senha local).', schema: { example: { ok: true } } })
  @ApiResponse({ status: 400, description: 'Conta Google não tem senha para redefinir.', schema: { example: { erro: 'Esta conta usa login do Google e não tem senha para redefinir.' } } })
  @ApiResponse({ status: 404, description: 'Nenhuma conta encontrada com esse e-mail.', schema: { example: { erro: 'Não encontramos uma conta com este e-mail.' } } })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde alguns minutos.', schema: { example: { erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' } } })
  solicitarReset (@Body() dto: SolicitarResetDto) {
    return this.authService.solicitarReset(dto)
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('reset/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar redefinição de senha', description: 'Valida o código recebido por e-mail e define a nova senha.' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.', schema: { example: { ok: true } } })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado.', schema: { example: { erro: 'Código de verificação inválido ou expirado.' } } })
  @ApiResponse({ status: 404, description: 'Nenhuma conta encontrada com esse e-mail.', schema: { example: { erro: 'Usuário não encontrado.' } } })
  @ApiResponse({ status: 429, description: 'Muitas tentativas — aguarde alguns minutos.', schema: { example: { erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' } } })
  confirmarReset (@Body() dto: ConfirmarResetDto) {
    return this.authService.confirmarReset(dto)
  }
}
