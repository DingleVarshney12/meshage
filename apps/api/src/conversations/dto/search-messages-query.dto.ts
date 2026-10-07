import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SearchMessagesQueryDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;
}
