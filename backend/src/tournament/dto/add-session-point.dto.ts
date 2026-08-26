import { IsIn } from 'class-validator';

export class AddSessionPointDto {
  @IsIn(['A', 'B'])
  side: 'A' | 'B';
}
