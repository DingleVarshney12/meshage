import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { MailModule } from "./mail/mail.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { FriendsModule } from "./friends/friends.module";
import { ProfileModule } from "./profile/profile.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { UpstashThrottlerStorage } from "./infrastructure/upstash-throttler.storage";

// Load the root environment file before deciding whether the database module
// should be enabled. This keeps the health endpoint usable before credentials
// are configured, while never falling back to schema synchronization.
const globalConfig = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ["../../.env", ".env"],
});

const caFile = process.env.SUPABASE_DB_CA_FILE;

if (process.env.DATABASE_URL && !caFile) {
  throw new Error(
    "Set SUPABASE_DB_CA_FILE to the Supabase CA certificate path.",
  );
}

const databaseCa = caFile
  ? readFileSync(resolve(process.cwd(), caFile), "utf8")
  : undefined;

const databaseModules = process.env.DATABASE_URL
  ? [
      TypeOrmModule.forRoot({
        type: "postgres",
        url: process.env.DATABASE_URL,
        ssl: { ca: databaseCa, rejectUnauthorized: true },
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        retryAttempts: 1,
        retryDelay: 1000,
        extra: { max: 5 },
      }),
    ]
  : [];

@Module({
  imports: [
    globalConfig,
    ...databaseModules,
    DatabaseModule,
    InfrastructureModule,
    ThrottlerModule.forRootAsync({
      imports: [InfrastructureModule],
      inject: [UpstashThrottlerStorage],
      useFactory: (storage: UpstashThrottlerStorage) => ({
        throttlers: [{ name: "default", limit: 300, ttl: 60_000 }],
        storage,
        getTracker: (request: {
          user?: { id?: string };
          ip?: string;
          socket?: { remoteAddress?: string };
        }) =>
          request.user?.id
            ? `user:${request.user.id}`
            : `ip:${request.ip ?? request.socket?.remoteAddress ?? "unknown"}`,
        setHeaders: true,
        ipv6SubnetPrefix: 64,
      }),
    }),
    HealthModule,
    AuthModule,
    MailModule,
    ConversationsModule,
    FriendsModule,
    ProfileModule,
    NotificationsModule,
  ],
})
export class AppModule {}
