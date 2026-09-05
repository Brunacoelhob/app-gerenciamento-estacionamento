import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

export class SolicitarFeriasDto {
  @ApiProperty({ example: '2026-12-01', description: 'Formato YYYY-MM-DD. Precisa de ao menos 90 dias de antecedência.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de início deve estar no formato YYYY-MM-DD.' })
  dataInicio!: string

  @ApiProperty({ example: '2026-12-15', description: 'Formato YYYY-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de fim deve estar no formato YYYY-MM-DD.' })
  dataFim!: string
}
