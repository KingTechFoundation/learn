const express = require('express');
const db = require('./config/db'); // MySQL connection
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const dotenv = require('dotenv');
const app = express();

dotenv.config(); // Load environment variables

const Port = process.env.PORT || 5000; // Set a default port if not in .env

// Define allowed origins
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'https://elearningplatiform.netlify.app', // Netlify production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from allowedOrigins or those without an origin (like Postman)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or authorization headers
};

app.use(cors(corsOptions)); // Apply CORS middleware

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Routes
app.use('/api/users', userRoutes); // Attach the user routes

// Start server
app.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
