const express = require("express");
const router = express.Router();
const {
  getAllAudio,
  getAudioById,
  createAudio,
  updateAudioStatus,
} = require("../controllers/audioController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.get("/", auth, getAllAudio);
router.get("/:id", auth, getAudioById);
router.post("/", auth, roleCheck(["admin"]), createAudio);
router.put("/:id/status", auth, roleCheck(["admin", "transcriber"]), updateAudioStatus);

module.exports = router;
