import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'

export class DecidirFeriasDto {
  @ApiProperty({ enum: ['aprovada', 'rejeitada'], example: 'aprovada' })
  @IsIn(['aprovada', 'rejeitada'])
  status!: 'aprovada' | 'rejeitada'
}
