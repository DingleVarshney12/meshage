import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import { RespondFriendRequestDto } from "./dto/respond-friend-request.dto";
import { SearchUsersDto } from "./dto/search-users.dto";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { FriendsService } from "./friends.service";
import { RateLimit } from "../common/decorators/rate-limit.decorator";

@Controller("friends")
@UseGuards(AccessTokenGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get("search")
  @RateLimit(30, 60 * 1000)
  searchUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: SearchUsersDto,
  ) {
    return this.friendsService.searchUsers(user.id, dto);
  }

  @Post("requests")
  @RateLimit(10, 60 * 60 * 1000)
  sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto);
  }

  @Get("requests/incoming")
  listIncomingRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listIncomingRequests(user.id);
  }

  @Get("requests/outgoing")
  listOutgoingRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listOutgoingRequests(user.id);
  }

  @Patch("requests/:requestId")
  @RateLimit(30, 60 * 1000)
  respondToRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToRequest(user.id, requestId, dto);
  }

  @Delete("requests/:requestId")
  @RateLimit(30, 60 * 1000)
  cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
  ) {
    return this.friendsService.cancelRequest(user.id, requestId);
  }

  @Get()
  listFriends(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listFriends(user.id);
  }

  @Delete(":friendUserId")
  @RateLimit(10, 60 * 1000)
  removeFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param("friendUserId", ParseUUIDPipe) friendUserId: string,
  ) {
    return this.friendsService.removeFriend(user.id, friendUserId);
  }
}
