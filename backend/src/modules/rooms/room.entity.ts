import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Floor } from '../floors/floor.entity';
import { Booking } from '../bookings/booking.entity';

export enum RoomStatus {
  AVAILABLE = 'available',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  capacity: number;

  @Column({ type: 'simple-array', nullable: true })
  features: string[];

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'map_coords' })
  mapCoords: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rect' | 'circle';
  };

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string;

  @ManyToOne(() => Floor, (floor) => floor.rooms, { nullable: true })
  @JoinColumn({ name: 'floor_id' })
  floor: Floor;

  @Column({ nullable: true, name: 'floor_id' })
  floorId: string;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings: Booking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
