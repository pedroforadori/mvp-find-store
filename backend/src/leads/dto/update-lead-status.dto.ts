import { IsIn } from 'class-validator';

import { STATUSES, Status } from '../leads.constants';

export class UpdateLeadStatusDto {
  @IsIn(STATUSES)
  status!: Status;
}
