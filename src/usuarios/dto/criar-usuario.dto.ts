import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { IsCpfValido } from '../../common/cpf-valido.decorator'
import { IsSenhaForte } from '../../common/senha-forte.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

// Cadastro de funcionário pelo admin (painel "Funcionários") — cpf/telefone/
// endereco/dataNascimento são opcionais aqui porque o admin pode completar o
// resto depois; nome/email/senha são o mínimo para a conta existir.
export class CriarUsuarioDto {
  @ApiProperty({ example: 'Maria da Silva' })
  @IsString({ message: 'Nome é obrigatório.' })
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @Transform(trim)
  nome!: string

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @Transform(trim)
  email!: string

  @ApiProperty({ example: 'SenhaForte@123', description: 'Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.' })
  @IsSenhaForte()
  senha!: string

  @ApiPropertyOptional({ example: '123.456.789-00', description: 'Formato 000.000.000-00.', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsCpfValido()
  cpf?: string | null

  @ApiPropertyOptional({ example: '(11) 91234-5678', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  telefone?: string | null

  @ApiPropertyOptional({ example: 'Rua das Flores, 123', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  endereco?: string | null

  @ApiPropertyOptional({ example: '1990-05-20', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  dataNascimento?: string | null

  @ApiPropertyOptional({ enum: ['admin', 'rh', 'gestor', 'funcionario', 'financeiro'], example: 'funcionario' })
  @IsOptional()
  @IsIn(['admin', 'rh', 'gestor', 'funcionario', 'financeiro'])
  role?: string
}
