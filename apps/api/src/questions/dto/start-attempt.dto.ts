import { AttemptMode, ForeignLanguage } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class StartAttemptDto {
  @ValidateIf((input: StartAttemptDto) => input.mode !== AttemptMode.ALL_YEARS)
  @IsString()
  examId?: string;

  @IsEnum(AttemptMode)
  mode!: AttemptMode;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  examDay?: number;

  @ValidateIf(
    (input: StartAttemptDto) =>
      input.mode === AttemptMode.DISCIPLINE ||
      input.mode === AttemptMode.ALL_YEARS,
  )
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsEnum(ForeignLanguage)
  foreignLanguage?: ForeignLanguage;

  @IsOptional()
  @IsString()
  requestedAt?: string;
}
