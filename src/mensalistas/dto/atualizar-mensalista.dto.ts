import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { IsCpfValido } from '../../common/cpf-valido.decorator'
import { IsPlacaValida } from '../../common/placa-valida.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

// Presente e vazio = erro (telefone e categoriaPlano não podem ser
// removidos); ausente = não mexe no campo.
export class AtualizarMensalistaDto {
  @ApiPropertyOptional({ example: 'João Pereira' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Nome é obrigatório.' })
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  nome?: string

  // IsCpfValido/IsPlacaValida vêm antes de IsString/IsNotEmpty no
  // empilhamento (ver o mesmo comentário em criar-mensalista.dto.ts) — só
  // assim "obrigatório" vence quando o campo vem vazio, em vez do erro de
  // formato.
  @ApiPropertyOptional({ example: '123.456.789-00', description: 'Formato 000.000.000-00. Só é alterado por admin.' })
  @IsOptional()
  @Transform(trim)
  @IsCpfValido()
  @IsString({ message: 'CPF é obrigatório.' })
  @IsNotEmpty({ message: 'CPF é obrigatório.' })
  cpf?: string

  @ApiPropertyOptional({ example: 'ABC1D23', description: 'Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23).' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsPlacaValida()
  @IsString({ message: 'Placa é obrigatória.' })
  @IsNotEmpty({ message: 'Placa é obrigatória.' })
  placa?: string

  @ApiPropertyOptional({ example: '(11) 91234-5678' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'O telefone é obrigatório e não pode ser removido.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório e não pode ser removido.' })
  telefone?: string

  @ApiPropertyOptional({ example: 250, description: 'Só é alterado por admin.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMensalidade?: number

  // Diferente de telefone/categoriaPlano: e-mail é opcional no cadastro, e
  // string vazia aqui vira `null` de propósito — é o jeito de "apagar" um
  // e-mail já cadastrado (undefined continua significando "não mexe").
  @ApiPropertyOptional({ example: 'joao@example.com', description: 'String vazia remove o e-mail cadastrado.', nullable: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' && value.trim() === '' ? null : value)
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string | null

  @ApiPropertyOptional({ example: 'Plano Mensal Básico' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Categoria do plano não pode ficar vazia.' })
  @IsNotEmpty({ message: 'Categoria do plano não pode ficar vazia.' })
  categoriaPlano?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? value : Boolean(value))
  @IsBoolean()
  ativo?: boolean
}
