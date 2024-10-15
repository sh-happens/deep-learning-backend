import express from "express";
import {
  getAllAudio,
  getAudioById,
  createAudio,
  updateAudioStatus,
} from "../controllers/audioController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.get("/", auth, getAllAudio);
router.get("/:id", auth, getAudioById);
router.post("/", auth, roleCheck(["admin"]), createAudio);
router.put("/:id/status", auth, roleCheck(["admin", "transcriber"]), updateAudioStatus);

export default router;
