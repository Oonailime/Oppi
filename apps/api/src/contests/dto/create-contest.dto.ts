import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateContestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  targetDate?: string;
}
