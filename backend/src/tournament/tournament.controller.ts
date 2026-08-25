import { Body, Controller, Delete, Get, Headers, Param, Patch, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TournamentService } from './tournament.service';
import { UpdateScoreDto } from './dto/update-score.dto';

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
  updateScore(
    @Param('id') id: string,
    @Body() dto: UpdateScoreDto,
    @Headers('x-admin-pin') pin?: string,
  ) {
    this.assertAdmin(pin);
    return this.service.updateScore(id, dto);
  }

  @Delete('matches/:id/score')
  resetScore(@Param('id') id: string, @Headers('x-admin-pin') pin?: string) {
    this.assertAdmin(pin);
    return this.service.resetScore(id);
  }
}
