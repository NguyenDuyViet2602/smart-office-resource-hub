import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { EquipmentStatus } from './equipment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class CheckoutDto {
  @ApiPropertyOptional()
  @IsDateString()
  dueReturnAt: string;
}

@ApiTags('equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add equipment' })
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List equipment with pagination, optionally filter by status' })
  @ApiQuery({ name: 'status', enum: EquipmentStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  findAll(
    @Query('status') status?: EquipmentStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.equipmentService.findAll(status, page, Math.min(limit!, 100));
  }

  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List overdue equipment (admin)' })
  findOverdue() {
    return this.equipmentService.findOverdue();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by id' })
  findOne(@Param('id') id: string) {
    return this.equipmentService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update equipment (admin)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateEquipmentDto>) {
    return this.equipmentService.update(id, dto);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Check out equipment' })
  checkout(@Param('id') id: string, @Request() req, @Body() dto: CheckoutDto) {
    return this.equipmentService.checkout(id, req.user.id, new Date(dto.dueReturnAt));
  }

  @Post(':id/return')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Return equipment (called by AI Vision service)' })
  returnEquipment(@Param('id') id: string) {
    return this.equipmentService.returnEquipment(id, true);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete equipment (admin)' })
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
}
