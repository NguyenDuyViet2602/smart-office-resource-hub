import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'}/events`,
      {
        autoConnect: true,
        reconnection: true,
      }
    );
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
