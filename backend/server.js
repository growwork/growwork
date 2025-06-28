const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db'); // Import our DB connection

// Load environment variables from .env file
dotenv.config();

// Connect to our MongoDB database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allow requests from our future frontend
app.use(express.json()); // Allow the server to accept JSON in requests

// A simple test route to make sure the server is working
app.get('/', (req, res) => {
  res.send('GrowWork API is running...');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});