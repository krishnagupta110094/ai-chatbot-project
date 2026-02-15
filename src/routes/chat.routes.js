const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { createChat, getChats, getAllMessageByChatId } = require("../controllers/chat.controller");

const router = express.Router()

/* POST /api/chat/ */
router.post('/',authUser,createChat);  
router.get("/",authUser,getChats)
router.get("/:chatId/messages",authUser,getAllMessageByChatId);

module.exports = router