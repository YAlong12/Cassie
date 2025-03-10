require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const usersRoutes = require(path.join(__dirname, 'routes', 'users.js'));
const eventsRoutes = require('./routes/events');
const usersRouter = require('./routes/users');

const app = express();

// CORS configuration - must be before any routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Add this before your routes
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working' });
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
    console.error('\n=== Error Handler ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    
    // Ensure we're sending JSON
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({ 
        message: 'Server error', 
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`Routes configured at: /api/users, /api/events`);
});

module.exports = app;


