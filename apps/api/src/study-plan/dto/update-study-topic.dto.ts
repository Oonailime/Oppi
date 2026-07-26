import { StudyStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStudyTopicDto {
  @IsOptional()
  @IsEnum(StudyStatus)
  status?: StudyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
