const { Schema, model } = require("mongoose");

const directConversationSchema = new Schema(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ],
    pairKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

directConversationSchema.index({ participants: 1 });

module.exports = model("DirectConversation", directConversationSchema);
