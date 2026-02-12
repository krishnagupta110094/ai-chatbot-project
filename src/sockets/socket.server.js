const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const { generateAIResponse } = require("../services/ai.service");
const MessageModel = require("../models/message.model");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true, // REQUIRED for cookies
    },
  });

  /* SOCKET.IO AUTH MIDDLEWARE */
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || "";

      if (!cookieHeader) {
        return next(new Error("Authentication error: No cookies"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.token;

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await UserModel.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // attach user to socket
      socket.user = user;

      next(); // ✅ allow connection
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    console.log("User:", socket.user.email);

    socket.on("ai-message", async (messagePayload) => {
      /**
       * messagePayload should have the structure:
       * {
       *   content: "User's message to AI",
       *  chatId: "ID of the chat this message belongs to"
       *  }
       */

      // console.log("Received AI message from",socket.user.email,":", messagePayload);

      const { chatId, content } = messagePayload;
      if (!content || !chatId) {
        console.error("Invalid message payload:", messagePayload);
        return;
      }
      await MessageModel.create({
        chat: chatId,
        user: socket.user._id,
        content: content,
        role: "user",
      });
      /** Chat History */
      const LIMIT = 20;
      const chatHistory = (await MessageModel.find({ chat: chatId }).sort({ createdAt: -1 }).limit(LIMIT).lean()).reverse();

      // console.log("Chat history for chatId", chatId, ":", chatHistory);

      const formattedChatHistory = chatHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      const response = await generateAIResponse(formattedChatHistory);
      // console.log("Sending AI response to", socket.user.email, ":", response);
      await MessageModel.create({
        chat: chatId,
        user: socket.user._id,
        content: response,
        role: "model",
      });
      socket.emit("ai-response", {
        content: response,
        chat: chatId,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = initSocketServer;
