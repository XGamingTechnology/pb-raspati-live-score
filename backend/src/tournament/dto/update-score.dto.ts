import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateScoreDto {
  @IsInt()
  @Min(0)
  @Max(45)
  scoreA: number;

  @IsInt()
  @Min(0)
  @Max(45)
  scoreB: number;

  @IsOptional()
  @IsString()
  note?: string;
}
