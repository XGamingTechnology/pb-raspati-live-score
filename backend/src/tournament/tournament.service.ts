import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { GroupCode, Team } from './entities/team.entity';
import { KnockoutMatch } from './entities/knockout-match.entity';
import { RecordingSession } from './entities/recording-session.entity';
import { UpdateScoreDto } from './dto/update-score.dto';
import { CreateRecordingSessionDto } from './dto/create-recording-session.dto';

type Standing = {
  teamId: string;
  name: string;
  groupCode: GroupCode;
  played: number;
  won: number;
  lost: number;
  points: number;
  pf: number;
  pa: number;
  diff: number;
  provisionalRank: number;
  tieUnresolved: boolean;
};

@Injectable()
export class TournamentService implements OnModuleInit {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(KnockoutMatch) private readonly knockoutRepo: Repository<KnockoutMatch>,
    @InjectRepository(RecordingSession) private readonly sessionRepo: Repository<RecordingSession>,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  private validateScore(a: number, b: number) {
    if (a === b) throw new BadRequestException('Skor akhir tidak boleh seri');
    const winner = Math.max(a, b);
    const loser = Math.min(a, b);
    if (winner < 42) throw new BadRequestException('Pemenang minimal harus mencapai 42 poin');
    if (winner > 45) throw new BadRequestException('Skor maksimum adalah 45');
    if (winner === 42 && loser > 40) {
      throw new BadRequestException('Pada deuce 41-41 pertandingan belum boleh berakhir 42-41');
    }
    if ((winner === 43 || winner === 44) && winner - loser !== 2) {
      throw new BadRequestException('Pada deuce, skor 43/44 harus menang selisih 2 poin');
    }
    if (winner === 45 && ![43, 44].includes(loser)) {
      throw new BadRequestException('Skor 45 hanya valid sebagai 45-43 atau 45-44');
    }
  }

  async updateScore(id: string, dto: UpdateScoreDto) {
    this.validateScore(dto.scoreA, dto.scoreB);
    const match = await this.matchRepo.findOneBy({ id });
    if (!match) throw new NotFoundException('Pertandingan tidak ditemukan');
    match.scoreA = dto.scoreA;
    match.scoreB = dto.scoreB;
    match.status = 'completed';
    match.playedAt = new Date();
    match.note = dto.note?.trim() || null;
    await this.matchRepo.save(match);
    return this.getOverview();
  }

  async resetScore(id: string) {
    const match = await this.matchRepo.findOneBy({ id });
    if (!match) throw new NotFoundException('Pertandingan tidak ditemukan');
    match.scoreA = null;
    match.scoreB = null;
    match.status = 'pending';
    match.playedAt = null;
    match.note = null;
    await this.matchRepo.save(match);
    await this.resetKnockoutIfGroupReopened();
    return this.getOverview();
  }

  async updateKnockoutScore(id: string, dto: UpdateScoreDto) {
    this.validateScore(dto.scoreA, dto.scoreB);
    const match = await this.knockoutRepo.findOneBy({ id });
    if (!match) throw new NotFoundException('Pertandingan babak gugur tidak ditemukan');
    if (!match.teamAId || !match.teamBId) throw new BadRequestException('Peserta pertandingan belum terbentuk');
    match.scoreA = dto.scoreA;
    match.scoreB = dto.scoreB;
    match.status = 'completed';
    match.playedAt = new Date();
    match.note = dto.note?.trim() || null;
    await this.knockoutRepo.save(match);
    await this.ensureKnockoutProgression();
    return this.getOverview();
  }

  async resetKnockoutScore(id: string) {
    const match = await this.knockoutRepo.findOneBy({ id });
    if (!match) throw new NotFoundException('Pertandingan babak gugur tidak ditemukan');
    match.scoreA = null;
    match.scoreB = null;
    match.status = 'pending';
    match.playedAt = null;
    match.note = null;
    await this.knockoutRepo.save(match);
    if (match.stage === 'semifinal') {
      await this.knockoutRepo.delete({ stage: 'final' });
      await this.knockoutRepo.delete({ stage: 'third_place' });
    }
    return this.getOverview();
  }

  async createRecordingSession(dto: CreateRecordingSessionDto) {
    const session = this.sessionRepo.create({
      title: dto.title.trim(),
      participantA: dto.participantA.trim(),
      participantB: dto.participantB.trim(),
      status: 'pending',
      scoreA: null,
      scoreB: null,
      playedAt: null,
      note: dto.note?.trim() || null,
    });
    await this.sessionRepo.save(session);
    return this.getOverview();
  }

  async updateRecordingSessionScore(id: string, dto: UpdateScoreDto) {
    this.validateScore(dto.scoreA, dto.scoreB);
    const session = await this.sessionRepo.findOneBy({ id });
    if (!session) throw new NotFoundException('Sesi pencatatan tidak ditemukan');
    session.scoreA = dto.scoreA;
    session.scoreB = dto.scoreB;
    session.status = 'completed';
    session.playedAt = new Date();
    session.note = dto.note?.trim() || session.note;
    await this.sessionRepo.save(session);
    return this.getOverview();
  }

  async resetRecordingSessionScore(id: string) {
    const session = await this.sessionRepo.findOneBy({ id });
    if (!session) throw new NotFoundException('Sesi pencatatan tidak ditemukan');
    session.scoreA = null;
    session.scoreB = null;
    session.status = 'pending';
    session.playedAt = null;
    await this.sessionRepo.save(session);
    return this.getOverview();
  }

  async deleteRecordingSession(id: string) {
    const result = await this.sessionRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Sesi pencatatan tidak ditemukan');
    return this.getOverview();
  }

  async getOverview() {
    const [teams, matches] = await Promise.all([
      this.teamRepo.find({ order: { groupCode: 'ASC', sortOrder: 'ASC' } }),
      this.matchRepo.find({ order: { groupCode: 'ASC', sequence: 'ASC' } }),
    ]);
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const decoratedMatches = matches.map((m) => ({
      ...m,
      teamA: teamMap.get(m.teamAId)?.name || 'Unknown',
      teamB: teamMap.get(m.teamBId)?.name || 'Unknown',
    }));

    const groups = (['A', 'B'] as GroupCode[]).map((groupCode) => {
      const groupTeams = teams.filter((t) => t.groupCode === groupCode);
      const groupMatches = matches.filter((m) => m.groupCode === groupCode);
      return {
        groupCode,
        standings: this.calculateStandings(groupTeams, groupMatches),
        pendingMatches: decoratedMatches.filter((m) => m.groupCode === groupCode && m.status === 'pending'),
        completedMatches: decoratedMatches
          .filter((m) => m.groupCode === groupCode && m.status === 'completed')
          .sort((a, b) => new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime()),
      };
    });

    const completed = matches.filter((m) => m.status === 'completed').length;
    const standingsAreFinal = completed === matches.length;
    if (standingsAreFinal) await this.ensureSemifinals(groups);
    await this.ensureKnockoutProgression();

    const knockouts = await this.knockoutRepo.find({ order: { stage: 'ASC', slot: 'ASC' } });
    const decoratedKnockouts = knockouts.map((m) => ({
      ...m,
      teamA: m.teamAId ? teamMap.get(m.teamAId)?.name || 'TBD' : 'TBD',
      teamB: m.teamBId ? teamMap.get(m.teamBId)?.name || 'TBD' : 'TBD',
    }));
    const sessions = await this.sessionRepo.find({ order: { createdAt: 'DESC' } });

    const semifinalMatches = decoratedKnockouts.filter((m) => m.stage === 'semifinal');
    const finalMatches = decoratedKnockouts.filter((m) => m.stage === 'final');
    const thirdPlaceMatches = decoratedKnockouts.filter((m) => m.stage === 'third_place');
    const knockoutCompleted = decoratedKnockouts.length > 0 && decoratedKnockouts.every((m) => m.status === 'completed');
    const phase = !standingsAreFinal
      ? 'group'
      : knockoutCompleted && finalMatches.length > 0
        ? 'completed'
        : semifinalMatches.some((m) => m.status === 'pending')
          ? 'semifinal'
          : 'finals';

    return {
      tournament: {
        name: 'Turnamen Internal PB Raspati Plus 2026',
        system: 'Round Robin → Semifinal → Final',
        winPoints: 3,
        lossPoints: 0,
        totalMatches: matches.length,
        completedMatches: completed,
        remainingMatches: matches.length - completed,
        standingsAreFinal,
        phase,
        updatedAt: new Date().toISOString(),
      },
      regulations: {
        targetScore: 42,
        switchSidesAt: 21,
        deuceFrom: '41-41',
        winBy: 2,
        capScore: 45,
        semifinalPairing: 'A1 vs B2 dan B1 vs A2',
        thirdPlace: true,
      },
      groups,
      knockout: {
        semifinals: semifinalMatches,
        thirdPlace: thirdPlaceMatches,
        final: finalMatches,
      },
      recordingSessions: sessions,
    };
  }

  private async ensureSemifinals(groups: Array<{ groupCode: GroupCode; standings: Standing[] }>) {
    if (await this.knockoutRepo.count({ where: { stage: 'semifinal' } })) return;
    const groupA = groups.find((g) => g.groupCode === 'A')?.standings || [];
    const groupB = groups.find((g) => g.groupCode === 'B')?.standings || [];
    if (groupA.length < 2 || groupB.length < 2) return;
    if ([groupA[0], groupA[1], groupB[0], groupB[1]].some((r) => r.tieUnresolved)) return;
    await this.knockoutRepo.save([
      this.knockoutRepo.create({ stage: 'semifinal', slot: 1, teamAId: groupA[0].teamId, teamBId: groupB[1].teamId }),
      this.knockoutRepo.create({ stage: 'semifinal', slot: 2, teamAId: groupB[0].teamId, teamBId: groupA[1].teamId }),
    ]);
  }

  private async ensureKnockoutProgression() {
    const semifinals = await this.knockoutRepo.find({ where: { stage: 'semifinal' }, order: { slot: 'ASC' } });
    if (semifinals.length !== 2 || semifinals.some((m) => m.status !== 'completed')) return;
    const winner = (m: KnockoutMatch) => ((m.scoreA as number) > (m.scoreB as number) ? m.teamAId : m.teamBId);
    const loser = (m: KnockoutMatch) => ((m.scoreA as number) > (m.scoreB as number) ? m.teamBId : m.teamAId);

    const final = await this.knockoutRepo.findOneBy({ stage: 'final', slot: 1 });
    if (!final) {
      await this.knockoutRepo.save(this.knockoutRepo.create({
        stage: 'final', slot: 1, teamAId: winner(semifinals[0]), teamBId: winner(semifinals[1]),
      }));
    }
    const third = await this.knockoutRepo.findOneBy({ stage: 'third_place', slot: 1 });
    if (!third) {
      await this.knockoutRepo.save(this.knockoutRepo.create({
        stage: 'third_place', slot: 1, teamAId: loser(semifinals[0]), teamBId: loser(semifinals[1]),
      }));
    }
  }

  private async resetKnockoutIfGroupReopened() {
    const remaining = await this.matchRepo.count({ where: { status: 'pending' } });
    if (remaining > 0) await this.knockoutRepo.clear();
  }

  private calculateStandings(teams: Team[], matches: Match[]): Standing[] {
    const rows = new Map<string, Standing>();
    for (const team of teams) {
      rows.set(team.id, {
        teamId: team.id, name: team.name, groupCode: team.groupCode, played: 0, won: 0, lost: 0,
        points: 0, pf: 0, pa: 0, diff: 0, provisionalRank: 0, tieUnresolved: false,
      });
    }

    const completed = matches.filter((m) => m.status === 'completed' && m.scoreA !== null && m.scoreB !== null);
    for (const m of completed) {
      const a = rows.get(m.teamAId)!;
      const b = rows.get(m.teamBId)!;
      const sa = m.scoreA as number;
      const sb = m.scoreB as number;
      a.played += 1; b.played += 1; a.pf += sa; a.pa += sb; b.pf += sb; b.pa += sa;
      if (sa > sb) { a.won += 1; a.points += 3; b.lost += 1; }
      else { b.won += 1; b.points += 3; a.lost += 1; }
    }
    for (const row of rows.values()) row.diff = row.pf - row.pa;

    const all = [...rows.values()];
    const teamOrder = new Map(teams.map((t) => [t.id, t.sortOrder]));
    const pointsBuckets = new Map<number, Standing[]>();
    for (const row of all) {
      if (!pointsBuckets.has(row.points)) pointsBuckets.set(row.points, []);
      pointsBuckets.get(row.points)!.push(row);
    }

    const result: Standing[] = [];
    const pointLevels = [...pointsBuckets.keys()].sort((a, b) => b - a);
    for (const pts of pointLevels) {
      const tied = pointsBuckets.get(pts)!;
      const bucketStartRank = result.length + 1;
      if (tied.length === 1) {
        tied[0].provisionalRank = bucketStartRank;
        result.push(tied[0]);
        continue;
      }
      const tiedIds = new Set(tied.map((r) => r.teamId));
      const h2hMatches = completed.filter((m) => tiedIds.has(m.teamAId) && tiedIds.has(m.teamBId));
      const expectedH2H = (tied.length * (tied.length - 1)) / 2;
      const h2hComplete = h2hMatches.length === expectedH2H;
      const miniPoints = new Map(tied.map((r) => [r.teamId, 0]));
      for (const m of h2hMatches) {
        if ((m.scoreA as number) > (m.scoreB as number)) miniPoints.set(m.teamAId, (miniPoints.get(m.teamAId) || 0) + 3);
        else miniPoints.set(m.teamBId, (miniPoints.get(m.teamBId) || 0) + 3);
      }
      if (!h2hComplete) {
        tied.forEach((r) => { r.tieUnresolved = true; r.provisionalRank = bucketStartRank; });
        tied.sort((a, b) => (teamOrder.get(a.teamId) || 99) - (teamOrder.get(b.teamId) || 99));
        result.push(...tied);
        continue;
      }
      tied.sort((a, b) => {
        const mini = (miniPoints.get(b.teamId) || 0) - (miniPoints.get(a.teamId) || 0);
        if (mini !== 0) return mini;
        if (b.diff !== a.diff) return b.diff - a.diff;
        if (b.pf !== a.pf) return b.pf - a.pf;
        return (teamOrder.get(a.teamId) || 99) - (teamOrder.get(b.teamId) || 99);
      });
      tied.forEach((r, index) => { r.tieUnresolved = false; r.provisionalRank = bucketStartRank + index; });
      result.push(...tied);
    }
    return result;
  }

  private async seedIfEmpty() {
    if ((await this.teamRepo.count()) > 0) return;
    const seedTeams: Array<{ name: string; groupCode: GroupCode; sortOrder: number }> = [
      { name: 'Fikri / Bara', groupCode: 'A', sortOrder: 1 },
      { name: 'Rhoma / Wawan', groupCode: 'A', sortOrder: 2 },
      { name: 'Pak Suhaimi / Satrio', groupCode: 'A', sortOrder: 3 },
      { name: 'Daffa / Rafli', groupCode: 'A', sortOrder: 4 },
      { name: 'Tomy / Pak Udin', groupCode: 'A', sortOrder: 5 },
      { name: 'Pak Abbas / Rusda', groupCode: 'B', sortOrder: 1 },
      { name: 'Rahes / Jimi Tendean', groupCode: 'B', sortOrder: 2 },
      { name: 'JSR Hanai / Rizal', groupCode: 'B', sortOrder: 3 },
      { name: 'Pak Idwan / Kiki', groupCode: 'B', sortOrder: 4 },
      { name: 'Pandu / Rendi', groupCode: 'B', sortOrder: 5 },
    ];
    const teams = await this.teamRepo.save(seedTeams.map((t) => this.teamRepo.create(t)));
    const completedScores = new Map<string, [number, number]>([
      ['Fikri / Bara|Daffa / Rafli', [15, 42]], ['Rhoma / Wawan|Daffa / Rafli', [33, 42]],
      ['Rhoma / Wawan|Tomy / Pak Udin', [42, 32]], ['Daffa / Rafli|Tomy / Pak Udin', [42, 31]],
      ['Pak Abbas / Rusda|JSR Hanai / Rizal', [38, 42]], ['Pak Abbas / Rusda|Pak Idwan / Kiki', [42, 38]],
      ['Rahes / Jimi Tendean|Pak Idwan / Kiki', [40, 42]], ['Rahes / Jimi Tendean|Pandu / Rendi', [15, 42]],
      ['JSR Hanai / Rizal|Pandu / Rendi', [42, 27]],
    ]);

    const matches: Match[] = [];
    for (const groupCode of ['A', 'B'] as GroupCode[]) {
      const groupTeams = teams.filter((t) => t.groupCode === groupCode).sort((a, b) => a.sortOrder - b.sortOrder);
      let sequence = 1;
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const a = groupTeams[i]; const b = groupTeams[j];
          const key = `${a.name}|${b.name}`; const reverseKey = `${b.name}|${a.name}`;
          let score = completedScores.get(key);
          if (!score && completedScores.has(reverseKey)) { const rev = completedScores.get(reverseKey)!; score = [rev[1], rev[0]]; }
          matches.push(this.matchRepo.create({
            groupCode, teamAId: a.id, teamBId: b.id, sequence: sequence++, status: score ? 'completed' : 'pending',
            scoreA: score?.[0] ?? null, scoreB: score?.[1] ?? null,
            playedAt: score ? new Date('2026-08-24T21:00:00+07:00') : null,
            note: score ? 'Seed hasil pertandingan yang sudah tercatat' : null,
          }));
        }
      }
    }
    await this.matchRepo.save(matches);
  }
}
