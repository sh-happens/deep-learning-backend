import express from "express";
import * as audioController from "../controllers/audioController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.get("/", auth, audioController.getAllAudio);
router.get("/stats", auth, audioController.getAudioStats);
router.get("/work-report", auth, roleCheck(["admin"]), audioController.getWorkReport);
router.get("/:id", auth, audioController.getAudioById);
router.put("/:id/assign", auth, audioController.assignAudio);
router.put("/:id/transcriber", auth, audioController.updateAudioByTranscriber);
router.put("/:id/controller", auth, audioController.updateAudioByController);

export default router;
