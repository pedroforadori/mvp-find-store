import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';

import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  listar(@Query() filtros: ListLeadsQueryDto) {
    return this.leadsService.listar(filtros);
  }

  @Patch(':id/status')
  atualizarStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.atualizarStatus(id, dto.status);
  }
}
