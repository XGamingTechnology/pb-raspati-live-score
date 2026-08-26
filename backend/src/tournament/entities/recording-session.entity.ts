import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RecordingSessionStatus = 'pending' | 'live' | 'completed';
export type ScoreSide = 'A' | 'B';

export type ScoreHistoryEntry = {
  seq: number;
  side: ScoreSide;
  scoreA: number;
  scoreB: number;
  at: string;
};

@Entity('tournament_recording_sessions')
export class RecordingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 120 })
  participantA: string;

  @Column({ type: 'varchar', length: 120 })
  participantB: string;

  @Column({ type: 'int', default: 0 })
  scoreA: number;

  @Column({ type: 'int', default: 0 })
  scoreB: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: RecordingSessionStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  scoreHistory: ScoreHistoryEntry[];

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  playedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
