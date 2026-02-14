const ChatModel = require("../models/chat.model");

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
