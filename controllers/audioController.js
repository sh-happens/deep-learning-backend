const Audio = require("../models/Audio");

exports.getAllAudio = async (req, res) => {
  try {
    const audioFiles = await Audio.find();
    res.json(audioFiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getAudioById = async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) {
      return res.status(404).json({ msg: "Audio file not found" });
    }
    res.json(audio);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Audio file not found" });
    }
    res.status(500).send("Server Error");
  }
};

exports.createAudio = async (req, res) => {
  const { filename } = req.body;

  try {
    const newAudio = new Audio({ filename });
    const audio = await newAudio.save();
    res.json(audio);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updateAudioStatus = async (req, res) => {
  const { status, assignedTo } = req.body;

  try {
    let audio = await Audio.findById(req.params.id);
    if (!audio) {
      return res.status(404).json({ msg: "Audio file not found" });
    }

    audio.status = status || audio.status;
    audio.assignedTo = assignedTo || audio.assignedTo;

    await audio.save();
    res.json(audio);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Audio file not found" });
    }
    res.status(500).send("Server Error");
  }
};
