
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    unitOfMeasure: {
        type: String,
        required: true
    },
    price: {
        type: String,
        required: true
    },
    weight: {
        type: String
    }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
