import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { getCorsOrigins } from '../../config/cors.config';
import { Booking } from './booking.entity';

export interface RoomAvailabilityUpdate {
  roomId: string;
  available: boolean;
  bookingId?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface EquipmentStatusUpdate {
  equipmentId: string;
  status: string;
  borrowerId?: string;
}

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: 'events',
})
export class BookingsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('BookingsGateway');

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:floor')
  handleJoinFloor(client: Socket, floorId: string) {
    client.join(`floor:${floorId}`);
    this.logger.log(`Client ${client.id} joined floor:${floorId}`);
  }

  @SubscribeMessage('leave:floor')
  handleLeaveFloor(client: Socket, floorId: string) {
    client.leave(`floor:${floorId}`);
  }

  emitRoomUpdate(floorId: string, update: RoomAvailabilityUpdate) {
    this.server.to(`floor:${floorId}`).emit('room:availability', update);
  }

  emitEquipmentUpdate(update: EquipmentStatusUpdate) {
    this.server.emit('equipment:status', update);
  }

  emitBookingCreated(booking: Booking | null) {
    if (booking) this.server.emit('booking:created', booking);
  }

  emitBookingCancelled(bookingId: string) {
    this.server.emit('booking:cancelled', { bookingId });
  }
}
