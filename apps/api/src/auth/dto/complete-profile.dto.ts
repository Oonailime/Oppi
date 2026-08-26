import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CompleteProfileDto {
  @IsString()
  @MinLength(3, { message: "O nome de usuário deve ter pelo menos 3 caracteres." })
  @MaxLength(30, { message: "O nome de usuário deve ter no máximo 30 caracteres." })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "Use apenas letras, números, ponto, hífen ou sublinhado no nome de usuário.",
  })
  username!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Informe uma data de nascimento válida.",
  })
  birthDate!: string;

  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf!: string;
}
