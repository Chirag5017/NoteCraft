'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocketIO } = require('./sockets/index');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`NoteCraft server running on port ${PORT}`);
  });
});

module.exports = server;
