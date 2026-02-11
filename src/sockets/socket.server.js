const {Server} = require("socket.io");

function initSocketServer(httpServer){
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
  });
}

module.exports = initSocketServer;