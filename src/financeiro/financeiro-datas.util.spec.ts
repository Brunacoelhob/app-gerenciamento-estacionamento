import { chaveDataLocalHoje, dataVencimentoNoMes, estaAtrasada, parseDataVencimento } from './financeiro-datas.util'

describe('financeiro-datas.util', () => {
  describe('parseDataVencimento', () => {
    it('preserva o dia informado, sem deslocar por fuso horário', () => {
      const data = parseDataVencimento('2026-09-15')
      expect(data.getFullYear()).toBe(2026)
      expect(data.getMonth()).toBe(8)
      expect(data.getDate()).toBe(15)
    })

    it('ignora a parte de hora se vier um ISO mais longo', () => {
      const data = parseDataVencimento('2026-01-01T00:00:00.000Z')
      expect(data.getDate()).toBe(1)
      expect(data.getMonth()).toBe(0)
    })
  })

  describe('dataVencimentoNoMes', () => {
    it('monta a data no dia pedido do mês de referência', () => {
      const data = dataVencimentoNoMes('2026-02', 15)
      expect(data.getFullYear()).toBe(2026)
      expect(data.getMonth()).toBe(1)
      expect(data.getDate()).toBe(15)
    })
  })

  describe('estaAtrasada', () => {
    // Regressão do bug relatado no code-review: comparar o instante bruto
    // (`data < new Date()`) marcava uma despesa que vence HOJE como atrasada
    // assim que passasse meia-noite UTC — ainda de noite no dia anterior em
    // fusos atrás de UTC (Brasil, UTC-3). estaAtrasada compara só a
    // data-calendário, então uma despesa que vence hoje nunca é "atrasada".
    it('uma despesa que vence hoje não está atrasada', () => {
      const hoje = new Date()
      // Simula o formato como a data volta do banco: meia-noite UTC do dia
      // gravado (ver comentário de chaveDataDoBanco).
      const vencimentoHojeComoViriaDoBanco = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
      expect(estaAtrasada(vencimentoHojeComoViriaDoBanco)).toBe(false)
    })

    it('uma despesa vencida ontem está atrasada', () => {
      const ontem = new Date()
      ontem.setDate(ontem.getDate() - 1)
      const vencimentoOntemComoViriaDoBanco = new Date(Date.UTC(ontem.getFullYear(), ontem.getMonth(), ontem.getDate()))
      expect(estaAtrasada(vencimentoOntemComoViriaDoBanco)).toBe(true)
    })

    it('uma despesa que vence amanhã não está atrasada', () => {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      const vencimentoAmanhaComoViriaDoBanco = new Date(Date.UTC(amanha.getFullYear(), amanha.getMonth(), amanha.getDate()))
      expect(estaAtrasada(vencimentoAmanhaComoViriaDoBanco)).toBe(false)
    })
  })

  describe('chaveDataLocalHoje', () => {
    it('formata como YYYY-MM-DD', () => {
      expect(chaveDataLocalHoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
