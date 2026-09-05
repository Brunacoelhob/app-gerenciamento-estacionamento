import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JwtAuthGuard } from './jwt-auth.guard'

function contextoCom (headers: Record<string, string>): ExecutionContext {
  const request: any = { headers }
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as ExecutionContext
}

function criarPrismaFake (usuarios: any[] = []) {
  return {
    usuario: {
      async findUnique ({ where: { id } }: any) { return usuarios.find(u => u.id === id) ?? null }
    }
  }
}

// iat em segundos desde epoch, igual ao formato real de um JWT — os testes
// de senhaAlteradaEm comparam contra isso, então precisa ser um número
// "de verdade", não só um valor qualquer.
const AGORA_SEGUNDOS = Math.floor(Date.now() / 1000)

describe('JwtAuthGuard', () => {
  it('rejeita quando não há token no header Authorization', async () => {
    const guard = new JwtAuthGuard({} as JwtService, criarPrismaFake() as any)
    await expect(guard.canActivate(contextoCom({}))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejeita quando o token é inválido/expirado', async () => {
    const jwtService = { verify: jest.fn(() => { throw new Error('inválido') }) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake() as any)
    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-invalido' })))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejeita quando o usuário do token não existe mais no banco', async () => {
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([]) as any)
    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-valido' })))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejeita quando o usuário foi desativado depois de o token ter sido emitido', async () => {
    // Regressão: token emitido enquanto a conta estava ativa, mas o admin
    // desativou o usuário depois — o token antigo não pode continuar valendo
    // até expirar (até 8h por padrão).
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'admin', ativo: false }]) as any)
    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-valido' })))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('permite e anexa req.usuario quando o token é válido e a conta está ativa', async () => {
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'admin', ativo: true }]) as any)
    const request: any = { headers: { authorization: 'Bearer token-valido' } }
    const contexto = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext

    await expect(guard.canActivate(contexto)).resolves.toBe(true)
    expect(request.usuario).toEqual({ id: '1', role: 'admin', nome: 'Teste', cpfPendente: false })
  })

  it('usa o role atual do banco, não o do claim antigo do token', async () => {
    // Regressão: um admin rebaixado para funcionario (ou promovido) depois
    // de logar precisa que a mudança valha já na próxima requisição, não só
    // no próximo login.
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'funcionario', ativo: true }]) as any)
    const request: any = { headers: { authorization: 'Bearer token-valido' } }
    const contexto = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext

    await guard.canActivate(contexto)
    expect(request.usuario.role).toBe('funcionario')
  })

  it('rejeita um token emitido ANTES da última troca de senha', async () => {
    // Regressão: trocar a própria senha (ex.: reação a um token vazado)
    // precisa invalidar qualquer token emitido antes da troca — senão o
    // token vazado continua valendo normalmente até expirar.
    const iatAntigo = AGORA_SEGUNDOS - 3600 // token emitido 1h atrás
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: iatAntigo }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const senhaAlteradaEm = new Date() // trocada agora, depois do token
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'admin', ativo: true, senhaAlteradaEm }]) as any)

    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-antigo' })))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('permite um token emitido DEPOIS da última troca de senha (o token novo gerado na própria troca)', async () => {
    const senhaAlteradaEm = new Date(Date.now() - 3600 * 1000) // trocada 1h atrás
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'admin', ativo: true, senhaAlteradaEm }]) as any)

    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-novo' }))).resolves.toBe(true)
  })

  it('permite quando senhaAlteradaEm é null (conta nunca teve senha local trocada)', async () => {
    const payload = { id: '1', role: 'admin', nome: 'Teste', cpfPendente: false, iat: AGORA_SEGUNDOS }
    const jwtService = { verify: jest.fn(() => payload) } as unknown as JwtService
    const guard = new JwtAuthGuard(jwtService, criarPrismaFake([{ id: '1', role: 'admin', ativo: true, senhaAlteradaEm: null }]) as any)

    await expect(guard.canActivate(contextoCom({ authorization: 'Bearer token-valido' }))).resolves.toBe(true)
  })
})
