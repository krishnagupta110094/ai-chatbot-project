const express = require("express");
const { registerUser, loginUser,logoutUser } = require("../controllers/auth.controller");
const { authUser } = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authUser, logoutUser);

router.get("/me", authUser, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
