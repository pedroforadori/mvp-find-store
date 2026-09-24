import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService, LIMITE_PADRAO } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  listar(@Query() query: ListLeadsQueryDto) {
    const { pendente_contato, limit = LIMITE_PADRAO, offset = 0, ...filtros } = query;
    return this.leadsService.listar(pendente_contato === 'true' ? { ...filtros, pendente_contato: true } : filtros, {
      limit,
      offset,
    });
  }

  @Patch(':id/status')
  atualizarStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.atualizarStatus(id, dto.status);
  }

  @Post(':id/contato-manual')
  @HttpCode(200)
  registrarContatoManual(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.registrarContatoManual(id);
  }
}
