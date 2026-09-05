import { ConflictException, Injectable } from '@nestjs/common'
import { ehConflitoUnico } from '../common/utils/prisma-erro.util'
import { PrismaService } from '../prisma/prisma.service'
import { CadastrarAssinaturaDto } from './dto/cadastrar-assinatura.dto'

@Injectable()
export class AssinaturaEletronicaService {
  constructor (private readonly prisma: PrismaService) {}

  async buscarMinha (usuarioId: string) {
    return await this.prisma.assinaturaEletronica.findUnique({ where: { usuarioId } })
  }

  // Cadastro único de propósito: sem endpoint de edição — a mesma assinatura
  // vale pra toda folha de ponto e holerite que o funcionário assinar depois
  // (ver requisito de negócio). Quem errou o desenho recadastra recusado
  // aqui de propósito; se um dia for preciso corrigir, isso deveria passar
  // por RH/admin de forma auditável, não por um PATCH do próprio dono.
  async cadastrar (usuarioId: string, dto: CadastrarAssinaturaDto) {
    const existente = await this.prisma.assinaturaEletronica.findUnique({ where: { usuarioId } })
    if (existente) {
      throw new ConflictException('Você já tem uma assinatura eletrônica cadastrada.')
    }

    // O findUnique acima é só o caminho feliz (evita uma viagem ao banco
    // desnecessária no caso comum) — a garantia de fato vem do
    // @unique(usuarioId) do schema, então o create precisa tratar o P2002
    // de duas requisições concorrentes passando pela checagem acima ao
    // mesmo tempo; sem isso, a segunda virava um 500 genérico em vez do
    // 409 já documentado no Swagger.
    try {
      return await this.prisma.assinaturaEletronica.create({
        data: { usuarioId, imagemDataUri: dto.imagemDataUri }
      })
    } catch (erro) {
      if (ehConflitoUnico(erro)) {
        throw new ConflictException('Você já tem uma assinatura eletrônica cadastrada.')
      }
      throw erro
    }
  }
}
