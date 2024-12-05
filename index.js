const express = require('express');
const db = require('./config/db'); // MySQL connection
const app = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const Port = process.env.PORT || 5000; // Set a default port if not in .env

require('dotenv').config(); // Load environment variables

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', // Allow your local development server (adjust if necessary)
    'https://elearningplatiform.netlify.app', // Allow your Netlify frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
};

app.use(express.json());
app.use(cors(corsOptions)); // Apply CORS configuration

// Routes
app.use('/api/users', userRoutes); // Attach the user routes

app.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
