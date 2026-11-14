const { Schema, model } = require("mongoose");

const studyRoomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    maxParticipants: { type: Number, required: true, min: 2, max: 999 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "StudyGroup",
      default: null,
    },
    isPublic: { type: Boolean, default: true },
    status: { type: String, enum: ["live", "closed"], default: "live" },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

studyRoomSchema.index({ isPublic: 1, status: 1, createdAt: -1 });
studyRoomSchema.index(
  { group: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { group: { $type: "objectId" }, status: "live" },
  },
);

module.exports = model("StudyRoom", studyRoomSchema);
