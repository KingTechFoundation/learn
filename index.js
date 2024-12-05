const express = require('express');
const db = require('./config/db'); // MySQL connection
const App = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const Port = process.env.PORT || 5000; // Set a default port if not in .env

require('dotenv').config(); // Load environment variables

App.use(express.json());
App.use(cors());

// Routes
App.use('/api/users', userRoutes); // Attach the user routes

App.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
