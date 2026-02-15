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
      origin: "http://localhost:5173",
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

    // socket.on("ai-message", async (messagePayload) => {
    //   /**
    //    * messagePayload should have the structure:
    //    * {
    //    *   content: "User's message to AI",
    //    *  chatId: "ID of the chat this message belongs to"
    //    *  }
    //    */

    //   // console.log("Received AI message from",socket.user.email,":", messagePayload);

    //   /* Validate message payload */
    //   const { chatId, content } = messagePayload;
    //   if (!content || !chatId) {
    //     console.error("Invalid message payload:", messagePayload);
    //     return;
    //   }

    //   // /** Store user message in MongoDB */
    //   //  const userMessage = await MessageModel.create({
    //   //   chat: chatId,
    //   //   user: socket.user._id,
    //   //   content: content,
    //   //   role: "user",
    //   // });

    //   // /**LONG TERM MEMORY STORE (VECTOR DB) */
    //   // const vectors = await generateVectors(content);

    //   /** Store user message and its vectors in parallel */
    //   const [userMessage, vectors] = await Promise.all([
    //     MessageModel.create({
    //       chat: chatId,
    //       user: socket.user._id,
    //       content: content,
    //       role: "user",
    //     }),
    //     generateVectors(content),
    //   ]);

    //   console.log("Generated vectors for message:", vectors);

    //   /** Retrieve relevant memories from vector DB */
    //   // const relevantMemories = await queryMemory({
    //   //   queryVector: vectors,
    //   //   limit: 3,
    //   //   metadata: { chatId: chatId, userId: socket.user._id },
    //   // });
    //   // console.log(
    //   //   "Retrieved relevant memories from VectorDB:",
    //   //   relevantMemories,
    //   // );

    //   /** Store user message in vector DB for long-term memory */
    //   /** Background task at end */
    //   // await createMemory({
    //   //   vectors: vectors,
    //   //   metadata: {
    //   //     chatId: chatId,
    //   //     userId: socket.user._id,
    //   //     text: content,
    //   //   },
    //   //   messageId: userMessage._id.toString(),
    //   // });

    //   /** Short Term Chat History */

    //   // const shortTermHistory = (
    //   //   await MessageModel.find({ chat: chatId })
    //   //     .sort({ createdAt: -1 })
    //   //     .limit(20)
    //   //     .lean()
    //   // ).reverse();

    //   const [relevantMemories, shortTermHistory] = await Promise.all([
    //     queryMemory({
    //       queryVector: vectors,
    //       limit: 3,
    //       metadata: { chatId: chatId, userId: socket.user._id },
    //     }),
    //     MessageModel.find({ chat: chatId })
    //       .sort({ createdAt: -1 })
    //       .limit(20)
    //       .lean()
    //       .then((messages) => messages.reverse()),
    //   ]);
    //   console.log(
    //     "Retrieved relevant memories from VectorDB:",
    //     relevantMemories,
    //   );
    //   console.log("Chat history for chatId", chatId, ":", shortTermHistory);

    //   /** Format Short Term Chat History for AI model */
    //   const formattedShortTermHistory = shortTermHistory.map((item) => {
    //     return {
    //       role: item.role,
    //       parts: [{ text: item.content }],
    //     };
    //   });

    //   /**Format Long Term Memories for AI model */
    //   const formattedLongTermMemories = relevantMemories.length
    //     ? [
    //         {
    //           role: "system",
    //           parts: [
    //             {
    //               text: `These are relevant memories from the user's past interactions that use these Previous Memory Message to answer better.Do NOT mention that they come from memory \n${relevantMemories
    //                 .map((m) => m.metadata?.text)
    //                 .join("\n")}`,
    //             },
    //           ],
    //         },
    //       ]
    //     : [];

    //   /**console both Memory */
    //   console.log("Long Term Memories:", formattedLongTermMemories);
    //   console.log("Short Term History:", formattedShortTermHistory);

    //   const response = await generateAIResponse([
    //     ...formattedLongTermMemories,
    //     ...formattedShortTermHistory,
    //   ]);

    //   /* Emit the AI response back to the client immediately */
    //   socket.emit("ai-response", {
    //     content: response,
    //     chat: chatId,
    //   });

    //   // console.log("Sending AI response to", socket.user.email, ":", response);
    //   /* Store AI response in MongoDB */
    //   // const responseMessage = await MessageModel.create({
    //   //   chat: chatId,
    //   //   user: socket.user._id,
    //   //   content: response,
    //   //   role: "model",
    //   // });

    //   /** Generate vectors of AI response */
    //   // const responseVectors = await generateVectors(response);

    //   /** Store AI response and its vectors in parallel */
    //   const [responseMessage, responseVectors] = await Promise.all([
    //     MessageModel.create({
    //       chat: chatId,
    //       user: socket.user._id,
    //       content: response,
    //       role: "model",
    //     }),
    //     generateVectors(response),
    //   ]);

    //   await createMemory({
    //     vectors: vectors,
    //     metadata: {
    //       chatId: chatId,
    //       userId: socket.user._id,
    //       text: content,
    //     },
    //     messageId: userMessage._id.toString(),
    //   });

    //   /** Store AI response in vector DB for long-term memory */
    //   await createMemory({
    //     vectors: responseVectors,
    //     metadata: { chatId: chatId, userId: socket.user._id, text: response },
    //     messageId: responseMessage._id.toString(), // ensure unique ID
    //   });

    //   /* Emit the AI response back to the client */
    //   /* Response aate hi client ko emit karna hai taki wo turant dekh sake */
    //   // socket.emit("ai-response", {
    //   //   content: response,
    //   //   chat: chatId,
    //   // });
    // });

    socket.on("ai-message", async (messagePayload) => {
      const { chatId, content } = messagePayload;
      let userMessage = null; // ✅ OUTER SCOPE

      if (!content || !chatId) return;

      try {
        /* 1️⃣ Generate vectors early (safe & fast) */
        /* 1️⃣ SAVE USER MESSAGE + GENERATE VECTORS IN PARALLEL */
        const result = await Promise.all([
          MessageModel.create({
            chat: chatId,
            user: socket.user._id,
            content,
            role: "user",
          }),
          generateVectors(content),
        ]);

        userMessage = result[0]; // ✅ assign, not redeclare
        vectors = result[1];
        // await MessageModel.create({
        //     chat: chatId,
        //     user: socket.user._id,
        //     content,
        //     role: "user",
        //   }),

        // const vectors = await generateVectors(content);
        console.log("User Messgae Vector: ", vectors);
        console.log("User message in MongoDBRes: ", userMessage);

        /* 2️⃣ Fetch memories + short history in parallel */
        const [relevantMemories, shortTermHistory] = await Promise.all([
          queryMemory({
            queryVector: vectors,
            limit: 3,
            metadata: { chatId, userId: socket.user._id },
          }),
          MessageModel.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
            .then((m) => m.reverse()),
        ]);

        console.log("LONG TERM RELEVANT MEMORY: ", relevantMemories);
        console.log("SHORT TERM MEMORY: ", shortTermHistory);

        /* 3️⃣ Format prompt */
        const formattedHistory = shortTermHistory.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

        const formattedMemories = relevantMemories.length
          ? [
              {
                role: "system",
                parts: [
                  {
                    text: `Use previous context silently:\n${relevantMemories
                      .map((m) => m.metadata?.text)
                      .join("\n")}`,
                  },
                ],
              },
            ]
          : [];

        /* 4️⃣ HARD TIMEOUT for Gemini (VERY IMPORTANT) */
        const aiResponse = await Promise.race([
          generateAIResponse([
            ...formattedMemories,
            ...formattedHistory,
            { role: "user", parts: [{ text: content }] },
          ]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI timeout")), 60000),
          ),
        ]);

        /* 5️⃣ Emit response */
        socket.emit("ai-response", {
          chat: chatId,
          content: aiResponse,
        });

        /* =============================
       ✅ AI SUCCESS → NOW STORE DB
       ============================= */

        const aiMessage = await MessageModel.create({
          chat: chatId,
          user: socket.user._id,
          content: aiResponse,
          role: "model",
        });

        /* Vector store in background (non-blocking) */
        createMemory({
          vectors,
          metadata: { chatId, userId: socket.user._id, text: content },
          messageId: userMessage._id.toString(),
        }).catch(console.error);

        generateVectors(aiResponse)
          .then((resVec) =>
            createMemory({
              vectors: resVec,
              metadata: { chatId, userId: socket.user._id, text: aiResponse },
              messageId: aiMessage._id.toString(),
            }),
          )
          .catch(console.error);

        // /* 5️⃣ Emit response */
        // socket.emit("ai-response", {
        //   chat: chatId,
        //   content: aiResponse,
        // });
      } catch (error) {
        console.error("AI FAILED:", error.message);

        /* ❌ NO DB WRITE HERE */
        /* ❌ ROLLBACK USER MESSAGE */
        // console.log(userMessage);
        if (userMessage && userMessage?._id) {
          await MessageModel.findByIdAndDelete(userMessage._id);
        }

        socket.emit("ai-response", {
          chat: chatId,
          content:
            "⚠️ I'm currently under heavy load. Please try again in a moment.",
          error: true,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = initSocketServer;
