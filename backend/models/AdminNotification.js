const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
