import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({ example: 'Tầng 2' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  floorNumber: number;

  @ApiPropertyOptional({ description: 'SVG map content' })
  @IsOptional()
  @IsString()
  svgMap?: string;
}
