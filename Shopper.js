const mongoose = require("mongoose");

const shopperSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      required: true,
      min: 1
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    schoolOrOrganization: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    favoriteMusicGenre: {
      type: String,
      enum: [
        "Pop",
        "Hip-Hop",
        "Rock",
        "Country",
        "R&B",
        "Alternative",
        "Other"
      ],
      default: "Other"
    }
  },
  {
    timestamps: true
  }
);

const Shopper = mongoose.model("Shopper", shopperSchema, "shopper");

module.exports = Shopper;
