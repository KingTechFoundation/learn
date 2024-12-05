const express = require('express');
const db = require('./config/db');
const App = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const Port = 5000;

App.use(express.json());
App.use(cors());
//routes
App.use('/api/users', userRoutes);

App.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
