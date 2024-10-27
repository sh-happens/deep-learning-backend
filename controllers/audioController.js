import Audio from "../models/Audio.js";
import Transcription from "../models/Transcription.js";

export const getAllAudio = async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const audioFiles = await Audio.find(filter)
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    res.json(audioFiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getAudioById = async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id).populate("assignedTo", "name");

    if (!audio) {
      return res.status(404).json({ msg: "Audio file not found" });
    }

    const transcription = await Transcription.findOne({ audio: req.params.id })
      .populate("verifiedBy", "name")
      .populate("controlledBy", "name");

    if (req.user.role === "transcriber") {
      if (audio.assignedTo?._id.toString() !== req.user.id) {
        return res.status(403).json({ msg: "Not authorized" });
      }
    } else if (req.user.role === "controller") {
      if (audio.status !== "transcriber_verified") {
        return res.status(403).json({ msg: "Audio not ready for controller verification" });
      }
    }

    res.json({ audio, transcription });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Audio file not found" });
    }
    res.status(500).send("Server Error");
  }
};

export const assignAudio = async (req, res) => {
  try {
    const audio = await Audio.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "not_started",
        assignedTo: null,
      },
      {
        assignedTo: req.user.id,
        status: "in_progress",
      },
      { new: true }
    ).populate("assignedTo", "name");

    if (!audio) {
      return res.status(400).json({
        msg: "Audio file not available for assignment",
      });
    }

    res.json(audio);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const updateAudioByTranscriber = async (req, res) => {
  const { isUnsuitable, text } = req.body;

  try {
    const session = await Audio.startSession();
    session.startTransaction();

    try {
      const audio = await Audio.findOneAndUpdate(
        {
          _id: req.params.id,
          assignedTo: req.user.id,
        },
        {
          status: isUnsuitable ? "unsuitable" : "transcriber_verified",
        },
        { new: true, session }
      );

      if (!audio) {
        throw new Error("Audio not found or not authorized");
      }

      await Transcription.findOneAndUpdate(
        { audio: req.params.id },
        {
          existingText: text,
          verifiedBy: req.user.id,
          transcriptionVerification: {
            isUnsuitable,
            verificationDate: new Date(),
          },
        },
        { upsert: true, new: true, session }
      );

      await session.commitTransaction();
      res.json(audio);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message || "Server Error");
  }
};

export const updateAudioByController = async (req, res) => {
  const { isCorrect, isUnsuitable, comments } = req.body;

  try {
    const session = await Audio.startSession();
    session.startTransaction();

    try {
      const audio = await Audio.findOne({
        _id: req.params.id,
        status: "transcriber_verified",
      }).session(session);

      if (!audio) {
        throw new Error("Audio not found or not ready for verification");
      }

      audio.status = isUnsuitable ? "unsuitable" : "controller_verified";
      await audio.save({ session });

      const transcription = await Transcription.findOneAndUpdate(
        { audio: req.params.id },
        {
          controlledBy: req.user.id,
          controllerVerification: {
            isCorrect,
            isUnsuitable,
            verificationDate: new Date(),
            comments,
            textAtControl: transcription.existingText,
          },
        },
        { session, new: true }
      );

      if (!transcription) {
        throw new Error("Transcription not found");
      }

      await session.commitTransaction();
      res.json({ audio, transcription });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getAudioStats = async (req, res) => {
  try {
    const stats = await Audio.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getWorkReport = async (req, res) => {
  try {
    const report = await Audio.aggregate([
      {
        $lookup: {
          from: "transcriptions",
          localField: "_id",
          foreignField: "audio",
          as: "transcriptionData",
        },
      },
      {
        $unwind: {
          path: "$transcriptionData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "transcriptionData.verifiedBy",
          foreignField: "_id",
          as: "transcriber",
        },
      },
      {
        $unwind: {
          path: "$transcriber",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "transcriptionData.controlledBy",
          foreignField: "_id",
          as: "controller",
        },
      },
      {
        $unwind: {
          path: "$controller",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          date: "$transcriptionData.transcriptionVerification.verificationDate",
          transcription: "$transcriptionData.existingText",
          audioFile: "$filename",
          user: "$transcriber.username",
          control: {
            $cond: {
              if: { $eq: ["$transcriptionData.controllerVerification.isCorrect", true] },
              then: "Верно",
              else: {
                $cond: {
                  if: { $eq: ["$transcriptionData.controllerVerification.isUnsuitable", true] },
                  then: "Негодно",
                  else: "Неверно",
                },
              },
            },
          },
          controller: "$controller.username",
          status: 1,
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    res.json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
