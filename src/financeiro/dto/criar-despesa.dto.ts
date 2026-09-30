import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'

export class CriarDespesaDto {
  @ApiProperty({ example: 'Aluguel' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Informe a categoria da despesa.' })
  @IsNotEmpty({ message: 'Informe a categoria da despesa.' })
  @MaxLength(100)
  categoria!: string

  @ApiProperty({ example: 'Aluguel do estacionamento — setembro/2026' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Informe a descrição da despesa.' })
  @IsNotEmpty({ message: 'Informe a descrição da despesa.' })
  @MaxLength(255)
  descricao!: string

  @ApiProperty({ example: 3500 })
  @IsNumber({}, { message: 'Informe o valor da despesa.' })
  @IsPositive({ message: 'O valor da despesa deve ser maior que zero.' })
  @Type(() => Number)
  valor!: number

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString({}, { message: 'Informe a data de vencimento.' })
  dataVencimento!: string

  @ApiPropertyOptional({ example: 'Pago via boleto bancário.' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(2000)
  observacoes?: string
}
