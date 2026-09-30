// Mesmo padrão de referência "YYYY-MM" usado em Mensalidade.referencia (ver
// referenciaAtual em mensalidades.service.ts) — centralizado aqui porque o
// módulo Financeiro usa em três lugares (geração da ocorrência mensal,
// listagem de despesas e cálculo do resumo/DRE).
export function referenciaDe (data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

export function referenciaAtual (): string {
  return referenciaDe(new Date())
}

// Data de vencimento de uma ocorrência gerada a partir de um dia fixo do mês
// (1-28) — usa o dia informado diretamente, sem precisar de clamp porque
// DespesaRecorrente.diaVencimento já é limitado a 1-28 no DTO (todo mês tem
// pelo menos 28 dias).
export function dataVencimentoNoMes (referencia: string, diaVencimento: number): Date {
  const [ano, mes] = referencia.split('-').map(Number)
  return new Date(ano, mes - 1, diaVencimento)
}

export function referenciaAnterior (referencia: string): string {
  const [ano, mes] = referencia.split('-').map(Number)
  const dataMesAnterior = new Date(ano, mes - 2, 1)
  return referenciaDe(dataMesAnterior)
}

export function rangeDoMes (referencia: string): { inicio: Date, fim: Date } {
  const [ano, mes] = referencia.split('-').map(Number)
  return { inicio: new Date(ano, mes - 1, 1), fim: new Date(ano, mes, 1) }
}

// "YYYY-MM-DD" (ou um ISO mais longo, do qual só a data importa) -> meia-noite
// local — mesmo motivo de parseDataLocal em ponto-datas.util.ts: não usar
// `new Date(string)` direto, o parser ISO trata string "YYYY-MM-DD" como UTC,
// o que pode voltar um dia por causa do fuso do servidor.
export function parseDataVencimento (dataIso: string): Date {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

// Colunas @db.Date (Despesa.dataVencimento) voltam do Postgres como
// meia-noite UTC do dia gravado, não meia-noite local (mesmo comportamento
// documentado em ponto-datas.util.ts/caixa-datas.util.ts) — por isso usa
// getters UTC pra normalizar uma data vinda do banco em chave "YYYY-MM-DD",
// comparável como string contra chaveDataLocalHoje (getters locais, só pra
// "hoje" construído nesta mesma execução).
export function chaveDataDoBanco (data: Date): string {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`
}

export function chaveDataLocalHoje (): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
}

// Uma despesa pendente está atrasada quando o dia de vencimento (calendário)
// já passou — comparação por chave "YYYY-MM-DD", nunca por instante bruto
// (`data < new Date()`): isso marcaria uma despesa que vence HOJE como
// atrasada assim que passasse meia-noite UTC, ou seja, ainda à noite do dia
// anterior em fusos atrás de UTC (Brasil, UTC-3) — ver bug relatado no
// code-review desta feature.
export function estaAtrasada (dataVencimento: Date): boolean {
  return chaveDataDoBanco(dataVencimento) < chaveDataLocalHoje()
}
