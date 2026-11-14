const { Schema, model } = require("mongoose");

const contactMessageSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["new", "read", "resolved"], default: "new" },
    adminReply: { type: String, trim: true, maxlength: 2000, default: "" },
    repliedAt: { type: Date, default: null },
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = model("ContactMessage", contactMessageSchema);
