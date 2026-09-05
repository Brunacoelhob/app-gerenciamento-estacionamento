import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class FecharCaixaDto {
  // Valor contado fisicamente ao fechar — comparado no backend contra
  // valorEsperadoFechamento para apurar sobra/falta (ver CaixaService.fechar).
  @ApiProperty({ example: 480, description: 'Valor contado fisicamente no caixa no fechamento.' })
  @IsNumber({}, { message: 'Informe o valor contado em caixa.' })
  @Min(0, { message: 'O valor em caixa não pode ser negativo.' })
  @Type(() => Number)
  valorFechamento!: number

  @ApiPropertyOptional({ example: 'Falta de R$5 referente a troco.' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  observacoes?: string
}
