import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { IsCpfValido } from '../../common/cpf-valido.decorator'
import { IsPlacaValida } from '../../common/placa-valida.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class CriarMensalistaDto {
  @ApiProperty({ example: 'João Pereira' })
  @IsString({ message: 'Nome é obrigatório.' })
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @Transform(trim)
  nome!: string

  // IsCpfValido precisa vir ANTES de IsString/IsNotEmpty no empilhamento: com
  // experimentalDecorators, decorators aplicam de baixo pra cima, então o
  // último a ser escrito é o primeiro a validar — e a ValidationPipe só
  // devolve a mensagem do primeiro que falhar (ver validation-exception-
  // factory.ts). Nessa ordem, CPF vazio cai em IsNotEmpty ("obrigatório"),
  // não no formato — só cai no formato quando o CPF já foi preenchido, mas
  // errado.
  @ApiProperty({ example: '123.456.789-00', description: 'Formato 000.000.000-00.' })
  @IsCpfValido()
  @IsString({ message: 'CPF é obrigatório.' })
  @IsNotEmpty({ message: 'CPF é obrigatório.' })
  @Transform(trim)
  cpf!: string

  // Mesmo motivo do CPF acima.
  @ApiProperty({ example: 'ABC1D23', description: 'Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23).' })
  @IsPlacaValida()
  @IsString({ message: 'Placa é obrigatória.' })
  @IsNotEmpty({ message: 'Placa é obrigatória.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  placa!: string

  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString({ message: 'O telefone é obrigatório e não pode ser removido.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório e não pode ser removido.' })
  @Transform(trim)
  telefone!: string

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMensalidade?: number

  @ApiPropertyOptional({ example: 'joao@example.com' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' && value.trim() === '' ? undefined : value)
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string

  @ApiPropertyOptional({ example: 'Plano Mensal Básico' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Categoria do plano não pode ficar vazia.' })
  categoriaPlano?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? value : Boolean(value))
  @IsBoolean()
  ativo?: boolean
}
