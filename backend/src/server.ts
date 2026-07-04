import app from './app';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
});

// WebSocket events for real-time order updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Join restaurant room for real-time updates
  socket.on('join-restaurant', (restaurantId) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Joined restaurant room: ${restaurantId}`);
  });

  // Broadcast order updates
  socket.on('order-updated', (data) => {
    io.to(`restaurant-${data.restaurantId}`).emit('order-status-changed', data);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
