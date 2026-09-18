import { IsIn, IsOptional } from 'class-validator';

import { CATEGORIAS, PRIORIDADES, STATUSES } from '../leads.constants';

export class ListLeadsQueryDto {
  @IsOptional()
  @IsIn(CATEGORIAS)
  categoria?: string;

  @IsOptional()
  @IsIn(PRIORIDADES)
  prioridade?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
