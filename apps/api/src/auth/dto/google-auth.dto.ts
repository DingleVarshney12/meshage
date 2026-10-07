import { IsString, MaxLength, MinLength } from "class-validator";

export class GoogleAuthDto {
  @IsString()
  @MinLength(100)
  @MaxLength(8192)
  idToken!: string;
}
