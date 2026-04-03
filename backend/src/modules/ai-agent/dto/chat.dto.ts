import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ example: 'Book phòng họp 4 người lúc 2h chiều hôm nay có tivi' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Conversation session ID for context' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class AiDetectDto {
  @ApiProperty({ description: 'Base64 encoded image frame' })
  @IsString()
  imageBase64: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  equipmentId?: string;
}
