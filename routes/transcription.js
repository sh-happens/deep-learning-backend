import express from "express";
import * as transcriptionController from "../controllers/transcriptionController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.put(
  "/transcriber/:audioId",
  [auth, roleCheck("transcriber")],
  transcriptionController.updateTranscriptionByTranscriber
);

router.put(
  "/controller/:audioId",
  [auth, roleCheck("controller")],
  transcriptionController.verifyTranscriptionByController
);

router.get("/audio/:audioId", auth, transcriptionController.getTranscriptionByAudioId);

router.get("/stats", [auth, roleCheck(["admin"])], transcriptionController.getTranscriptionStats);

router.get("/history/:audioId", auth, transcriptionController.getTranscriptionHistory);

router.get("/user-stats", auth, transcriptionController.getUserStats);

router.get("/controller-stats", auth, transcriptionController.getControllerStats);

export default router;
