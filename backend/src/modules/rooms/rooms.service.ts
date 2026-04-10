import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from './room.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomAvailabilityDto } from './dto/room-availability.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    const room = this.roomsRepo.create(dto);
    return this.roomsRepo.save(room);
  }

  async findAll(floorId?: string, page = 1, limit = 50): Promise<PaginatedResult<Room>> {
    const where: any = {};
    if (floorId) where.floorId = floorId;
    const [data, total] = await this.roomsRepo.findAndCount({
      where,
      relations: ['floor'],
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepo.findOne({ where: { id }, relations: ['floor'] });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: Partial<CreateRoomDto>): Promise<Room> {
    const room = await this.findById(id);
    Object.assign(room, dto);
    return this.roomsRepo.save(room);
  }

  async remove(id: string): Promise<void> {
    await this.roomsRepo.delete(id);
  }

  async findAvailable(query: RoomAvailabilityDto): Promise<Room[]> {
    // Build query using a single LEFT JOIN to detect conflicts — avoids N+1
    const qb = this.roomsRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.floor', 'floor')
      .where('room.status = :status', { status: RoomStatus.AVAILABLE });

    if (query.minCapacity) {
      qb.andWhere('room.capacity >= :minCapacity', { minCapacity: query.minCapacity });
    }

    if (query.startTime && query.endTime) {
      const start = new Date(query.startTime);
      const end = new Date(query.endTime);

      // Exclude rooms that have an overlapping active booking
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.room_id = room.id
            AND b.status NOT IN ('${BookingStatus.CANCELLED}', '${BookingStatus.COMPLETED}')
            AND b.start_time < :end
            AND b.end_time > :start
        )`,
        { start, end },
      );
    }

    const rooms = await qb.getMany();

    // Filter by features in-memory (JSON array field, can't do in SQL portably)
    if (query.features?.length) {
      return rooms.filter((r) =>
        query.features!.every((f) => r.features?.includes(f)),
      );
    }

    return rooms;
  }
}
