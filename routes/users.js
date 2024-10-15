import express from "express";
import { getAllUsers, getUserById } from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.get("/", auth, roleCheck(["admin"]), getAllUsers);
router.get("/:id", auth, roleCheck(["admin"]), getUserById);

export default router;
