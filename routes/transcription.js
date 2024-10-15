import express from "express";
import {
  createTranscription,
  getTranscriptionByAudioId,
  verifyTranscription,
} from "../controllers/transcriptionController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.post("/", auth, roleCheck(["transcriber"]), createTranscription);
router.get("/audio/:audioId", auth, getTranscriptionByAudioId);
router.put("/:id/verify", auth, roleCheck(["controller"]), verifyTranscription);

export default router;
