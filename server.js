const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const connectDB = require("./src/db/db");
const initSocketServer = require("./src/sockets/socket.server");

/* Import Routes */
const authRoutes = require("./src/routes/auth.routes");
const chatRoutes = require("./src/routes/chat.routes");

const app = express();

/* Middlewares (ALWAYS before routes) */
app.use(express.json());
app.use(
  cors({
    origin: "https://ai-chatbot-frontend-lqkd.onrender.com", // Adjust this to your frontend URL
    credentials: true, // REQUIRED for cookies
  }),
);
app.use(cookieParser());

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

/* Create HTTP server */
const httpServer = http.createServer(app);

/* Initialize Socket.IO */
initSocketServer(httpServer);

/* Connect DB */
connectDB();

/* Start Server */
httpServer.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
