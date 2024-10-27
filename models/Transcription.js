import { Schema, model } from "mongoose";

const TranscriptionSchema = new Schema({
  audio: { type: Schema.Types.ObjectId, ref: "Audio", required: true },
  existingText: { type: String, required: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  transcriptionVerification: {
    isUnsuitable: { type: Boolean },
    verificationDate: { type: Date },
    comments: { type: String },
    textAtVerification: { type: String },
  },
  controlledBy: { type: Schema.Types.ObjectId, ref: "User" },
  controllerVerification: {
    isCorrect: { type: Boolean },
    isUnsuitable: { type: Boolean },
    verificationDate: { type: Date },
    comments: { type: String },
    textAtControl: { type: String },
  },
});

export default model("Transcription", TranscriptionSchema);
