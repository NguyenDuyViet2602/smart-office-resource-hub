import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../room.entity';

export class CreateRoomDto {
  @ApiProperty({ example: 'Phòng họp A' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  capacity: number;

  @ApiPropertyOptional({ example: ['tv', 'whiteboard', 'projector'] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string;

  @ApiPropertyOptional({ description: 'Position and size on the office map' })
  @IsOptional()
  @IsObject()
  mapCoords?: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: 'rect' | 'circle';
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
