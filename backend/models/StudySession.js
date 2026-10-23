const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    startsAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

studySessionSchema.index({ owner: 1, startsAt: 1 });

module.exports = mongoose.model("StudySession", studySessionSchema);
