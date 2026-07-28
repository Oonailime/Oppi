import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateContestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  targetDate?: string;

  @IsOptional()
  @Transform(({ value }: { value: string | string[] | undefined }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  examIds?: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  desiredArea!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description!: string;
}
