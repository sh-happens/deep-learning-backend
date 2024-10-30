import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import audioRoutes from "./routes/audio.js";
import transcriptionRoutes from "./routes/transcription.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();

connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://deep-learning-front-e4yql1944-yerbol-kosbayevs-projects.vercel.app",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/transcriptions", transcriptionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
