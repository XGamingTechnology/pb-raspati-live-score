import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type GroupCode = 'A' | 'B';

@Entity('tournament_teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', length: 1 })
  groupCode: GroupCode;

  @Column({ type: 'int' })
  sortOrder: number;
}
