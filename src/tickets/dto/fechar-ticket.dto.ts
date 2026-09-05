import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsOptional } from 'class-validator'

export class FecharTicketDto {
  // Mesmo motivo do AbrirTicketDto: ApiService.fecharTicket manda
  // `formaPagamento: null` por padrão quando a tela não escolhe uma forma
  // de pagamento específica.
  //
  // Restrito a um enum fechado (sem "isento", que só o servidor pode
  // atribuir para ciclo de mensalista vigente — ver TicketsService.fechar):
  // CaixaService.calcularRecebidoEmDinheiro soma o valor esperado do caixa
  // filtrando por `formaPagamento: 'dinheiro'`, então antes desta trava
  // bastava o cliente mandar qualquer string (ex.: "pix") para um pagamento
  // recebido em espécie desaparecer da conferência de caixa sem gerar
  // diferença nenhuma.
  @ApiPropertyOptional({ enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'], example: 'pix', nullable: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsIn(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'], { message: 'Forma de pagamento inválida.' })
  formaPagamento?: string | null
}
