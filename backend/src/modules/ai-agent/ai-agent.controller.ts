import { Body, Controller, Post, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, AiDetectDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EquipmentService } from '../equipment/equipment.service';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiAgentController {
  constructor(
    private aiAgentService: AiAgentService,
    private equipmentService: EquipmentService,
    private notificationsService: NotificationsService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI agent to book rooms/equipment' })
  async chat(@Request() req, @Body() dto: ChatDto) {
    const reply = await this.aiAgentService.chat(req.user.id, dto.message, dto.sessionId);
    return { reply };
  }

  @Post('detect')
  @ApiOperation({ summary: 'Send camera frame for AI device detection' })
  async detectAndReturn(@Request() req, @Body() dto: AiDetectDto) {
    const result = await this.aiAgentService.detectEquipment(dto.imageBase64, dto.equipmentId);

    if (result.confirmed && dto.equipmentId && result.confidence > 0.75) {
      const equipmentBefore = await this.equipmentService.findById(dto.equipmentId);
      if (!equipmentBefore.currentBorrowerId) {
        throw new BadRequestException('Thiết bị hiện không ở trạng thái đang mượn.');
      }
      if (equipmentBefore.currentBorrowerId !== req.user.id) {
        throw new ForbiddenException('Bạn không thể trả thiết bị thay người khác.');
      }

      const borrowerChatId = equipmentBefore.currentBorrower?.telegramChatId;
      await this.equipmentService.returnEquipment(dto.equipmentId, true);

      if (borrowerChatId) {
        await this.notificationsService.notifyEquipmentReturnedByAI(
          equipmentBefore,
          borrowerChatId,
          result.confidence,
        );
      }
    }

    return result;
  }
}
