import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { IsAvatarValido } from '../../common/avatar-valido.decorator'
import { IsCpfValido } from '../../common/cpf-valido.decorator'
import { IsSenhaForte } from '../../common/senha-forte.decorator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

// Usado tanto pelo modal "Meu Perfil" (dono da conta) quanto pelo admin —
// todo campo é opcional porque cada chamada manda só o que está mudando
// (ver UsuariosService.atualizarPerfil, que só grava o que veio definido no
// corpo).
export class AtualizarUsuarioDto {
  @ApiPropertyOptional({ example: 'Maria da Silva' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Nome é obrigatório.' })
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  nome?: string

  @ApiPropertyOptional({ example: '123.456.789-00', description: 'Formato 000.000.000-00.', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'CPF é obrigatório.' })
  @IsCpfValido()
  cpf?: string | null

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string

  @ApiPropertyOptional({ example: '(11) 91234-5678', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Telefone é obrigatório.' })
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

  // Avatar só pode ser: vazio/nulo (remover), uma FOTO embutida como data URI
  // rasterizada (png/jpeg/gif/webp — é assim que redimensionarImagemParaAvatar
  // em assets/js/modules/auth.js gera o upload), ou exatamente um dos 12
  // avatares prontos da galeria (svg+xml, mas só os gerados pelo próprio
  // template fixo de GALERIA_AVATARES/gerarAvatarSvg — nunca SVG arbitrário).
  // Sem essa checagem, o campo aceitava QUALQUER string e era renderizado
  // sem escape em `<img src="${avatar}">` — um valor como
  // `x" onerror="fetch(atacante)"` escaparia do atributo src, e (antes de
  // restringir a galeria a um conjunto fechado) um svg+xml arbitrário com
  // `onload` embutido também passava pela validação de formato antiga,
  // dependendo só do navegador sandboxar script de SVG carregado via <img>
  // pra não executar. Ver src/common/avatar-valido.decorator.ts.
  @ApiPropertyOptional({ description: 'Vazio/nulo para remover, data URI de foto (png/jpeg/gif/webp), ou um dos avatares prontos da galeria.', example: 'data:image/png;base64,iVBORw0KG...', nullable: true })
  @IsOptional()
  @IsAvatarValido()
  avatar?: string | null

  @ApiPropertyOptional({ example: 'NovaSenhaForte@123', description: 'Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.' })
  @IsOptional()
  @IsSenhaForte()
  senha?: string

  @ApiPropertyOptional({ description: 'Obrigatória junto de `senha` quando o próprio usuário troca a senha.', example: 'SenhaAtual@123' })
  @IsOptional()
  @IsString()
  senhaAtual?: string

  @ApiPropertyOptional({ enum: ['admin', 'rh', 'gestor', 'funcionario', 'financeiro'], description: 'Só é aplicado se o solicitante for admin.', example: 'funcionario' })
  @IsOptional()
  @IsIn(['admin', 'rh', 'gestor', 'funcionario', 'financeiro'])
  role?: string

  @ApiPropertyOptional({ description: 'Só é aplicado se o solicitante for admin.', example: true })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? value : Boolean(value))
  @IsBoolean()
  ativo?: boolean
}
