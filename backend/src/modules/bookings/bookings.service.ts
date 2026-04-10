import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { Booking, BookingStatus, BookingResourceType } from './booking.entity';
import { Room, RoomStatus } from '../rooms/room.entity';
import { Equipment, EquipmentStatus } from '../equipment/equipment.entity';
import { User } from '../users/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsGateway } from './bookings.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';

@Injectable()
export class BookingsService {
  private redlock: Redlock;
  private logger = new Logger('BookingsService');

  constructor(
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
    @InjectRepository(Equipment)
    private equipmentRepo: Repository<Equipment>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private redisClient: Redis,
    private gateway: BookingsGateway,
    private notifications: NotificationsService,
    private auditLog: AuditLogService,
  ) {
    // redlock@5 is still prerelease on npm; pin major when a stable 5.x ships
    this.redlock = new Redlock([redisClient], {
      retryCount: 3,
      retryDelay: 200,
    });
  }

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime < new Date()) {
      throw new BadRequestException('Cannot book a time slot in the past');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    if (dto.resourceType === BookingResourceType.ROOM) {
      if (!dto.roomId) throw new BadRequestException('roomId is required for room bookings');
      return this.createRoomBooking(userId, dto.roomId, startTime, endTime, dto.notes);
    }

    if (!dto.equipmentId) throw new BadRequestException('equipmentId is required for equipment bookings');
    return this.createEquipmentBooking(userId, dto.equipmentId, startTime, endTime, dto.notes);
  }

  private async createRoomBooking(
    userId: string,
    roomId: string,
    startTime: Date,
    endTime: Date,
    notes?: string,
  ): Promise<Booking> {
    const lockKey = `booking:room:${roomId}`;

    const lock = await this.redlock.acquire([lockKey], 5000);
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const room = await queryRunner.manager.findOne(Room, {
          where: { id: roomId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!room) throw new NotFoundException('Room not found');
        if (room.status !== RoomStatus.AVAILABLE) {
          throw new ConflictException('Room is not available');
        }

        const conflict = await queryRunner.manager
          .createQueryBuilder(Booking, 'b')
          .where('b.room_id = :roomId', { roomId })
          .andWhere('b.status NOT IN (:...statuses)', {
            statuses: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
          })
          .andWhere('b.start_time < :endTime AND b.end_time > :startTime', { startTime, endTime })
          .getOne();

        if (conflict) {
          throw new ConflictException('Room is already booked for this time slot');
        }

        const booking = queryRunner.manager.create(Booking, {
          userId,
          roomId,
          resourceType: BookingResourceType.ROOM,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          notes,
        });

        const saved: Booking = await queryRunner.manager.save(booking);
        await queryRunner.commitTransaction();

        const result = await this.bookingsRepo.findOne({ where: { id: saved.id } });
        this.gateway.emitRoomUpdate(room.floorId ?? '', {
          roomId,
          available: false,
          bookingId: saved.id,
          startTime,
          endTime,
        });
        this.gateway.emitBookingCreated(result);

        // Gửi thông báo Telegram (không chặn response)
        this.sendBookingNotification(userId, result!);

        this.auditLog.log({
          action: AuditAction.BOOKING_CREATED,
          userId,
          resourceId: saved.id,
          resourceType: 'room',
          metadata: { roomId, startTime, endTime },
        }).catch((e) => this.logger.error(`Audit log failed: ${e.message}`));

        return result!;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } finally {
      await lock.release();
    }
  }

  private async sendBookingNotification(userId: string, booking: Booking): Promise<void> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      this.logger.log(`Notification check: userId=${userId}, chatId=${user?.telegramChatId ?? 'NONE'}`);
      if (user?.telegramChatId) {
        await this.notifications.notifyBookingConfirmed(booking, user.telegramChatId);
        this.logger.log(`Telegram notification sent for booking ${booking.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send booking notification: ${err.message}`);
    }
  }

  private async createEquipmentBooking(
    userId: string,
    equipmentId: string,
    startTime: Date,
    endTime: Date,
    notes?: string,
  ): Promise<Booking> {
    const lockKey = `booking:equipment:${equipmentId}`;

    const lock = await this.redlock.acquire([lockKey], 5000);
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const equipment = await queryRunner.manager.findOne(Equipment, {
          where: { id: equipmentId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!equipment) throw new NotFoundException('Equipment not found');
        if (equipment.status !== EquipmentStatus.AVAILABLE) {
          throw new ConflictException('Equipment is not available');
        }

        equipment.status = EquipmentStatus.BORROWED;
        equipment.currentBorrowerId = userId;
        equipment.dueReturnAt = endTime;
        await queryRunner.manager.save(equipment);

        const booking = queryRunner.manager.create(Booking, {
          userId,
          equipmentId,
          resourceType: BookingResourceType.EQUIPMENT,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          notes,
        });

        const saved: Booking = await queryRunner.manager.save(booking);
        await queryRunner.commitTransaction();

        const result = await this.bookingsRepo.findOne({ where: { id: saved.id } });
        this.gateway.emitEquipmentUpdate({ equipmentId, status: 'borrowed', borrowerId: userId });
        this.gateway.emitBookingCreated(result);

        // Gửi thông báo Telegram (không chặn response)
        this.sendBookingNotification(userId, result!);

        this.auditLog.log({
          action: AuditAction.EQUIPMENT_CHECKOUT,
          userId,
          resourceId: saved.id,
          resourceType: 'equipment',
          metadata: { equipmentId, startTime, endTime },
        }).catch((e) => this.logger.error(`Audit log failed: ${e.message}`));

        return result!;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } finally {
      await lock.release();
    }
  }

  async findAll(userId?: string): Promise<Booking[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.bookingsRepo.find({
      where,
      order: { startTime: 'ASC' },
    });
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancel(id: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.findById(id);

    if (booking.userId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledReason = reason ?? null;

    if (booking.equipmentId) {
      await this.equipmentRepo
        .createQueryBuilder()
        .update()
        .set({
          status: EquipmentStatus.AVAILABLE,
          currentBorrowerId: () => 'NULL',
          dueReturnAt: () => 'NULL',
        })
        .where('id = :id', { id: booking.equipmentId })
        .execute();
    }

    const saved = await this.bookingsRepo.save(booking);

    this.auditLog.log({
      action: AuditAction.BOOKING_CANCELLED,
      userId,
      resourceId: id,
      resourceType: booking.equipmentId ? 'equipment' : 'room',
      metadata: { reason },
    }).catch((e) => this.logger.error(`Audit log failed: ${e.message}`));

    return saved;
  }

  async findRoomSchedule(roomId: string, date: Date): Promise<Booking[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.bookingsRepo
      .createQueryBuilder('b')
      .where('b.room_id = :roomId', { roomId })
      .andWhere('b.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELLED],
      })
      .andWhere('b.start_time >= :start AND b.start_time <= :end', { start, end })
      .orderBy('b.start_time', 'ASC')
      .getMany();
  }
}
