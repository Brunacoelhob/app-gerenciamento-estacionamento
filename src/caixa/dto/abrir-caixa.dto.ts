import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, Min } from 'class-validator'

export class AbrirCaixaDto {
  // Valor contado fisicamente por quem abre o caixa — nunca herdado
  // automaticamente do fechamento do dia anterior (ver CaixaService.abrir).
  @ApiProperty({ example: 100, description: 'Valor contado fisicamente no caixa na abertura.' })
  @IsNumber({}, { message: 'Informe o valor contado em caixa.' })
  @Min(0, { message: 'O valor em caixa não pode ser negativo.' })
  @Type(() => Number)
  valorAbertura!: number
}
