import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRecordingSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  participantA: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  participantB: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}