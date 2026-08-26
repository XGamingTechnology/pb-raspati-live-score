import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TournamentService } from './tournament.service';
import { UpdateScoreDto } from './dto/update-score.dto';
import { CreateRecordingSessionDto } from './dto/create-recording-session.dto';

@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly service: TournamentService,
    private readonly config: ConfigService,
  ) {}

  private assertAdmin(pin?: string) {
    const expected = String(this.config.get('ADMIN_PIN', '2026'));
    if (!pin || pin !== expected) throw new UnauthorizedException('PIN panitia tidak valid');
  }

  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  @Patch('matches/:id')
  updateScore(@Param('id') id: string, @Body() dto: UpdateScoreDto, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.updateScore(id, dto);
  }

  @Delete('matches/:id/score')
  resetScore(@Param('id') id: string, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.resetScore(id);
  }

  @Patch('knockout/:id')
  updateKnockoutScore(@Param('id') id: string, @Body() dto: UpdateScoreDto, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.updateKnockoutScore(id, dto);
  }

  @Delete('knockout/:id/score')
  resetKnockoutScore(@Param('id') id: string, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.resetKnockoutScore(id);
  }

  @Post('sessions')
  createSession(@Body() dto: CreateRecordingSessionDto, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.createRecordingSession(dto);
  }

  @Patch('sessions/:id/score')
  updateSessionScore(@Param('id') id: string, @Body() dto: UpdateScoreDto, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.updateRecordingSessionScore(id, dto);
  }

  @Delete('sessions/:id/score')
  resetSessionScore(@Param('id') id: string, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.resetRecordingSessionScore(id);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.deleteRecordingSession(id);
  }
}
