import { Module } from '@nestjs/common'
import { AuditoriaModule } from '../auditoria/auditoria.module'
import { DespesasRecorrentesController } from './despesas-recorrentes.controller'
import { DespesasRecorrentesService } from './despesas-recorrentes.service'
import { DespesasController } from './despesas.controller'
import { DespesasService } from './despesas.service'
import { FinanceiroController } from './financeiro.controller'
import { FinanceiroService } from './financeiro.service'

@Module({
  imports: [AuditoriaModule],
  controllers: [DespesasRecorrentesController, DespesasController, FinanceiroController],
  providers: [DespesasRecorrentesService, DespesasService, FinanceiroService]
})
export class FinanceiroModule {}
