const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    verificationCodeHash: {
      type: String,
      select: false,
      default: null,
    },
    verificationExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },
    verificationLastSentAt: {
      type: Date,
      select: false,
      default: null,
    },
    verificationAttempts: {
      type: Number,
      select: false,
      default: 0,
    },

    country: {
      type: String,
      default: "No especificado",
      trim: true,
    },
    university: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    career: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    subjects: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      default: "",
    },
    studyPreference: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },

    accountStatus: {
      type: String,
      enum: ["active", "banned"],
      default: "active",
    },
    consultasIA: {
      type: Number,
      default: 0,
    },
    inicioConsultasIA: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = model("User", userSchema);
