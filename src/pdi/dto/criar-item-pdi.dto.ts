import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class CriarItemPdiDto {
  @ApiProperty({ example: 'Concluir curso de Excel avançado' })
  @IsString({ message: 'Título é obrigatório.' })
  @IsNotEmpty({ message: 'Título é obrigatório.' })
  @Transform(trim)
  titulo!: string

  @ApiPropertyOptional({ example: 'Curso online, carga horária de 20h.' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  descricao?: string
}
