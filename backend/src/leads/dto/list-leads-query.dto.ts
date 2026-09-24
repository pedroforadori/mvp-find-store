import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { CATEGORIAS, PRIORIDADES, STATUSES } from '../leads.constants';
import { LIMITE_MAXIMO } from '../leads.service';

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

  @IsOptional()
  @IsIn(['true', 'false'])
  pendente_contato?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
