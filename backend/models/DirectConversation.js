const mongoose = require("mongoose");

const directConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    pairKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

directConversationSchema.index({ participants: 1 });

module.exports = mongoose.model("DirectConversation", directConversationSchema);
