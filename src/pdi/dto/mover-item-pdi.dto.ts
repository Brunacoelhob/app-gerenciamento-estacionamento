import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'

export class MoverItemPdiDto {
  @ApiProperty({ enum: ['cima', 'baixo'], example: 'cima' })
  @IsIn(['cima', 'baixo'])
  direcao!: 'cima' | 'baixo'
}
