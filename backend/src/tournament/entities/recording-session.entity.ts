import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'int', nullable: true })
  scoreA: number | null;

  @Column({ type: 'int', nullable: true })
  scoreB: number | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'completed';

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  playedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}