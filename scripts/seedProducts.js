
require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");

const seedProducts = async () => {
    try {
        // Connect to the SoundWave database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        // Read the existing products.json file
        const filePath = path.join(__dirname, "../products.json");
        const products = JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

        // Insert new products or update existing ones
        const operations = products.map((product) => ({
            updateOne: {
                filter: { productId: product.productId },
                update: { $set: product },
                upsert: true
            }
        }));

        const result = await Product.bulkWrite(operations);

        console.log("Product migration completed!");
        console.log(`Products in JSON file: ${products.length}`);
        console.log(`New products added: ${result.upsertedCount}`);
        console.log(`Existing products updated: ${result.modifiedCount}`);

    } catch (error) {
        console.error("Product migration failed:", error.message);
    } finally {
        await mongoose.connection.close();
    }
};

seedProducts();
