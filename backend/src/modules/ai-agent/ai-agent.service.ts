import { HttpException, HttpStatus, Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import Redis from 'ioredis';
import { RoomsService } from '../rooms/rooms.service';
import { BookingsService } from '../bookings/bookings.service';
import { EquipmentService } from '../equipment/equipment.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingResourceType } from '../bookings/booking.entity';

type GeminiRole = 'user' | 'model';
type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

interface ChatSession {
  messages: { role: GeminiRole; parts: GeminiPart[] }[];
}

const SESSION_TTL = 60 * 60 * 4; // 4 hours in seconds

@Injectable()
export class AiAgentService {
  private genAI?: GoogleGenerativeAI;
  private logger = new Logger('AiAgentService');
  private isEnabled: boolean;
  private readonly defaultModel = 'gemini-2.5-flash';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private roomsService: RoomsService,
    private bookingsService: BookingsService,
    private equipmentService: EquipmentService,
    private notificationsService: NotificationsService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    this.isEnabled = !!apiKey && apiKey !== 'your-gemini-api-key';
    if (this.isEnabled) this.genAI = new GoogleGenerativeAI(apiKey!);
    else this.logger.warn('Gemini API key not configured — AI Agent disabled');
  }

  private async getSession(key: string): Promise<ChatSession | null> {
    const raw = await this.redisClient.get(`ai:session:${key}`);
    return raw ? (JSON.parse(raw) as ChatSession) : null;
  }

  private async saveSession(key: string, session: ChatSession): Promise<void> {
    await this.redisClient.setex(`ai:session:${key}`, SESSION_TTL, JSON.stringify(session));
  }

  private getTools(): any {
    return [
      {
        functionDeclarations: [
          {
            name: 'check_room_availability',
            description: 'Tìm phòng họp trống theo thời gian, sức chứa và tính năng yêu cầu',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                startTime: {
                  type: SchemaType.STRING,
                  description: 'ISO datetime string (e.g. 2026-03-29T14:00:00Z)',
                },
                endTime: { type: SchemaType.STRING, description: 'ISO datetime string' },
                minCapacity: { type: SchemaType.NUMBER, description: 'Số người tối thiểu' },
                features: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'Tính năng cần có: tv, projector, whiteboard, etc.',
                },
              },
              required: ['startTime', 'endTime'],
            },
          },
          {
            name: 'create_booking',
            description: 'Đặt phòng hoặc thiết bị',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                roomId: { type: SchemaType.STRING, description: 'ID phòng cần đặt' },
                equipmentId: { type: SchemaType.STRING, description: 'ID thiết bị cần mượn' },
                startTime: { type: SchemaType.STRING },
                endTime: { type: SchemaType.STRING },
                notes: { type: SchemaType.STRING },
              },
              required: ['startTime', 'endTime'],
            },
          },
          {
            name: 'list_my_bookings',
            description: 'Xem danh sách đặt chỗ của tôi',
            parameters: { type: SchemaType.OBJECT, properties: {} },
          },
          {
            name: 'cancel_booking',
            description: 'Hủy đặt chỗ',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                bookingId: { type: SchemaType.STRING, description: 'ID đặt chỗ cần hủy' },
                reason: { type: SchemaType.STRING },
              },
              required: ['bookingId'],
            },
          },
          {
            name: 'list_equipment',
            description: 'Xem danh sách thiết bị có thể mượn',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                status: {
                  type: SchemaType.STRING,
                  enum: ['available', 'borrowed', 'maintenance'],
                },
              },
            },
          },
        ],
      },
    ];
  }

  private async executeToolCall(
    toolName: string,
    args: any,
    userId: string,
  ): Promise<string> {
    try {
      switch (toolName) {
        case 'check_room_availability': {
          const rooms = await this.roomsService.findAvailable({
            startTime: args.startTime,
            endTime: args.endTime,
            minCapacity: args.minCapacity,
            features: args.features,
          });
          if (!rooms.length) return 'Không có phòng nào trống trong khoảng thời gian này.';
          return JSON.stringify(
            rooms.map((r) => ({
              id: r.id,
              name: r.name,
              capacity: r.capacity,
              features: r.features,
              floor: r.floor?.name,
            })),
          );
        }

        case 'create_booking': {
          const booking = await this.bookingsService.create(userId, {
            resourceType: args.roomId ? BookingResourceType.ROOM : BookingResourceType.EQUIPMENT,
            roomId: args.roomId,
            equipmentId: args.equipmentId,
            startTime: args.startTime,
            endTime: args.endTime,
            notes: args.notes,
          });
          return JSON.stringify({
            success: true,
            bookingId: booking.id,
            room: booking.room?.name,
            equipment: booking.equipment?.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
          });
        }

        case 'list_my_bookings': {
          const bookings = await this.bookingsService.findAll(userId);
          return JSON.stringify(
            bookings.map((b) => ({
              id: b.id,
              resource: b.room?.name || b.equipment?.name,
              type: b.resourceType,
              startTime: b.startTime,
              endTime: b.endTime,
              status: b.status,
            })),
          );
        }

        case 'cancel_booking': {
          await this.bookingsService.cancel(args.bookingId, userId, args.reason);
          return JSON.stringify({ success: true, message: 'Đã hủy đặt chỗ thành công' });
        }

        case 'list_equipment': {
          const result = await this.equipmentService.findAll(args.status);
          return JSON.stringify(
            result.data.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              status: e.status,
            })),
          );
        }

        default:
          return 'Unknown tool';
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      return `Error: ${m}`;
    }
  }

  /** Maps Gemini errors to HTTP so clients see quota/auth issues instead of generic 500. */
  private throwGeminiHttp(err: unknown): never {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.error(`Gemini chat failed: ${msg}`, err instanceof Error ? err.stack : undefined);

    const m = msg.toLowerCase();
    if (m.includes('quota') || m.includes('rate') || m.includes('429')) {
      throw new HttpException(
        'Gemini: đã hết hạn mức hoặc quá nhiều yêu cầu. Kiểm tra quota/billing của Google AI.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (
      m.includes('api key') ||
      m.includes('permission') ||
      m.includes('unauthorized') ||
      m.includes('403') ||
      m.includes('401')
    ) {
      throw new HttpException('API key Gemini không hợp lệ hoặc không đủ quyền.', HttpStatus.BAD_GATEWAY);
    }
    throw new HttpException(`Lỗi Gemini: ${msg}`, HttpStatus.BAD_GATEWAY);
  }

  private resolveGeminiModel(): string {
    const raw = (this.configService.get<string>('GEMINI_MODEL') || '').trim();
    if (!raw) return this.defaultModel;

    if (raw.startsWith('gemini-2.5-')) return raw;

    this.logger.warn(`GEMINI_MODEL="${raw}" không được hỗ trợ. Chỉ cho phép gemini-2.5-*. Fallback: ${this.defaultModel}`);
    return this.defaultModel;
  }

  async chat(userId: string, message: string, sessionId = 'default'): Promise<string> {
    if (!this.isEnabled) {
      return 'AI Agent chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env';
    }
    if (!this.genAI) throw new HttpException('Gemini client chưa được khởi tạo.', HttpStatus.INTERNAL_SERVER_ERROR);

    const key = `${userId}:${sessionId}`;
    let session = await this.getSession(key);
    if (!session) {
      // Tính giờ Việt Nam (UTC+7) độc lập với timezone của server
      const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const vnDateStr = `${pad(nowVN.getUTCDate())}/${pad(nowVN.getUTCMonth() + 1)}/${nowVN.getUTCFullYear()}`;
      const vnTimeStr = `${pad(nowVN.getUTCHours())}:${pad(nowVN.getUTCMinutes())}`;
      const vnISOPrefix = `${nowVN.getUTCFullYear()}-${pad(nowVN.getUTCMonth() + 1)}-${pad(nowVN.getUTCDate())}`;

      session = {
        messages: [
          {
            role: 'user',
            parts: [
              {
                text: `Bạn là trợ lý đặt phòng và mượn thiết bị thông minh cho văn phòng.
Múi giờ: Asia/Ho_Chi_Minh (UTC+7).
Hôm nay là ${vnDateStr}. Giờ hiện tại (giờ Việt Nam): ${vnTimeStr}.
Ngày hôm nay dạng ISO: ${vnISOPrefix}.

QUAN TRỌNG về datetime:
- Mọi datetime ISO string bạn tạo ra PHẢI dùng offset +07:00, KHÔNG dùng Z (UTC).
  Ví dụ đúng: "2026-04-01T16:00:00+07:00"
  Ví dụ SAI:  "2026-04-01T09:00:00Z" (sai vì sẽ hiển thị lệch 7 tiếng)
- "2h chiều" = 14:00 → ISO: ${vnISOPrefix}T14:00:00+07:00
- "4h36 chiều" = 16:36 → ISO: ${vnISOPrefix}T16:36:00+07:00
- "sáng mai 9h" → ngày mai lúc 09:00 → ISO: T09:00:00+07:00

Nhiệm vụ của bạn:
- Hiểu yêu cầu bằng tiếng Việt hoặc tiếng Anh
- Tìm phòng/thiết bị phù hợp và thực hiện đặt chỗ tự động
- Trả lời thân thiện, ngắn gọn, bằng tiếng Việt
- Luôn xác nhận với người dùng trước khi thực hiện hành động quan trọng`,
              },
            ],
          },
        ],
      };
      await this.saveSession(key, session);
    }

    session = (await this.getSession(key))!;
    session.messages.push({ role: 'user', parts: [{ text: message }] });

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.resolveGeminiModel(),
        tools: this.getTools() as any,
      });

      for (let step = 0; step < 8; step++) {
        const res = await model.generateContent({ contents: session.messages } as any);

        const candidate = (res as any).response?.candidates?.[0];
        const parts: GeminiPart[] = candidate?.content?.parts ?? [];

        const text = parts
          .map((p) => ('text' in p ? p.text : ''))
          .filter((t) => typeof t === 'string' && t.length > 0)
          .join('');

        const fnCalls = parts.filter((p) => 'functionCall' in p) as Array<{
          functionCall: { name: string; args?: Record<string, unknown> };
        }>;

        if (fnCalls.length === 0) {
          const reply = text || 'Xin lỗi, tôi không hiểu yêu cầu này.';
          session.messages.push({ role: 'model', parts: [{ text: reply }] });

          if (session.messages.length > 40) {
            session.messages = [session.messages[0], ...session.messages.slice(-20)];
          }

          await this.saveSession(key, session);
          return reply;
        }

        session.messages.push({ role: 'model', parts });

        for (const call of fnCalls) {
          const name = call.functionCall.name;
          const args = call.functionCall.args ?? {};
          const result = await this.executeToolCall(name, args, userId);
          session.messages.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name,
                  response: { content: result },
                },
              },
            ],
          });
        }
      }

      throw new HttpException('Gemini: vượt quá số bước tool-call cho phép.', HttpStatus.BAD_GATEWAY);
    } catch (err) {
      this.throwGeminiHttp(err);
    }
  }

  async detectEquipment(imageBase64: string, equipmentId?: string) {
    const aiVisionUrl = this.configService.get('AI_VISION_URL', 'http://localhost:8000');

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${aiVisionUrl}/detect`, {
          image_base64: imageBase64,
          equipment_id: equipmentId,
        }),
      );
      return data;
    } catch (err) {
      const e = err as any;
      const isConnectionError =
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ENOTFOUND' ||
        e?.cause?.code === 'ECONNREFUSED';

      if (isConnectionError) {
        this.logger.warn('AI Vision service is not reachable');
        throw new HttpException(
          'Dịch vụ nhận diện AI hiện không khả dụng. Vui lòng thử lại sau.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const status = e?.response?.status;
      const message = e?.response?.data?.detail ?? e?.message ?? 'AI Vision error';
      this.logger.error(`AI Vision request failed (${status ?? 'no status'}): ${message}`);
      throw new HttpException(message, status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
