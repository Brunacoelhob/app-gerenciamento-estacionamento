import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

// Um único DTO "definir", reusado por POST (criar) e PATCH (editar) — mesmo
// padrão de DefinirPerfilRhDto: RH sempre reenvia a etapa inteira.
export class DefinirEtapaCarreiraDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt({ message: 'Ordem deve ser um número inteiro.' })
  @Min(1, { message: 'Ordem deve ser pelo menos 1.' })
  ordem!: number

  @ApiProperty({ example: 'Analista Jr.' })
  @IsString({ message: 'Título é obrigatório.' })
  @IsNotEmpty({ message: 'Título é obrigatório.' })
  @Transform(trim)
  titulo!: string

  @ApiPropertyOptional({ example: 'R$ 2.000 - R$ 2.800' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  faixaSalarial?: string

  @ApiProperty({ example: 'Primeira etapa da trilha de carreira de Analista.' })
  @IsString({ message: 'Descrição é obrigatória.' })
  @IsNotEmpty({ message: 'Descrição é obrigatória.' })
  @Transform(trim)
  descricao!: string
}
