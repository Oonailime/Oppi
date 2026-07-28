import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class DraftAnswerDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  @IsIn(["A", "B", "C", "D", "E"])
  selectedAnswer!: string;
}

export class DraftQuestionTimeDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  timeSpentSeconds!: number;
}

export class SaveAttemptDraftDto {
  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => DraftAnswerDto)
  answers!: DraftAnswerDto[];

  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => DraftQuestionTimeDto)
  questionTimes!: DraftQuestionTimeDto[];

  @IsInt()
  @Min(0)
  @Max(4_999)
  currentIndex!: number;

  @IsInt()
  @Min(0)
  @Max(10_000_000)
  elapsedSeconds!: number;
}
