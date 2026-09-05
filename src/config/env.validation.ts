const OBRIGATORIAS = ['JWT_SECRET', 'DATABASE_URL']

// HS256 (algoritmo padrão do @nestjs/jwt) assina e verifica com a MESMA
// chave — um JWT_SECRET curto/fraco pode ser quebrado por força bruta
// offline a partir de um único token capturado, e a partir daí forjar um
// token válido para qualquer usuário (inclusive admin). 32 caracteres é o
// mínimo geralmente recomendado para um segredo HMAC (equivalente a uns
// 256 bits com bom gerador aleatório); não é uma prova de entropia real,
// só uma rede de segurança contra segredos claramente fracos (ex.: "secret",
// "changeme123") chegando à produção.
const TAMANHO_MINIMO_JWT_SECRET = 32

// Confere as variáveis de ambiente obrigatórias antes de qualquer outra
// coisa subir (rotas, Prisma, etc.). Sem isso, a API sobe "normalmente" e só
// falha de forma confusa na primeira requisição que precisar de JWT_SECRET
// ou DATABASE_URL — preferível recusar o boot com um erro claro.
export function validate (config: Record<string, unknown>) {
  const faltando = OBRIGATORIAS.filter(nome => !config[nome])
  if (faltando.length > 0) {
    console.error(
      `[Boot] Variáveis de ambiente obrigatórias ausentes: ${faltando.join(', ')}. ` +
      'Configure o arquivo .env (veja .env.example) antes de iniciar o servidor.'
    )
    process.exit(1)
  }

  const jwtSecret = String(config.JWT_SECRET || '')
  if (jwtSecret.length < TAMANHO_MINIMO_JWT_SECRET) {
    console.error(
      `[Boot] JWT_SECRET fraco: precisa ter pelo menos ${TAMANHO_MINIMO_JWT_SECRET} caracteres ` +
      `(atual: ${jwtSecret.length}). Gere um valor aleatório forte, ex.: ` +
      '`node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"`.'
    )
    process.exit(1)
  }

  return config
}
