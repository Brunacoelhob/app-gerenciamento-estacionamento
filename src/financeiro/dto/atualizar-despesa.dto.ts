import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator'

// Mesmo regex/limite já usado em AtualizarMensalidadeDto — SVG de fora de
// propósito (pode carregar <script> embutido e o anexo é reaberto cru numa
// nova aba, sem sanitização) e âncora no fim ($) essencial, senão bastava a
// string COMEÇAR com o prefixo esperado pra passar.
const REGEX_ANEXO_COMPROVANTE = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/

export class AtualizarDespesaDto {
  @ApiPropertyOptional({ example: 'Aluguel' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(100)
  categoria?: string

  @ApiPropertyOptional({ example: 'Aluguel do estacionamento — setembro/2026' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(255)
  descricao?: string

  @ApiPropertyOptional({ example: 3500 })
  @IsOptional()
  @IsNumber({}, { message: 'Valor inválido.' })
  @IsPositive({ message: 'O valor da despesa deve ser maior que zero.' })
  @Type(() => Number)
  valor?: number

  @ApiPropertyOptional({ example: '2026-09-10' })
  @IsOptional()
  @IsDateString({}, { message: 'Data de vencimento inválida.' })
  dataVencimento?: string

  @ApiPropertyOptional({ enum: ['pendente', 'paga'], example: 'paga', description: 'Uma despesa já paga não pode mais ser editada.' })
  @IsOptional()
  @IsIn(['pendente', 'paga'], { message: 'Status inválido. Use pendente ou paga.' })
  status?: string

  @ApiPropertyOptional({ enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia'] })
  @IsOptional()
  @IsIn(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia'])
  formaPagamento?: string

  @ApiPropertyOptional({ description: 'Data URI base64 de imagem (PNG/JPEG/WEBP) ou PDF.', example: 'data:application/pdf;base64,JVBERi0xLjQK...' })
  @IsOptional()
  @IsString()
  @Matches(REGEX_ANEXO_COMPROVANTE, { message: 'Anexo deve ser uma imagem (PNG/JPEG/WEBP) ou PDF.' })
  @MaxLength(6_000_000, { message: 'Arquivo do comprovante é grande demais.' })
  comprovanteAnexo?: string

  @ApiPropertyOptional({ example: 'boleto-aluguel.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  comprovanteNomeArquivo?: string

  @ApiPropertyOptional({ example: 'Pago com atraso de 2 dias.' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(2000)
  observacoes?: string
}
