import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator'
import { IsDiasEscalaValidos } from '../../common/dias-escala-validos.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

// Um único DTO "definir" (não Criar/Atualizar separados): PATCH /rh-perfil/:id
// faz upsert — RH sempre reenvia o perfil completo, seja cadastrando pela
// primeira vez ou editando depois. Evita a ambiguidade de um PATCH parcial
// num upsert (o que fazer com campos obrigatórios ausentes na criação?).
export class DefinirPerfilRhDto {
  @ApiProperty({ example: 'Analista de Operações' })
  @IsString({ message: 'Cargo é obrigatório.' })
  @IsNotEmpty({ message: 'Cargo é obrigatório.' })
  @Transform(trim)
  cargo!: string

  @ApiProperty({ example: 2500 })
  @IsNumber({}, { message: 'Salário-base é obrigatório.' })
  @Min(0, { message: 'Salário-base não pode ser negativo.' })
  salarioBase!: number

  @ApiPropertyOptional({ enum: ['clt', 'pj'], example: 'clt' })
  @IsOptional()
  @IsIn(['clt', 'pj'])
  tipoContrato?: string

  @ApiProperty({ example: '2024-03-01' })
  @IsString({ message: 'Data de admissão é obrigatória.' })
  @IsNotEmpty({ message: 'Data de admissão é obrigatória.' })
  dataAdmissao!: string

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @IsString()
  dataDemissao?: string | null

  @ApiProperty({ type: [Number], example: [1, 2, 3, 4], description: 'Exatamente 4 dias únicos, de 0 (domingo) a 6 (sábado).' })
  @IsDiasEscalaValidos()
  diasEscala!: number[]

  @ApiPropertyOptional({ example: 8, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Horas por dia deve ser pelo menos 1.' })
  @Max(12, { message: 'Horas por dia não pode passar de 12.' })
  horasPorDia?: number

  // Horário previsto de entrada nos dias de escala — usado pelo cálculo de
  // ponto pra apurar atraso (tolerância de 20min) e hora extra.
  @ApiPropertyOptional({ example: '08:00', description: 'Formato HH:mm.' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário de início deve estar no formato HH:mm.' })
  horaInicioEscala?: string

  @ApiProperty({ example: 'Banco do Brasil' })
  @IsString({ message: 'Banco é obrigatório.' })
  @IsNotEmpty({ message: 'Banco é obrigatório.' })
  @Transform(trim)
  bancoNome!: string

  @ApiProperty({ example: '1234-5' })
  @IsString({ message: 'Agência é obrigatória.' })
  @IsNotEmpty({ message: 'Agência é obrigatória.' })
  @Transform(trim)
  agencia!: string

  @ApiProperty({ example: '12345-6' })
  @IsString({ message: 'Conta bancária é obrigatória.' })
  @IsNotEmpty({ message: 'Conta bancária é obrigatória.' })
  @Transform(trim)
  contaBancaria!: string

  // Opcionais: perfis existentes não tinham esses campos antes de existirem
  // — RH preenche quando quiser, sem forçar re-cadastro imediato de todo
  // mundo. Texto livre, um item por linha (o front separa em lista).
  @ApiPropertyOptional({ example: 'Vale-refeição\nPlano de saúde', description: 'Texto livre, um item por linha.' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  direitos?: string

  @ApiPropertyOptional({ example: 'Pontualidade\nSigilo de dados' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  deveres?: string

  @ApiPropertyOptional({ example: 'Atendimento ao cliente\nControle de caixa' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  tarefas?: string

  // Únicos itens de benefício que variam por funcionário — o resto da lista
  // de benefícios é política fixa da empresa, igual para todos (ver
  // contrato-trabalho.pdf.ts/BENEFICIOS), não é dado de perfil.
  @ApiPropertyOptional({ enum: ['vale_transporte', 'vale_combustivel', 'nenhum'], example: 'vale_transporte' })
  @IsOptional()
  @IsIn(['vale_transporte', 'vale_combustivel', 'nenhum'])
  tipoValeTransporte?: string

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber({}, { message: 'Bônus por desempenho deve ser numérico.' })
  @Min(0, { message: 'Bônus por desempenho não pode ser negativo.' })
  bonusDesempenho?: number

  @ApiPropertyOptional({ example: 'Bônus pago junto com o holerite do mês seguinte.' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  observacoesBeneficios?: string

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @IsString()
  etapaCarreiraAtualId?: string | null

  // Vaga/processo seletivo que originou a contratação — texto livre, mesma
  // lógica de direitos/deveres/tarefas.
  @ApiPropertyOptional({ example: 'Analista de Operações Jr.' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  vagaOrigem?: string

  // A quem o funcionário responde diretamente. null explícito remove o
  // vínculo (RH reenvia o perfil inteiro no PATCH — ver comentário da classe).
  @ApiPropertyOptional({ example: null, description: 'Id do usuário gestor. null remove o vínculo.', nullable: true })
  @IsOptional()
  @IsString()
  gestorId?: string | null
}
