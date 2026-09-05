import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class GerarEspelhoPontoDto {
  @ApiProperty({ example: 'clx...' })
  @IsString({ message: 'Funcionário é obrigatório.' })
  @IsNotEmpty({ message: 'Funcionário é obrigatório.' })
  usuarioId!: string

  // Ver comentário equivalente em GerarHoleriteDto: mês restrito a 01-12,
  // não só o formato — "2026-00" furava a trava de "mês encerrado" e o
  // @@unique([usuarioId, referencia]) por mapear pro mesmo período real de
  // "2025-12" sob outra chave.
  @ApiProperty({ example: '2026-08', description: 'Formato YYYY-MM, mês entre 01 e 12. O mês precisa já estar encerrado.' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Referência deve estar no formato YYYY-MM, com mês entre 01 e 12.' })
  referencia!: string
}
