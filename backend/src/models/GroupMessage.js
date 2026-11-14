const { Schema, model } = require("mongoose");

const groupMessageSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

groupMessageSchema.index({ group: 1, createdAt: 1 });

module.exports = model("GroupMessage", groupMessageSchema);
