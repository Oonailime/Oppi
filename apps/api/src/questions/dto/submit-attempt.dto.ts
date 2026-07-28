import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class SubmittedAnswerDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  @IsOptional()
  @IsIn(["A", "B", "C", "D", "E"])
  selectedAnswer?: string;

  @IsInt()
  @Min(0)
  @Max(86400)
  timeSpentSeconds!: number;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  durationSeconds!: number;
}
