import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type KnockoutStage = 'semifinal' | 'third_place' | 'final';
export type KnockoutStatus = 'pending' | 'completed';

@Entity('tournament_knockout_matches')
export class KnockoutMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  stage: KnockoutStage;

  @Column({ type: 'int' })
  slot: number;

  @Column({ type: 'uuid', nullable: true })
  teamAId: string | null;

  @Column({ type: 'uuid', nullable: true })
  teamBId: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: KnockoutStatus;

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