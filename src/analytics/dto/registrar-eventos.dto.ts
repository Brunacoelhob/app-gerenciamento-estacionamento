import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator'

export class EventoDto {
  @ApiProperty({ enum: ['visualizacao', 'tempo-na-tela'], example: 'visualizacao' })
  @IsIn(['visualizacao', 'tempo-na-tela'])
  tipo!: string

  @ApiProperty({ example: 'dashboard' })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(1)
  @MaxLength(200)
  tela!: string

  @ApiPropertyOptional({ example: 4200, description: 'Duração em milissegundos (evento tempo-na-tela).', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  duracaoMs?: number | null

  @ApiProperty({ example: 1767513600000, description: 'Timestamp epoch em milissegundos.' })
  @IsNumber()
  quando!: number
}

export class RegistrarEventosDto {
  @ApiProperty({ type: [EventoDto], description: 'De 1 a 50 eventos por requisição.' })
  @ValidateNested({ each: true })
  @Type(() => EventoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  eventos!: EventoDto[]
}
