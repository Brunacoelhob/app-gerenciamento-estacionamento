import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class SolicitarTrabalhoExtraDto {
  @ApiProperty({ example: '2026-09-13', description: 'Formato YYYY-MM-DD. Precisa ser um dia fora da escala do funcionário e não pode ser no passado.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD.' })
  data!: string

  @ApiProperty({ example: 'Cobertura de plantão de fim de semana.' })
  @IsString({ message: 'Motivo é obrigatório.' })
  @IsNotEmpty({ message: 'Motivo é obrigatório.' })
  @Transform(trim)
  motivo!: string
}
