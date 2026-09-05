import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class GerarHoleriteDto {
  @ApiProperty({ example: 'clx...' })
  @IsString({ message: 'Funcionário é obrigatório.' })
  @IsNotEmpty({ message: 'Funcionário é obrigatório.' })
  usuarioId!: string

  // Mês restrito a 01-12 (não só o formato) — "2026-00" ou "2026-13"
  // passavam pelo regex antigo e, na aritmética de data seguinte
  // (`new Date(ano, mes, 1)`), "00" virava dezembro do ano anterior: a
  // trava de "mês encerrado" e o `@@unique([usuarioId, referencia])`
  // deixavam de barrar a duplicata, porque as duas referências mapeavam
  // pro mesmo período real sob chaves diferentes.
  @ApiProperty({ example: '2026-08', description: 'Formato YYYY-MM, mês entre 01 e 12. O mês precisa já estar encerrado.' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Referência deve estar no formato YYYY-MM, com mês entre 01 e 12.' })
  referencia!: string
}
