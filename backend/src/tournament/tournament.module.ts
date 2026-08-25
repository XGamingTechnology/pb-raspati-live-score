import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { Match } from './entities/match.entity';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, Match])],
  providers: [TournamentService],
  controllers: [TournamentController],
})
export class TournamentModule {}
