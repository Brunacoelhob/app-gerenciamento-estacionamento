import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'
import { IsSenhaForte } from '../../common/senha-forte.decorator'

export class ConfirmarResetDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  email!: string

  @ApiProperty({ example: '123456', description: 'Código de confirmação recebido por e-mail.' })
  @IsString({ message: 'Informe o código recebido por e-mail.' })
  @IsNotEmpty({ message: 'Informe o código recebido por e-mail.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  codigo!: string

  @ApiProperty({ example: 'SenhaForte@123', description: 'Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.' })
  @IsSenhaForte()
  novaSenha!: string
}
