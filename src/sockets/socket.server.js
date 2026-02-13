const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const {
  generateAIResponse,
  generateVectors,
} = require("../services/ai.service");
const MessageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

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

      /* Validate message payload */
      const { chatId, content } = messagePayload;
      if (!content || !chatId) {
        console.error("Invalid message payload:", messagePayload);
        return;
      }

      /** Store user message in MongoDB */
      const userMessage = await MessageModel.create({
        chat: chatId,
        user: socket.user._id,
        content: content,
        role: "user",
      });

      /**LONG TERM MEMORY STORE (VECTOR DB) */
      const vectors = await generateVectors(content);
      console.log("Generated vectors for message:", vectors);

      /** Retrieve relevant memories from vector DB */
      const relevantMemories = await queryMemory({
        queryVector: vectors,
        limit: 3,
        metadata: { chatId: chatId, userId: socket.user._id },
      });
      console.log(
        "Retrieved relevant memories from VectorDB:",
        relevantMemories,
      );

      /** Store user message in vector DB for long-term memory */
      await createMemory({
        vectors: vectors,
        metadata: {
          chatId: chatId,
          userId: socket.user._id,
          text: content,
        },
        messageId: userMessage._id.toString(),
      });

      /** Short Term Chat History */
      const LIMIT = 20;
      const shortTermHistory = (
        await MessageModel.find({ chat: chatId })
          .sort({ createdAt: -1 })
          .limit(LIMIT)
          .lean()
      ).reverse();

      // console.log("Chat history for chatId", chatId, ":", shortTermHistory);

      /** Format Short Term Chat History for AI model */
      const formattedShortTermHistory = shortTermHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      /**Format Long Term Memories for AI model */
      const formattedLongTermMemories = relevantMemories.length
        ? [
            {
              role: "system",
              parts: [
                {
                  text: `These are relevant memories from the user's past interactions that use these Previous Memory Message to answer better.Do NOT mention that they come from memory \n${relevantMemories
                    .map((m) => m.metadata?.text)
                    .join("\n")}`,
                },
              ],
            },
          ]
        : [];

      /**console both Memory */
      console.log("Long Term Memories:", formattedLongTermMemories);
      console.log("Short Term History:", formattedShortTermHistory);

      const response = await generateAIResponse([
        ...formattedLongTermMemories,
        ...formattedShortTermHistory,
      ]);
      // console.log("Sending AI response to", socket.user.email, ":", response);
      const responseMessage = await MessageModel.create({
        chat: chatId,
        user: socket.user._id,
        content: response,
        role: "model",
      });

      /** Generate vectors of AI response */
      const responseVectors = await generateVectors(response);
      /** Store AI response in vector DB for long-term memory */
      await createMemory({
        vectors: responseVectors,
        metadata: { chatId: chatId, userId: socket.user._id, text: response },
        messageId: responseMessage._id.toString(), // ensure unique ID
      });

      /* Emit the AI response back to the client */
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
