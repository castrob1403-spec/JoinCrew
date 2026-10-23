const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectConversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

directMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
