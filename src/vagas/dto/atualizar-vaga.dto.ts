import { PartialType } from '@nestjs/swagger'
import { CriarVagaDto } from './criar-vaga.dto'

export class AtualizarVagaDto extends PartialType(CriarVagaDto) {}
