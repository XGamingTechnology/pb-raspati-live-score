import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GroupCode } from './team.entity';

export type MatchStatus = 'pending' | 'completed';

@Entity('tournament_matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1 })
  groupCode: GroupCode;

  @Column({ type: 'uuid' })
  teamAId: string;

  @Column({ type: 'uuid' })
  teamBId: string;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: MatchStatus;

  @Column({ type: 'int', nullable: true })
  scoreA: number | null;

  @Column({ type: 'int', nullable: true })
  scoreB: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  playedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
