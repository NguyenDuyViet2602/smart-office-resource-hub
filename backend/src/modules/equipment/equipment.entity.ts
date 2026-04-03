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
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';

export enum EquipmentStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum EquipmentType {
  PHONE = 'phone',
  LAPTOP = 'laptop',
  TABLET = 'tablet',
  CAMERA = 'camera',
  PROJECTOR = 'projector',
  HEADSET = 'headset',
  OTHER = 'other',
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: EquipmentType, default: EquipmentType.OTHER })
  type: EquipmentType;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'serial_number', unique: true })
  serialNumber: string;

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.AVAILABLE })
  status: EquipmentStatus;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ nullable: true, name: 'image_ref' })
  imageRef: string;

  @Column({ type: 'jsonb', nullable: true, name: 'yolo_labels' })
  yoloLabels: string[];

  @Column({ nullable: true, name: 'location' })
  location: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'current_borrower_id' })
  currentBorrower: User;

  @Column({ type: 'varchar', nullable: true, name: 'current_borrower_id' })
  currentBorrowerId: string | null;

  @Column({ nullable: true, name: 'due_return_at', type: 'timestamptz' })
  dueReturnAt: Date | null;

  @OneToMany(() => Booking, (booking) => booking.equipment)
  bookings: Booking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
