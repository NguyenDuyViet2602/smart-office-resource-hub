import { IsDateString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RoomAvailabilityDto {
  @ApiPropertyOptional({ example: '2026-03-29T14:00:00Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-03-29T16:00:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minCapacity?: number;

  @ApiPropertyOptional({ example: ['tv', 'whiteboard'] })
  @IsOptional()
  @IsArray()
  features?: string[];
}
