import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { Equals, IsEmail, IsNotEmpty, IsString } from 'class-validator'
import { IsCpfValido } from '../../common/cpf-valido.decorator'
import { IsSenhaForte } from '../../common/senha-forte.decorator'

export class RegistrarDto {
  @ApiProperty({ example: 'Maria da Silva' })
  @IsString({ message: 'Nome é obrigatório.' })
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  nome!: string

  // IsCpfValido antes de IsString/IsNotEmpty no empilhamento — ver o
  // comentário em criar-mensalista.dto.ts (senão CPF vazio mostra o erro de
  // formato em vez de "obrigatório").
  @ApiProperty({ example: '123.456.789-00', description: 'CPF no formato 000.000.000-00.' })
  @IsCpfValido()
  @IsString({ message: 'CPF é obrigatório.' })
  @IsNotEmpty({ message: 'CPF é obrigatório.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  cpf!: string

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  email!: string

  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString({ message: 'Telefone é obrigatório.' })
  @IsNotEmpty({ message: 'Telefone é obrigatório.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  telefone!: string

  @ApiProperty({ example: 'SenhaForte@123', description: 'Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.' })
  @IsSenhaForte()
  senha!: string

  @ApiProperty({ example: true, description: 'Precisa ser exatamente true — aceite obrigatório dos Termos de Uso.' })
  @Equals(true, { message: 'É necessário aceitar os Termos de Uso para se cadastrar.' })
  aceitouTermos!: boolean
}
