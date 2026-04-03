import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingResourceType } from '../booking.entity';

export class CreateBookingDto {
  @ApiProperty({ enum: BookingResourceType })
  @IsEnum(BookingResourceType)
  resourceType: BookingResourceType;

  @ApiPropertyOptional({ description: 'Room ID (required for room bookings)' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Equipment ID (required for equipment bookings)' })
  @IsOptional()
  @IsString()
  equipmentId?: string;

  @ApiProperty({ example: '2026-03-29T14:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-03-29T16:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
