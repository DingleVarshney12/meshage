import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";

export class PushSubscriptionDto {
  @IsUrl({ require_tld: false })
  @MaxLength(4096)
  endpoint!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(256)
  p256dh!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(256)
  auth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ require_tld: false })
  @MaxLength(4096)
  endpoint!: string;
}
