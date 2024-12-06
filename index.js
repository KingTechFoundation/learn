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
  'http://localhost:5173', // Development origin
  'https://elearningplatiform.netlify.app/', // Production origin (Netlify)
];

// Define CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from allowedOrigins or requests without an origin (like Postman)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cors(corsOptions)); // Apply CORS configuration

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Routes
app.use('/api/users', userRoutes); // Attach the user routes

// Start server
app.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
