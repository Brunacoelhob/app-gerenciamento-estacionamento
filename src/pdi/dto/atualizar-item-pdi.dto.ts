import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class AtualizarItemPdiDto {
  @ApiPropertyOptional({ example: 'Concluir curso de Excel avançado' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Título não pode ficar vazio.' })
  @Transform(trim)
  titulo?: string

  @ApiPropertyOptional({ example: 'Curso online, carga horária de 20h.' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  descricao?: string
}
