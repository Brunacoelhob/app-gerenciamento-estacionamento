import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service'

export interface UsuarioAutenticado {
  id: string
  role: string
  nome: string
  cpfPendente: boolean
}

// `iat` (issued at, em segundos desde epoch) vem de todo token assinado por
// jwtService.sign() por padrão (ninguém passa `noTimestamp` no projeto) —
// não faz parte de UsuarioAutenticado (o payload "de negócio") porque só
// interessa aqui dentro do guard, pra comparar contra Usuario.senhaAlteradaEm.
interface PayloadToken extends UsuarioAutenticado {
  iat: number
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor (
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate (context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>()
    const [, token] = (request.headers.authorization || '').split(' ')

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente.')
    }

    let payload: PayloadToken
    try {
      // Sem `secret` explícito: usa o mesmo segredo já configurado no
      // JwtModule.registerAsync (app.module.ts), lido via ConfigService.
      payload = this.jwtService.verify<PayloadToken>(token)
    } catch {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.')
    }

    // Revalida contra o banco a cada requisição, em vez de confiar cegamente
    // em role/ativo "fotografados" no token no momento do login: sem isso,
    // desativar uma conta comprometida (ou rebaixar um usuário) continuava
    // valendo por até JWT_EXPIRES_IN (8h por padrão). `role` sempre vem do
    // banco (nunca do claim antigo), então uma mudança de papel feita por um
    // admin passa a valer na próxima requisição, não só no próximo login.
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { role: true, ativo: true, senhaAlteradaEm: true }
    })
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.')
    }

    // Token emitido ANTES da última troca de senha não vale mais — sem essa
    // checagem, trocar a própria senha (pra reagir a um token vazado, por
    // exemplo) não invalidava sessões antigas: o token continuava
    // criptograficamente válido até expirar (até 8h por padrão), mesmo
    // depois de "reagir ao vazamento". `senhaAlteradaEm` é sempre gravado
    // ANTES de qualquer novo token ser emitido (ver AuthService.login/
    // registrar/UsuariosService.atualizarPerfil), então o token novo emitido
    // na própria troca nunca é invalidado por esta checagem — só os antigos.
    if (usuario.senhaAlteradaEm && Math.floor(usuario.senhaAlteradaEm.getTime() / 1000) > payload.iat) {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.')
    }

    request.usuario = { id: payload.id, role: usuario.role, nome: payload.nome, cpfPendente: payload.cpfPendente }
    return true
  }
}
