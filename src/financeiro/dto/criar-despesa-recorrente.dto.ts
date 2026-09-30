import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator'

export class CriarDespesaRecorrenteDto {
  @ApiProperty({ example: 'Internet' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Informe a categoria da despesa.' })
  @IsNotEmpty({ message: 'Informe a categoria da despesa.' })
  @MaxLength(100)
  categoria!: string

  @ApiProperty({ example: 'Plano de internet fibra 500mb' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Informe a descrição da despesa.' })
  @IsNotEmpty({ message: 'Informe a descrição da despesa.' })
  @MaxLength(255)
  descricao!: string

  @ApiProperty({ example: 150 })
  @IsNumber({}, { message: 'Informe o valor da despesa.' })
  @IsPositive({ message: 'O valor da despesa deve ser maior que zero.' })
  @Type(() => Number)
  valor!: number

  // 1-28: evita ambiguidade em meses curtos (fevereiro) — dia acima disso é
  // sempre encurtado (clamp) pro último dia do mês em
  // DespesasRecorrentesService.
  @ApiProperty({ example: 10, minimum: 1, maximum: 28, description: 'Dia do mês em que a despesa vence (1–28).' })
  @IsInt({ message: 'Dia de vencimento inválido.' })
  @Min(1, { message: 'Dia de vencimento deve ser entre 1 e 28.' })
  @Max(28, { message: 'Dia de vencimento deve ser entre 1 e 28.' })
  @Type(() => Number)
  diaVencimento!: number
}
