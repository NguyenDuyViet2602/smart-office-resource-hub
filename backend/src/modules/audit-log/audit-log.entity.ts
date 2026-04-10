import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  EQUIPMENT_CHECKOUT = 'EQUIPMENT_CHECKOUT',
  EQUIPMENT_RETURNED = 'EQUIPMENT_RETURNED',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['resourceId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ nullable: true, name: 'user_id' })
  userId!: string;

  @Column({ nullable: true, name: 'resource_id' })
  resourceId!: string;

  @Column({ nullable: true, name: 'resource_type', length: 50 })
  resourceType!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @Column({ nullable: true, name: 'ip_address', length: 45 })
  ipAddress!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
