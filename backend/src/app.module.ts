import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentModule } from './tournament/tournament.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST', 'db'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'raspati'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB', 'raspati_tournament'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    TournamentModule,
  ],
})
export class AppModule {}
