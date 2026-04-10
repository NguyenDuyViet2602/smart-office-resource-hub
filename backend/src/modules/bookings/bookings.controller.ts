import {
  Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking (room or equipment)' })
  create(@Request() req, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my bookings (or all if admin)' })
  findAll(@Request() req, @Query('userId') userId?: string) {
    const targetUserId = req.user.role === UserRole.ADMIN && userId ? userId : req.user.id;
    return this.bookingsService.findAll(targetUserId === 'all' ? undefined : targetUserId);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all bookings (admin)' })
  findAllAdmin() {
    return this.bookingsService.findAll();
  }

  @Get('room/:roomId/schedule')
  @ApiOperation({ summary: 'Get room schedule for a given date' })
  getRoomSchedule(
    @Param('roomId') roomId: string,
    @Query('date') date?: string,
  ) {
    let parsedDate: Date;
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }
    } else {
      parsedDate = new Date();
    }
    return this.bookingsService.findRoomSchedule(roomId, parsedDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by id' })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(@Param('id') id: string, @Request() req, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(id, req.user.id, dto.reason);
  }
}
