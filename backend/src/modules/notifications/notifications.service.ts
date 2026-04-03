import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { Booking } from '../bookings/booking.entity';
import { Equipment } from '../equipment/equipment.entity';

@Injectable()
export class NotificationsService {
  private bot: Telegraf;
  private logger = new Logger('NotificationsService');
  private isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.isEnabled = !!token && token !== 'your-telegram-bot-token';

    if (this.isEnabled && token) {
      this.bot = new Telegraf(token);
      // launch() chỉ dùng để nhận tin (long polling) — lỗi không ảnh hưởng đến việc GỬI tin
      this.bot.launch().catch((err) => {
        this.logger.warn(`Telegram bot polling failed (sending still works): ${err.message}`);
      });
      this.logger.log('Telegram bot started');
    } else {
      this.logger.warn('Telegram bot token not configured — notifications disabled');
    }
  }

  private async sendMessage(chatId: string, message: string, retries = 2): Promise<void> {
    if (!this.isEnabled || !chatId) {
      this.logger.warn(`sendMessage skipped: isEnabled=${this.isEnabled}, chatId=${chatId || 'EMPTY'}`);
      return;
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        return;
      } catch (err) {
        this.logger.error(`Telegram send attempt ${attempt + 1}/${retries + 1} failed: ${err.message}`);
        if (attempt < retries) await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async notifyBookingConfirmed(booking: Booking, telegramChatId: string): Promise<void> {
    const resource = booking.room
      ? `Phòng <b>${booking.room.name}</b>`
      : `Thiết bị <b>${booking.equipment?.name}</b>`;
    const start = booking.startTime.toLocaleString('vi-VN');
    const end = booking.endTime.toLocaleString('vi-VN');

    await this.sendMessage(
      telegramChatId,
      `✅ <b>Đặt chỗ thành công!</b>\n\n${resource}\n🕐 ${start} → ${end}\n\nMã đặt chỗ: <code>${booking.id}</code>`,
    );
  }

  async notifyBookingReminder(booking: Booking, telegramChatId: string): Promise<void> {
    const resource = booking.room
      ? `Phòng ${booking.room.name}`
      : `Thiết bị ${booking.equipment?.name}`;
    await this.sendMessage(
      telegramChatId,
      `⏰ <b>Nhắc nhở:</b> ${resource} của bạn bắt đầu sau 30 phút.\n\nLúc: ${booking.startTime.toLocaleString('vi-VN')}`,
    );
  }

  async notifyEquipmentReturnDue(equipment: Equipment, telegramChatId: string): Promise<void> {
    const dueDate = equipment.dueReturnAt?.toLocaleString('vi-VN') ?? 'Không xác định';
    await this.sendMessage(
      telegramChatId,
      `⚠️ <b>Nhắc trả thiết bị:</b> <b>${equipment.name}</b>\n\nHạn trả: ${dueDate}\n\nVui lòng trả thiết bị đúng hạn.`,
    );
  }

  async notifyEquipmentReturnedByAI(
    equipment: Equipment,
    telegramChatId: string,
    confidence: number,
  ): Promise<void> {
    await this.sendMessage(
      telegramChatId,
      `🤖 <b>AI đã xác nhận trả thiết bị!</b>\n\nThiết bị: <b>${equipment.name}</b>\nĐộ chính xác: ${(confidence * 100).toFixed(1)}%\nThời gian: ${new Date().toLocaleString('vi-VN')}`,
    );
  }

  async notifyGeneral(chatId: string, message: string): Promise<void> {
    await this.sendMessage(chatId, message);
  }
}
