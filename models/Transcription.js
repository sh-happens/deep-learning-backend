import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TranscriptionSchema = new Schema({
  audio: { type: Schema.Types.ObjectId, ref: "Audio", required: true },
  text: { type: String, required: true },
  transcribedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  isCorrect: { type: Boolean },
});

export default model("Transcription", TranscriptionSchema);
