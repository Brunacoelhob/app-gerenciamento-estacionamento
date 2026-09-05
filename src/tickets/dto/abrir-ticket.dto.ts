import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'
import { IsPlacaValida } from '../../common/placa-valida.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class AbrirTicketDto {
  // IsPlacaValida antes de IsString/IsNotEmpty no empilhamento — ver o
  // comentário em criar-mensalista.dto.ts (senão placa vazia mostra o erro
  // de formato em vez de "obrigatória").
  @ApiProperty({ example: 'ABC1D23', description: 'Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23).' })
  @IsPlacaValida()
  @IsString({ message: 'Placa é obrigatória.' })
  @IsNotEmpty({ message: 'Placa é obrigatória.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  placa!: string

  @ApiProperty({ example: 'clx...', description: 'Id da vaga (precisa estar livre).' })
  @IsString({ message: 'Vaga é obrigatória.' })
  @IsNotEmpty({ message: 'Vaga é obrigatória.' })
  @Transform(trim)
  vagaId!: string

  // O front sempre manda estes dois campos, com `null` explícito quando não
  // há tarifa/mensalista selecionado (ver ApiService.criarTicket) — por
  // isso são nullable, não só optional: todo ticket avulso (o caso mais
  // comum) manda tarifaId/mensalistaId: null.
  @ApiPropertyOptional({ example: null, description: 'Id da tarifa aplicada (null para ticket avulso sem tarifa fixa).', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  tarifaId?: string | null

  @ApiPropertyOptional({ example: null, description: 'Id do mensalista (null para ticket avulso).', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  mensalistaId?: string | null
}
