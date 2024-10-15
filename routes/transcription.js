const express = require("express");
const router = express.Router();
const {
  createTranscription,
  getTranscriptionByAudioId,
  verifyTranscription,
} = require("../controllers/transcriptionController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.post("/", auth, roleCheck(["transcriber"]), createTranscription);
router.get("/audio/:audioId", auth, getTranscriptionByAudioId);
router.put("/:id/verify", auth, roleCheck(["controller"]), verifyTranscription);

module.exports = router;
