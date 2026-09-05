import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class CriarJustificativaDto {
  @ApiProperty({ example: 'clx...' })
  @IsString({ message: 'Funcionário é obrigatório.' })
  @IsNotEmpty({ message: 'Funcionário é obrigatório.' })
  usuarioId!: string

  @ApiProperty({ example: '2026-09-10', description: 'Formato YYYY-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD.' })
  data!: string

  @ApiProperty({ enum: ['atestado', 'abono', 'folga'], example: 'atestado' })
  @IsIn(['atestado', 'abono', 'folga'])
  tipo!: 'atestado' | 'abono' | 'folga'

  @ApiPropertyOptional({ example: 'Consulta médica pela manhã.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  descricao?: string
}
