const { Schema, model } = require("mongoose");

const directMessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "DirectConversation",
      required: true,
      index: true,
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

directMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = model("DirectMessage", directMessageSchema);
