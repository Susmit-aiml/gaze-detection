const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { analyzeImage } = require("../controllers/analyzeController");

const router = express.Router();

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    message: "Protected route accessed",
    user: req.user,
  });
});

router.get("/admin", protect, adminOnly, (req, res) => {
  res.status(200).json({
    message: "Welcome admin!",
    user: req.user,
  });
});

router.post("/analyze", protect, analyzeImage);

module.exports = router;
