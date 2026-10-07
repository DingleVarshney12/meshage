import { IsEnum } from "class-validator";

export enum FriendRequestDecision {
  ACCEPT = "accept",
  REJECT = "reject",
}

export class RespondFriendRequestDto {
  @IsEnum(FriendRequestDecision)
  decision!: FriendRequestDecision;
}
