import Transcription from "../models/Transcription.js";
import Audio from "../models/Audio.js";
import { ObjectId } from "mongodb"; // Add this import

export const updateTranscriptionByTranscriber = async (req, res) => {
  const { audioId, existingText, isUnsuitable, comments } = req.body;

  try {
    const session = await Transcription.startSession();
    session.startTransaction();

    try {
      const audio = await Audio.findOne({
        _id: audioId,
        assignedTo: req.user.id,
      }).session(session);

      if (!audio) {
        throw new Error("Audio not found or not assigned to you");
      }

      const transcription = await Transcription.findOneAndUpdate(
        { audio: audioId },
        {
          existingText,
          verifiedBy: req.user.id,
          transcriptionVerification: {
            isUnsuitable,
            verificationDate: new Date(),
            comments,
            textAtVerification: existingText,
          },
        },
        { new: true, upsert: true }
      );

      audio.status = isUnsuitable ? "unsuitable" : "transcriber_verified";
      await audio.save({ session });

      await session.commitTransaction();
      res.json(transcription);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message || "Server Error");
  }
};

export const verifyTranscriptionByController = async (req, res) => {
  const { isCorrect, isUnsuitable, comments } = req.body;

  try {
    const session = await Transcription.startSession();
    session.startTransaction();

    try {
      const transcription = await Transcription.findOne({
        audio: req.params.audioId,
        verifiedBy: { $ne: null },
        controlledBy: null,
      }).session(session);

      if (!transcription) {
        throw new Error("Transcription not found or already verified");
      }

      transcription.controlledBy = req.user.id;
      transcription.controllerVerification = {
        isCorrect,
        isUnsuitable,
        verificationDate: new Date(),
        comments,
      };
      await transcription.save({ session });

      const audio = await Audio.findById(transcription.audio).session(session);
      if (!audio) {
        throw new Error("Associated audio not found");
      }

      audio.status = isUnsuitable ? "unsuitable" : "controller_verified";
      await audio.save({ session });

      await session.commitTransaction();
      res.json(transcription);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message || "Server Error");
  }
};

export const getTranscriptionByAudioId = async (req, res) => {
  try {
    const transcription = await Transcription.findOne({ audio: req.params.audioId })
      .populate("audio")
      .populate("verifiedBy", "name role")
      .populate("controlledBy", "name role");

    if (!transcription) {
      return res.status(404).json({ msg: "Transcription not found" });
    }

    res.json(transcription);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Invalid audio ID format" });
    }
    res.status(500).send("Server Error");
  }
};

export const getTranscriptionStats = async (req, res) => {
  try {
    const stats = await Transcription.aggregate([
      {
        $facet: {
          byTranscriber: [
            {
              $lookup: {
                from: "users",
                localField: "verifiedBy",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: "$user",
            },
            {
              $match: {
                "user.role": "transcriber",
              },
            },
            {
              $group: {
                _id: "$verifiedBy",
                name: { $first: "$user.username" },
                role: { $first: "$user.role" },
                totalCount: { $sum: 1 },
                suitableCount: {
                  $sum: {
                    $cond: [{ $eq: ["$transcriptionVerification.isUnsuitable", false] }, 1, 0],
                  },
                },
                unsuitable: {
                  $sum: {
                    $cond: [{ $eq: ["$transcriptionVerification.isUnsuitable", true] }, 1, 0],
                  },
                },
                correctTranscriptions: {
                  $sum: {
                    $cond: [{ $eq: ["$controllerVerification.isCorrect", true] }, 1, 0],
                  },
                },
                incorrectTranscriptions: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$controllerVerification.isCorrect", false] },
                          { $eq: ["$controllerVerification.isUnsuitable", false] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                id: "$_id",
                name: 1,
                role: 1,
                totalTasks: "$totalCount",
                correctTranscriptions: 1,
                incorrectTranscriptions: 1,
                unsuitable: 1,
                suitableCount: 1,
              },
            },
          ],
          byController: [
            {
              $match: {
                controlledBy: { $ne: null },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "controlledBy",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: "$user",
            },
            {
              $match: {
                "user.role": "controller",
              },
            },
            {
              $group: {
                _id: "$controlledBy",
                name: { $first: "$user.username" },
                role: { $first: "$user.role" },
                totalCount: { $sum: 1 },
                correctCount: {
                  $sum: {
                    $cond: [{ $eq: ["$controllerVerification.isCorrect", true] }, 1, 0],
                  },
                },
                unsuitable: {
                  $sum: {
                    $cond: [{ $eq: ["$controllerVerification.isUnsuitable", true] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                id: "$_id",
                name: 1,
                role: 1,
                totalTasks: "$totalCount",
                correctTranscriptions: "$correctCount",
                incorrectTranscriptions: {
                  $subtract: ["$totalCount", { $add: ["$correctCount", "$unsuitable"] }],
                },
                unsuitable: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          users: {
            $concatArrays: ["$byTranscriber", "$byController"],
          },
        },
      },
    ]);

    res.json(stats[0].users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getTranscriptionHistory = async (req, res) => {
  try {
    const transcription = await Transcription.findOne({ audio: req.params.audioId })
      .populate("verifiedBy", "name role")
      .populate("controlledBy", "name role")
      .select("transcriptionVerification controllerVerification");

    if (!transcription) {
      return res.status(404).json({ msg: "No history found" });
    }

    const history = [];

    if (transcription.transcriptionVerification?.verificationDate) {
      history.push({
        date: transcription.transcriptionVerification.verificationDate,
        text: transcription.transcriptionVerification.textAtVerification,
      });
    }

    if (transcription.controllerVerification?.verificationDate) {
      history.push({
        date: transcription.controllerVerification.verificationDate,
        text: transcription.controllerVerification.textAtControl,
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Transcription.aggregate([
      {
        $match: {
          verifiedBy: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "audios",
          localField: "audio",
          foreignField: "_id",
          as: "audioData",
        },
      },
      {
        $group: {
          _id: "$verifiedBy",
          totalProcessed: { $sum: 1 },
          correctTranscriptions: {
            $sum: {
              $cond: [{ $eq: ["$controllerVerification.isCorrect", true] }, 1, 0],
            },
          },
          incorrectTranscriptions: {
            $sum: {
              $cond: [{ $eq: ["$controllerVerification.isCorrect", false] }, 1, 0],
            },
          },
          totalHours: {
            $sum: {
              $divide: [{ $arrayElemAt: ["$audioData.duration", 0] }, 3600],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProcessed: 1,
          correctTranscriptions: 1,
          incorrectTranscriptions: 1,
          totalHours: { $round: ["$totalHours", 0] },
        },
      },
    ]);

    if (stats.length === 0) {
      return res.json({
        totalProcessed: 0,
        correctTranscriptions: 0,
        incorrectTranscriptions: 0,
        totalHours: 0,
      });
    }

    res.json(stats[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getControllerStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Transcription.aggregate([
      {
        $match: {
          controlledBy: new ObjectId(userId),
        },
      },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalProcessed: { $sum: 1 },
              },
            },
          ],
          todayStats: [
            {
              $match: {
                "controllerVerification.verificationDate": {
                  $gte: today,
                },
              },
            },
            {
              $group: {
                _id: null,
                processedToday: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = {
      totalProcessed: stats[0]?.totalStats[0]?.totalProcessed || 0,
      processedToday: stats[0]?.todayStats[0]?.processedToday || 0,
    };

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
