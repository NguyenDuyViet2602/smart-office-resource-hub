import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment, EquipmentStatus } from './equipment.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepo: Repository<Equipment>,
  ) {}

  async create(dto: CreateEquipmentDto): Promise<Equipment> {
    const equipment = this.equipmentRepo.create(dto);
    return this.equipmentRepo.save(equipment);
  }

  async findAll(status?: EquipmentStatus, page = 1, limit = 20): Promise<PaginatedResult<Equipment>> {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await this.equipmentRepo.findAndCount({
      where,
      relations: ['currentBorrower'],
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Equipment> {
    const eq = await this.equipmentRepo.findOne({ where: { id }, relations: ['currentBorrower'] });
    if (!eq) throw new NotFoundException('Equipment not found');
    return eq;
  }

  async update(id: string, dto: Partial<CreateEquipmentDto>): Promise<Equipment> {
    const eq = await this.findById(id);
    Object.assign(eq, dto);
    return this.equipmentRepo.save(eq);
  }

  async checkout(id: string, userId: string, dueReturnAt: Date): Promise<Equipment> {
    const eq = await this.findById(id);
    if (eq.status !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException('Equipment is not available for checkout');
    }
    eq.status = EquipmentStatus.BORROWED;
    eq.currentBorrowerId = userId;
    eq.dueReturnAt = dueReturnAt;
    return this.equipmentRepo.save(eq);
  }

  async returnEquipment(id: string, aiVerified = false): Promise<Equipment> {
    const eq = await this.findById(id);
    eq.status = EquipmentStatus.AVAILABLE;
    eq.currentBorrowerId = undefined!;
    eq.dueReturnAt = undefined!;
    return this.equipmentRepo.save(eq);
  }

  async remove(id: string): Promise<void> {
    await this.equipmentRepo.delete(id);
  }

  async findOverdue(): Promise<Equipment[]> {
    return this.equipmentRepo
      .createQueryBuilder('eq')
      .where('eq.status = :status', { status: EquipmentStatus.BORROWED })
      .andWhere('eq.due_return_at < :now', { now: new Date() })
      .leftJoinAndSelect('eq.currentBorrower', 'user')
      .getMany();
  }
}
