const express = require('express');
const db = require('./config/db');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const dotenv = require('dotenv');
const app = express();

dotenv.config();

const Port = process.env.PORT || 5000;
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'https://elearningplatiform.netlify.app',
];

const allowedHeaders = ['Content-Type', 'Authorization'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from allowedOrigins or requests without an origin (like Postman)
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true); // Accept the request
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  allowedHeaders: allowedHeaders, // Specify allowed headers
  methods: 'GET,POST,PUT,DELETE', // Allow specific HTTP methods
  credentials: true, // Allow cookies or authorization headers
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use('/api/users', userRoutes);

app.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
