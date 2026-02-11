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
