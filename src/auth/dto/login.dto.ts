import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: '123.456.789-00', description: 'CPF no formato 000.000.000-00.' })
  @IsString({ message: 'CPF é obrigatório.' })
  @IsNotEmpty({ message: 'CPF é obrigatório.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  cpf!: string

  @ApiProperty({ example: 'SenhaForte@123' })
  @IsString({ message: 'Senha é obrigatória.' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  senha!: string
}
