const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["leader", "moderator", "member"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const studyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    modality: {
      type: String,
      enum: ["En línea", "Presencial", "Ambas"],
      default: "En línea",
    },
    maxMembers: { type: Number, required: true, min: 2, max: 999 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

studyGroupSchema.index({ createdAt: -1 });
studyGroupSchema.index({ "members.user": 1 });

module.exports = mongoose.model("StudyGroup", studyGroupSchema);
