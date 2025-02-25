// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const Document = require('./models/Document');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:3000'], // Allow frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/collaborative-docs', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); // Exit process if MongoDB fails to connect
  });

// Handle MongoDB disconnection
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected');
});

// Middleware for centralized error handling
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
};
app.use(errorHandler);

// Routes
// Fetch all documents
app.get('/documents', async (req, res) => {
  try {
    const docs = await Document.find();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Create a new document
app.post('/documents', async (req, res) => {
  const { title, content } = req.body;

  // Validate input
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const newDoc = new Document({ title, content });
    await newDoc.save();
    io.emit('documentUpdated', newDoc); // Notify clients of the new document
    res.status(201).json(newDoc);
  } catch (err) {
    res.status(500).json({ message: 'Error creating document' });
  }
});

// Update a document
app.put('/documents/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid document ID' });
  }

  try {
    const updatedDoc = await Document.findByIdAndUpdate(
      id,
      { title, content },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    io.emit('documentUpdated', updatedDoc); // Notify clients of the update
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: 'Error updating document' });
  }
});

// Delete a document
app.delete('/documents/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid document ID' });
  }

  try {
    const deletedDoc = await Document.findByIdAndDelete(id);

    if (!deletedDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    io.emit('documentDeleted', id); // Notify clients of the deletion
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting document' });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('⚡ A user connected:', socket.id);

  // Broadcast changes to other users
  socket.on('send-changes', (data) => {
    socket.broadcast.emit('receive-changes', data);
  });

  // Auto-save document changes
  socket.on('save-document', async ({ id, content }) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return console.error('Invalid document ID for auto-save');
    }

    try {
      await Document.findByIdAndUpdate(id, { content });
      console.log(`💾 Document ${id} auto-saved.`);
    } catch (err) {
      console.error('❌ Error auto-saving document:', err);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Health check route
app.get('/', (req, res) => {
  res.send('🎉 Backend is Running Successfully!');
});

// Start the server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});