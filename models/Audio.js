import { Schema, model } from "mongoose";

const AudioSchema = new Schema({
  filename: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "verified", "unsuitable"],
    default: "not_started",
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
});

export default model("Audio", AudioSchema);
