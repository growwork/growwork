const mongoose = require('mongoose');

// This function tries to connect to the database
const connectDB = async () => {
  try {
    // We use the MONGO_URI from our .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit the program if we can't connect
  }
};

module.exports = connectDB;