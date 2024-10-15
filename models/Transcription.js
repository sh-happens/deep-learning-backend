const mongoose = require("mongoose");

const TranscriptionSchema = new mongoose.Schema({
  audio: { type: mongoose.Schema.Types.ObjectId, ref: "Audio", required: true },
  text: { type: String, required: true },
  transcribedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isCorrect: { type: Boolean },
});

module.exports = mongoose.model("Transcription", TranscriptionSchema);
