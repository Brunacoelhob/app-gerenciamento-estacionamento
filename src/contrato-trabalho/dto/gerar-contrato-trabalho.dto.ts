import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class GerarContratoTrabalhoDto {
  @ApiProperty({ example: 'clx...' })
  @IsString({ message: 'Funcionário é obrigatório.' })
  @IsNotEmpty({ message: 'Funcionário é obrigatório.' })
  usuarioId!: string
}
