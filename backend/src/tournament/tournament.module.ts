import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { Match } from './entities/match.entity';
import { KnockoutMatch } from './entities/knockout-match.entity';
import { RecordingSession } from './entities/recording-session.entity';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, Match, KnockoutMatch, RecordingSession])],
  providers: [TournamentService],
  controllers: [TournamentController],
})
export class TournamentModule {}
