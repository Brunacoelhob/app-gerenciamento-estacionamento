import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

const minusculo = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value

// Reflete o enum StatusVaga/TipoVaga do schema.prisma.
export class CriarVagaDto {
  @ApiProperty({ example: 'A01' })
  @IsString({ message: 'Código da vaga é obrigatório.' })
  @IsNotEmpty({ message: 'Código da vaga é obrigatório.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  codigo!: string

  @ApiPropertyOptional({ enum: ['comum', 'coberta', 'mensalista'], example: 'comum' })
  @IsOptional()
  @Transform(minusculo)
  @IsIn(['comum', 'coberta', 'mensalista'], { message: 'Tipo de vaga inválido.' })
  tipo?: string

  @ApiPropertyOptional({ enum: ['livre', 'ocupada', 'manutencao'], example: 'livre' })
  @IsOptional()
  @Transform(minusculo)
  @IsIn(['livre', 'ocupada', 'manutencao'], { message: 'Status de vaga inválido.' })
  status?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  acessivel?: boolean
}
