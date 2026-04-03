import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { Equipment } from '../equipment/equipment.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum BookingResourceType {
  ROOM = 'room',
  EQUIPMENT = 'equipment',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: BookingResourceType })
  resourceType: BookingResourceType;

  @ManyToOne(() => Room, (room) => room.bookings, { nullable: true, eager: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ nullable: true, name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Equipment, (eq) => eq.bookings, { nullable: true, eager: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ nullable: true, name: 'equipment_id' })
  equipmentId: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'varchar', nullable: true, name: 'cancelled_reason' })
  cancelledReason: string | null;

  @Column({ default: false, name: 'ai_verified' })
  aiVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
