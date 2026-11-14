const { Schema, model } = require("mongoose");

const adminNotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = model("AdminNotification", adminNotificationSchema);
