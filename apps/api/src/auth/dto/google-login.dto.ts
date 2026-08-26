import { IsString, MaxLength, MinLength } from "class-validator";

export class GoogleLoginDto {
  @IsString()
  @MinLength(100)
  @MaxLength(10_000)
  credential!: string;
}
