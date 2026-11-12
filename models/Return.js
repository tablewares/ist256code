
const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    orderNumber: {
        type: String,
        required: true
    },
    returnReason: {
        type: String,
        required: true,
        enum: ["damaged", "defective", "wrong-item", "unwanted", "other"]
    },
    productCondition: {
        type: String,
        required: true,
        enum: ["new", "opened", "used", "damaged"]
    }
}, { timestamps: true });

module.exports = mongoose.model("Return", returnSchema, "returns");
