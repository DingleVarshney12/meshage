import emojiRegex from "emoji-regex";
import {
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isSingleEmoji", async: false })
class IsSingleEmojiConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }

    const regex = emojiRegex();
    const matches = [...value.matchAll(regex)];

    return matches.length === 1 && matches[0]?.[0] === value;
  }

  defaultMessage(): string {
    return "emoji must contain exactly one Unicode emoji.";
  }
}

export class ToggleMessageReactionDto {
  @IsString()
  @MaxLength(32)
  @Validate(IsSingleEmojiConstraint)
  emoji!: string;
}
