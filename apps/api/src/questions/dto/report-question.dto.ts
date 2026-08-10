import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from "class-validator";

export const questionIssueTypes = [
  "IMAGE",
  "CATEGORY",
  "ANSWER_KEY",
  "INCOMPLETE",
  "DUPLICATE",
  "NUMBERING",
  "OTHER",
] as const;

export class ReportQuestionDto {
  @IsIn(questionIssueTypes)
  issueType!: (typeof questionIssueTypes)[number];

  @IsString()
  @Length(5, 1500)
  description!: string;

  @IsOptional()
  @IsIn(["A", "B", "C", "D", "E"])
  selectedAnswer?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  screenUrl?: string;
}
