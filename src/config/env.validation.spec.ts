import { validate } from './env.validation'

const SEGREDO_FORTE = 'x'.repeat(32)

describe('validate (env.validation)', () => {
  let exitSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    // process.exit de verdade encerraria o processo de teste — troca por um
    // spy que lança, pra parar a execução da função exatamente como
    // process.exit pararia, sem matar o Jest.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit chamado') })
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('aceita configuração válida com JWT_SECRET forte', () => {
    const config = { JWT_SECRET: SEGREDO_FORTE, DATABASE_URL: 'postgresql://x' }
    expect(validate(config)).toBe(config)
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it('recusa quando falta JWT_SECRET ou DATABASE_URL', () => {
    expect(() => validate({ DATABASE_URL: 'postgresql://x' })).toThrow()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('recusa JWT_SECRET curto/fraco (ex.: "secret") mesmo com DATABASE_URL presente', () => {
    // Regressão: antes só checava se JWT_SECRET existia, não se era forte o
    // suficiente para resistir a força bruta offline sobre a assinatura HS256.
    expect(() => validate({ JWT_SECRET: 'secret', DATABASE_URL: 'postgresql://x' })).toThrow()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('aceita um JWT_SECRET com exatamente 32 caracteres (limite mínimo)', () => {
    const config = { JWT_SECRET: 'a'.repeat(32), DATABASE_URL: 'postgresql://x' }
    expect(validate(config)).toBe(config)
    expect(exitSpy).not.toHaveBeenCalled()
  })
})
