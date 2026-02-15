const ChatModel = require("../models/chat.model");
const MessageModel = require("../models/message.model");

/* Create a new chat */
exports.createChat = async (req, res) => {
  try {
    const { title } = req.body;
    const newChat = await ChatModel.create({
      user: req.user?._id,
      title,
    });
    res.status(201).json({
      message: "Chat created successfully",
      chat: {
        _id: newChat._id,
        title: newChat.title,
        lastActivity: newChat.lastActivity,
        user: newChat.user,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Get all chats for the authenticated user */
exports.getChats = async (req, res) => {
  try {
    const chats = await ChatModel.find({ user: req.user?._id });
    res.status(200).json({ 
      message: "Chats retrieved successfully",
      chats: chats.map(chat => ({
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user,
      })),
     });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Get a single chat by ID along with its messages for the authenticated user */
exports.getAllMessageByChatId = async (req, res) => {
  try {
    const { chatId } = req.params; // route: /chat/:chatId

    // Find the chat belonging to the authenticated user
    const chat = await ChatModel.findOne({ _id: chatId, user: req.user?._id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Fetch messages for this chat
    const messages = await MessageModel.find({ chat: chat._id }).sort({ createdAt: 1 }); // oldest first
    // Map to desired format
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }));

    res.status(200).json({
      message: "Chat retrieved successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user,
        messages: formattedMessages,
      },
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid chat ID" });
    }
    res.status(500).json({ error: error.message });
  }
};
