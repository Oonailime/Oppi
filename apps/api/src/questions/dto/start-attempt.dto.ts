import { AttemptMode } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  Min,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class StartAttemptDto {
  @IsString()
  examId!: string;

  @IsEnum(AttemptMode)
  mode!: AttemptMode;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ValidateIf((input: StartAttemptDto) => input.mode === AttemptMode.DISCIPLINE)
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsString()
  requestedAt?: string;
}
