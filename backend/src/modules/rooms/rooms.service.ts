import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from './room.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomAvailabilityDto } from './dto/room-availability.dto';

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

  async findAll(floorId?: string): Promise<Room[]> {
    const where: any = {};
    if (floorId) where.floorId = floorId;
    return this.roomsRepo.find({ where, relations: ['floor'] });
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
    const rooms = await this.roomsRepo.find({
      where: { status: RoomStatus.AVAILABLE },
      relations: ['floor'],
    });

    if (!query.startTime || !query.endTime) return rooms;

    const start = new Date(query.startTime);
    const end = new Date(query.endTime);

    const conflictingBookings = await this.bookingsRepo
      .createQueryBuilder('b')
      .where('b.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
      })
      .andWhere('b.room_id IS NOT NULL')
      .andWhere('b.start_time < :end AND b.end_time > :start', { start, end })
      .getMany();

    const bookedRoomIds = new Set(conflictingBookings.map((b) => b.roomId));

    return rooms.filter((room) => {
      if (bookedRoomIds.has(room.id)) return false;
      if (query.minCapacity && room.capacity < query.minCapacity) return false;
      if (query.features?.length) {
        return query.features.every((f) => room.features?.includes(f));
      }
      return true;
    });
  }
}
