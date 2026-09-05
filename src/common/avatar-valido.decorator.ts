import { registerDecorator, type ValidationOptions } from 'class-validator'

// Mesma lista e mesmo gerador de SVG do front — ver GALERIA_AVATARES/
// gerarAvatarSvg em assets/js/modules/auth.js. Precisa ficar em sincronia
// manual com aquele arquivo (mudou lá, muda aqui também).
const GALERIA_AVATARES = [
  { emoji: '🐱', cor: '#fca5a5' },
  { emoji: '🐶', cor: '#fdba74' },
  { emoji: '🦊', cor: '#fcd34d' },
  { emoji: '🐼', cor: '#a5b4fc' },
  { emoji: '🐨', cor: '#94a3b8' },
  { emoji: '🦉', cor: '#c4b5fd' },
  { emoji: '🐰', cor: '#f9a8d4' },
  { emoji: '🐻', cor: '#d6a77a' },
  { emoji: '🐧', cor: '#7dd3fc' },
  { emoji: '🦄', cor: '#f0abfc' },
  { emoji: '🐸', cor: '#86efac' },
  { emoji: '🐵', cor: '#fdba74' }
]

function gerarAvatarSvg (emoji: string, corFundo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${corFundo}" />
    <text x="32" y="42" font-size="32" text-anchor="middle">${emoji}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// Conjunto fechado dos únicos data URIs svg+xml aceitáveis — os 12 avatares
// prontos da galeria, gerados sempre com o mesmo template fixo (só emoji e
// cor variam, de uma lista hardcoded). Nunca aceita SVG arbitrário.
const AVATARES_GALERIA_VALIDOS = new Set(GALERIA_AVATARES.map(av => gerarAvatarSvg(av.emoji, av.cor)))

// Foto enviada pelo usuário: só formatos rasterizados (sem svg+xml) — SVG é
// o único formato de imagem cujo conteúdo pode embutir comportamento
// (evento onload, <script>) em vez de só pixels. Nenhuma tela do front
// hoje renderiza o avatar de um jeito que executaria esse script (é sempre
// <img>, nunca <object>/<iframe>, e SVG carregado via <img> não roda
// script em navegador nenhum), mas aceitar só o que a galeria pré-gerada
// realmente produz fecha esse risco de vez, sem depender de nenhum
// comportamento de renderização se manter no futuro.
const REGEX_AVATAR_FOTO = /^data:image\/(png|jpe?g|gif|webp);(base64,[A-Za-z0-9+/=]+|utf8,[A-Za-z0-9\-_.!~*'()%]+)$/

export const MENSAGEM_AVATAR_INVALIDO = 'Avatar inválido.'

export function IsAvatarValido (validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAvatarValido',
      target: object.constructor,
      propertyName,
      options: { message: MENSAGEM_AVATAR_INVALIDO, ...validationOptions },
      validator: {
        validate (valor: unknown) {
          if (valor === '' || valor === null || valor === undefined) return true
          if (typeof valor !== 'string') return false
          if (valor.length > 200000) return false
          return REGEX_AVATAR_FOTO.test(valor) || AVATARES_GALERIA_VALIDOS.has(valor)
        }
      }
    })
  }
}
