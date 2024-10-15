import Transcription from "../models/Transcription.js";
import Audio from "../models/Audio.js";

export const createTranscription = async (req, res) => {
  const { audioId, text } = req.body;

  try {
    const audio = await Audio.findById(audioId);
    if (!audio) {
      return res.status(404).json({ msg: "Audio file not found" });
    }

    const newTranscription = new Transcription({
      audio: audioId,
      text,
      transcribedBy: req.user.id,
    });

    const transcription = await newTranscription.save();

    audio.status = "completed";
    await audio.save();

    res.json(transcription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getTranscriptionByAudioId = async (req, res) => {
  try {
    const transcription = await Transcription.findOne({ audio: req.params.audioId });
    if (!transcription) {
      return res.status(404).json({ msg: "Transcription not found" });
    }
    res.json(transcription);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Transcription not found" });
    }
    res.status(500).send("Server Error");
  }
};

export const verifyTranscription = async (req, res) => {
  const { isCorrect } = req.body;

  try {
    let transcription = await Transcription.findById(req.params.id);
    if (!transcription) {
      return res.status(404).json({ msg: "Transcription not found" });
    }

    transcription.isCorrect = isCorrect;
    transcription.verifiedBy = req.user.id;

    await transcription.save();

    const audio = await Audio.findById(transcription.audio);
    audio.status = "verified";
    await audio.save();

    res.json(transcription);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Transcription not found" });
    }
    res.status(500).send("Server Error");
  }
};
