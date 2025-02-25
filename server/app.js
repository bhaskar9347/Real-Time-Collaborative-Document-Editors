// Import required packages
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow frontend URL from env or default to localhost
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// Socket.IO Initialization
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Match CORS origin
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Basic Route
app.get('/', (req, res) => {
  res.send('🎉 Backend is running with Socket.IO!');
});

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend is healthy!',
    timestamp: new Date(),
  });
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  // Join a specific document room (optional for scalability)
  socket.on('join-document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document room: ${documentId}`);
  });

  // Listen for changes from clients
  socket.on('send-changes', ({ documentId, content }) => {
    console.log(`📝 Changes received for document: ${documentId}`);
    socket.to(documentId).emit('receive-changes', content); // Broadcast to others in the same room
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 5000; // Use environment variable for port
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});