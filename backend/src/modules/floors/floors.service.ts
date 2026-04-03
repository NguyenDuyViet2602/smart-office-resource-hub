import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Floor } from './floor.entity';
import { CreateFloorDto } from './dto/create-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private floorsRepo: Repository<Floor>,
  ) {}

  async create(dto: CreateFloorDto): Promise<Floor> {
    const floor = this.floorsRepo.create(dto);
    return this.floorsRepo.save(floor);
  }

  async findAll(): Promise<Floor[]> {
    return this.floorsRepo.find({
      where: { isActive: true },
      relations: ['rooms'],
      order: { floorNumber: 'ASC' },
    });
  }

  async findById(id: string): Promise<Floor> {
    const floor = await this.floorsRepo.findOne({ where: { id }, relations: ['rooms'] });
    if (!floor) throw new NotFoundException('Floor not found');
    return floor;
  }

  async update(id: string, dto: Partial<CreateFloorDto>): Promise<Floor> {
    const floor = await this.findById(id);
    Object.assign(floor, dto);
    return this.floorsRepo.save(floor);
  }

  async updateSvgMap(id: string, svgMap: string): Promise<Floor> {
    const floor = await this.findById(id);
    floor.svgMap = svgMap;
    return this.floorsRepo.save(floor);
  }

  async remove(id: string): Promise<void> {
    await this.floorsRepo.update(id, { isActive: false });
  }
}
