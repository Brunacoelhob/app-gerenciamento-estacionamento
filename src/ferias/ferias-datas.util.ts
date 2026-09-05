// Utilitários de data do módulo de férias — mesmo cuidado documentado em
// src/ponto/ponto-datas.util.ts: colunas @db.Date voltam do Postgres como
// meia-noite UTC, não meia-noite local. Comparar (<, <=, >, >=) um Date
// construído localmente com um Date lido do banco SEM normalizar dá um
// desvio sistemático de algumas horas (o fuso do servidor) — inofensivo pra
// a maioria das contas, mas quebra exatamente o caso em que duas datas
// deveriam ser "iguais" (ex.: início de uma solicitação == fim de outra, no
// teste de sobreposição). Por isso: todo Date lido do banco usado em
// aritmética/comparação de dia passa por normalizarDataDoBanco antes.

export function dataSemHora (data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate())
}

// "YYYY-MM-DD" -> meia-noite local (não usar `new Date(string)` direto: o
// parser ISO trata a string como UTC).
export function parseDataLocal (chaveData: string): Date {
  const [ano, mes, dia] = chaveData.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function chaveDataDoBanco (data: Date): string {
  const ano = data.getUTCFullYear()
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(data.getUTCDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Converte um Date vindo de uma coluna @db.Date do Prisma pra um Date de
// meia-noite LOCAL do mesmo dia calendário — só depois disso ele pode ser
// comparado com segurança contra um Date construído localmente.
export function normalizarDataDoBanco (data: Date): Date {
  return parseDataLocal(chaveDataDoBanco(data))
}

export function diferencaEmDias (a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

// Quantos dias de [inicio, fim] caem dentro do ano civil `ano` — usado para
// ratear o limite de 60 dias/ano por ano civil em vez de atribuir o
// período inteiro ao ano de início (ver FeriasService.validarRegras: um
// período de 01/12 a 30/01 do ano seguinte precisa contar ~30 dias em cada
// ano, não os 60 inteiros só no ano de início).
export function diasNoAno (inicio: Date, fim: Date, ano: number): number {
  const inicioDoAno = new Date(ano, 0, 1)
  const fimDoAno = new Date(ano, 11, 31)
  const inicioEfetivo = inicio.getTime() > inicioDoAno.getTime() ? inicio : inicioDoAno
  const fimEfetivo = fim.getTime() < fimDoAno.getTime() ? fim : fimDoAno
  if (inicioEfetivo.getTime() > fimEfetivo.getTime()) return 0
  return diferencaEmDias(fimEfetivo, inicioEfetivo) + 1
}

// Todo ano civil tocado por [inicio, fim] — normalmente só um, mas um
// período que atravessa a virada do ano toca dois.
export function anosDoPeriodo (inicio: Date, fim: Date): number[] {
  const anos: number[] = []
  for (let ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) anos.push(ano)
  return anos
}
