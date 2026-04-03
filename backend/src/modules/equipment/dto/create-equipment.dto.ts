import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus, EquipmentType } from '../equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'iPhone 15 Pro #1' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EquipmentType })
  @IsEnum(EquipmentType)
  type: EquipmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'SN123456' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'YOLO class labels used to identify this device' })
  @IsOptional()
  @IsArray()
  yoloLabels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
