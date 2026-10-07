import { Transform } from "class-transformer";
import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

import { ProfileVisibility } from "../../database/entities/user.entity";

export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() || null : value,
  )
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(280)
  bio?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;
}
