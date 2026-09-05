import { validate } from 'class-validator'
import { IsAvatarValido } from './avatar-valido.decorator'

class AlvoTeste {
  @IsAvatarValido()
  avatar?: string | null
}

async function ehValido (avatar: unknown): Promise<boolean> {
  const alvo = new AlvoTeste()
  ;(alvo as any).avatar = avatar
  const erros = await validate(alvo)
  return erros.length === 0
}

// Réplica exata de GALERIA_AVATARES/gerarAvatarSvg (assets/js/modules/auth.js)
// — usada só pra montar um valor "legítimo" de galeria neste teste, sem
// importar o decorator interno (que não exporta a lista).
function gerarAvatarSvgTeste (emoji: string, corFundo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${corFundo}" />
    <text x="32" y="42" font-size="32" text-anchor="middle">${emoji}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

describe('IsAvatarValido', () => {
  it('aceita string vazia, null e undefined (remover avatar)', async () => {
    expect(await ehValido('')).toBe(true)
    expect(await ehValido(null)).toBe(true)
    expect(await ehValido(undefined)).toBe(true)
  })

  it('aceita uma foto rasterizada em base64 (png/jpeg/webp/gif)', async () => {
    expect(await ehValido('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')).toBe(true)
    expect(await ehValido('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true)
    expect(await ehValido('data:image/webp;base64,UklGRiIAAABXRUJQ')).toBe(true)
  })

  it('aceita exatamente um avatar da galeria pronta (svg+xml gerado pelo próprio template fixo)', async () => {
    const avatarDaGaleria = gerarAvatarSvgTeste('🐱', '#fca5a5')
    expect(await ehValido(avatarDaGaleria)).toBe(true)
  })

  it('recusa svg+xml arbitrário fora da galeria, mesmo com o mesmo emoji/cor só ligeiramente diferente', async () => {
    // Regressão: o regex antigo aceitava QUALQUER svg+xml bem formado, não
    // só os 12 da galeria — este teste garante que um SVG "quase igual" ao
    // de um avatar de verdade (cor com um dígito hex a mais) é recusado.
    const svgQuaseIgual = gerarAvatarSvgTeste('🐱', '#fca5a6')
    expect(await ehValido(svgQuaseIgual)).toBe(false)
  })

  it('recusa svg+xml com onload embutido, mesmo percent-encoded (bypass real do regex antigo)', async () => {
    // Regressão do achado da auditoria: `data:image/svg+xml;utf8,%3Csvg...`
    // passava no regex antigo `^data:image\/(...|svg\+xml);(base64,...|utf8,[...])$`
    // porque a classe de caracteres do ramo utf8 permite `%` e dígitos hex,
    // suficiente pra codificar `<svg onload="...">` inteiro sem usar `<`/`>`
    // literais. O navegador não executa esse script quando o SVG é carregado
    // via <img> (é sempre assim neste projeto), mas a validação não deveria
    // depender só disso pra ser segura.
    const payloadPercentEncoded = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg onload="alert(document.cookie)"></svg>')
    expect(await ehValido(payloadPercentEncoded)).toBe(false)
  })

  it('recusa svg+xml malicioso em base64', async () => {
    const payloadBase64 = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')
    expect(await ehValido(payloadBase64)).toBe(false)
  })

  it('recusa tentativa de quebra de atributo HTML (aspas)', async () => {
    expect(await ehValido('x" onerror="alert(1)')).toBe(false)
    expect(await ehValido('data:image/png;base64,"onerror="alert(1)')).toBe(false)
  })

  it('recusa string absurdamente grande', async () => {
    const enorme = 'data:image/png;base64,' + 'A'.repeat(300000)
    expect(await ehValido(enorme)).toBe(false)
  })

  it('recusa tipo que não seja string (ex.: objeto, número)', async () => {
    expect(await ehValido(123)).toBe(false)
    expect(await ehValido({})).toBe(false)
  })
})
