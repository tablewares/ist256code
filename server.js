
require("dotenv").config();

const connectDB = require("./config/db");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Billing = require("./models/Billing");
const Shipping = require("./models/Shipping");
const Return = require("./models/Return");

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

const oneLine = (v) =>
    (v == null ? "" : String(v).trim().replace(/\s+/g, " "));

// Find a product by ID without case sensitivity
const findProductById = (id) => {
    const escapedId = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return Product.findOne({
        productId: new RegExp(`^${escapedId}$`, "i")
    });
};

// Validate and clean a product
const cleanProduct = (body) => {
    body = body || {};

    const str = (v) => (v == null ? "" : String(v).trim());

    const item = {
        productId: str(body.productId),
        description: str(body.description),
        category: str(body.category),
        unitOfMeasure: str(body.unitOfMeasure),
        price: typeof body.price === "number"
            ? body.price
            : parseFloat(body.price),
        weight: str(body.weight)
    };

    if (!/^[A-Za-z0-9-]{3,20}$/.test(item.productId)) {
        return { error: "Product ID must be 3–20 letters, numbers or dashes." };
    }

    if (!item.description) {
        return { error: "Description is required." };
    }

    if (!item.category) {
        return { error: "Category is required." };
    }

    if (!item.unitOfMeasure) {
        return { error: "Unit of measure is required." };
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
        return { error: "Price must be a number of 0 or more." };
    }

    item.price = Math.round(item.price * 100) / 100;

    return { item };
};

// --------------------------------------------------
// SIGNUP ENDPOINT
// --------------------------------------------------

app.post("/api/signup", (req, res) => {
    const userData = req.body;
    let existingData = [];

    const filePath = path.join(__dirname, "user_data.json");

    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf8");

        try {
            existingData = JSON.parse(fileContent);

            if (!Array.isArray(existingData)) {
                existingData = [existingData];
            }
        } catch (err) {
            existingData = [];
        }
    }

    existingData.push(userData);

    fs.writeFileSync(
        filePath,
        JSON.stringify(existingData, null, 2)
    );

    res.status(200).json({ message: "data saved" });
});

// --------------------------------------------------
// TRACKS ENDPOINTS
// --------------------------------------------------

const tracksFilePath = path.join(__dirname, "tracks.json");

// Read tracks from tracks.json
const getTracks = () => {
    if (!fs.existsSync(tracksFilePath)) return [];

    try {
        const fileContent = fs.readFileSync(tracksFilePath, "utf8");
        const data = JSON.parse(fileContent);

        return Array.isArray(data) ? data : [];
    } catch (err) {
        return [];
    }
};

// Get all tracks
app.get("/api/tracks", (req, res) => {
    const tracks = getTracks();

    res.status(200).json(tracks);
});

// --------------------------------------------------
// PRODUCTS ENDPOINTS - MONGODB CRUD
// --------------------------------------------------

// Get all products
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();

        res.status(200).json(products);
    } catch (error) {
        console.error("Error retrieving products:", error);

        res.status(500).json({
            message: "Failed to retrieve products."
        });
    }
});

// Get one product
app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await findProductById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: `Product ${req.params.id} not found.`
            });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error retrieving product:", error);

        res.status(500).json({
            message: "Failed to retrieve product."
        });
    }
});

// Add a product
app.post("/api/products", async (req, res) => {
    try {
        const { error, item } = cleanProduct(req.body);

        if (error) {
            return res.status(400).json({ message: error });
        }

        const existingProduct = await findProductById(item.productId);

        if (existingProduct) {
            return res.status(409).json({
                message: `Product ID ${item.productId} already exists.`
            });
        }

        const product = await Product.create(item);

        res.status(201).json(product);
    } catch (error) {
        console.error("Error adding product:", error);

        res.status(500).json({
            message: "Failed to add product."
        });
    }
});

// Update a product
app.put("/api/products/:id", async (req, res) => {
    try {
        const existingProduct = await findProductById(req.params.id);

        if (!existingProduct) {
            return res.status(404).json({
                message: `Product ${req.params.id} not found.`
            });
        }

        const { error, item } = cleanProduct({
            ...req.body,
            productId: existingProduct.productId
        });

        if (error) {
            return res.status(400).json({ message: error });
        }

        Object.assign(existingProduct, item);

        await existingProduct.save();

        res.status(200).json(existingProduct);
    } catch (error) {
        console.error("Error updating product:", error);

        res.status(500).json({
            message: "Failed to update product."
        });
    }
});

// Delete a product
app.delete("/api/products/:id", async (req, res) => {
    try {
        const product = await findProductById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: `Product ${req.params.id} not found.`
            });
        }

        await Product.findByIdAndDelete(product._id);

        res.status(200).json({ message: "deleted" });
    } catch (error) {
        console.error("Error deleting product:", error);

        res.status(500).json({
            message: "Failed to delete product."
        });
    }
});


// --------------------------------------------------
// SHOPPING CART ENDPOINTS - MONGODB CRUD
// --------------------------------------------------

// Validate cart items and calculate totals
const cleanCart = (items) => {
    if (!Array.isArray(items)) {
        return { error: "Cart items must be an array." };
    }

    const cleanedItems = [];

    for (const item of items) {
        const trackId = String(item.trackId || "").trim();
        const title = String(item.title || "").trim();
        const category = String(item.category || "").trim();
        const format = String(item.format || "").trim();
        const price = Number(item.price);
        const quantity = Number(item.quantity);

        if (!trackId || !title || !category || !format) {
            return { error: "Each cart item must include its track details." };
        }

        if (!Number.isFinite(price) || price < 0) {
            return { error: "Each cart item must have a valid price." };
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return { error: "Quantity must be a positive whole number." };
        }

        cleanedItems.push({
            trackId,
            title,
            category,
            format,
            price: Math.round(price * 100) / 100,
            info: String(item.info || ""),
            quantity
        });
    }

    const itemCount = cleanedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const total = Math.round(
        cleanedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        ) * 100
    ) / 100;

    return { items: cleanedItems, itemCount, total };
};

// Create a cart
app.post("/api/cart", async (req, res) => {
    try {
        const cartId = String(req.body.cartId || "").trim();
        const result = cleanCart(req.body.items);

        if (!cartId) {
            return res.status(400).json({
                message: "Cart ID is required."
            });
        }

        if (result.error) {
            return res.status(400).json({ message: result.error });
        }

        const existingCart = await Cart.findOne({ cartId });

        if (existingCart) {
            return res.status(409).json({
                message: "This cart already exists."
            });
        }

        const cart = await Cart.create({
            cartId,
            ...result
        });

        res.status(201).json(cart);
    } catch (error) {
        console.error("Error creating cart:", error);

        res.status(500).json({
            message: "Failed to create cart."
        });
    }
});

// Get a cart
app.get("/api/cart/:cartId", async (req, res) => {
    try {
        const cart = await Cart.findOne({
            cartId: req.params.cartId
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found."
            });
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error retrieving cart:", error);

        res.status(500).json({
            message: "Failed to retrieve cart."
        });
    }
});

// Update a cart
app.put("/api/cart/:cartId", async (req, res) => {
    try {
        const result = cleanCart(req.body.items);

        if (result.error) {
            return res.status(400).json({ message: result.error });
        }

        const cart = await Cart.findOne({
            cartId: req.params.cartId
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found."
            });
        }

        cart.items = result.items;
        cart.itemCount = result.itemCount;
        cart.total = result.total;

        await cart.save();

        res.status(200).json(cart);
    } catch (error) {
        console.error("Error updating cart:", error);

        res.status(500).json({
            message: "Failed to update cart."
        });
    }
});

// Delete a cart
app.delete("/api/cart/:cartId", async (req, res) => {
    try {
        const cart = await Cart.findOneAndDelete({
            cartId: req.params.cartId
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found."
            });
        }

        res.status(200).json({
            message: "Cart deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting cart:", error);

        res.status(500).json({
            message: "Failed to delete cart."
        });
    }
});


 // --------------------------------------------------
 // RETURNS ENDPOINT - MONGODB
 // --------------------------------------------------

 // Submit a return request
 app.post("/api/returns", async (req, res) => {
     try {
         const {
             productId,
             orderNumber,
             returnReason,
             productCondition
         } = req.body || {};

         if (!productId || !orderNumber || !returnReason || !productCondition) {
             return res.status(400).json({
                 success: false,
                 message: "All return fields are required."
             });
         }

         const validReasons = [
             "damaged",
             "defective",
             "wrong-item",
             "unwanted",
             "other"
         ];

         const validConditions = [
             "new",
             "opened",
             "used",
             "damaged"
         ];

         if (!validReasons.includes(returnReason)) {
             return res.status(400).json({
                 success: false,
                 message: "Invalid return reason."
             });
         }

         if (!validConditions.includes(productCondition)) {
             return res.status(400).json({
                 success: false,
                 message: "Invalid product condition."
             });
         }

         const returnRequest = await Return.create({
             productId: String(productId).trim(),
             orderNumber: String(orderNumber).trim(),
             returnReason,
             productCondition
         });

         res.status(201).json({
             success: true,
             message: "Return request successfully saved.",
             data: returnRequest
         });

     } catch (error) {
         console.error("Error saving return request:", error);

         res.status(500).json({
             success: false,
             message: "Failed to save return request."
         });
     }
 });

 // Get all return requests
 app.get("/api/returns", async (req, res) => {
     try {
         const returns = await Return.find();

         res.status(200).json(returns);
     } catch (error) {
         console.error("Error retrieving returns:", error);

         res.status(500).json({
             message: "Failed to retrieve return requests."
         });
     }
 });


// --------------------------------------------------
// MALFORMED JSON ERROR HANDLING
// --------------------------------------------------

app.use((err, req, res, next) => {
    if (err && err.type === "entity.parse.failed") {
        return res.status(400).json({
            message: "Invalid JSON."
        });
    }

    next(err);
});

// --------------------------------------------------
// EVENT REGISTRATION ENDPOINT
// --------------------------------------------------

const REGISTRATIONS_FILE = path.join(__dirname, "registrations.json");

const EVENT_NAME = "SoundWave Live";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REGISTRATION_CHOICES = {
    ticketType: ["general", "vip"],
    attendance: ["in-person", "virtual"],
    session: [
        "opening",
        "artist-panel",
        "live-music",
        "music-production"
    ],
    favoriteGenre: [
        "pop",
        "hip-hop",
        "rock",
        "country",
        "r-and-b",
        "alternative",
        "other"
    ]
};

// Validate registration information
const cleanRegistration = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
            errors: [{
                field: "body",
                message: "Send the registration as a JSON object."
            }]
        };
    }

    const errors = [];

    const fail = (field, message) => {
        errors.push({ field, message });
    };

    const fullName = oneLine(body.fullName);
    const email = oneLine(body.email).toLowerCase();

    if (!fullName) {
        fail("fullName", "Full name is required.");
    } else if (fullName.length > 100) {
        fail("fullName", "Full name must be 100 characters or fewer.");
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        fail("email", "A valid email address is required.");
    }

    const choice = {};

    const labels = {
        ticketType: "ticket type",
        attendance: "attendance type",
        session: "event session",
        favoriteGenre: "favorite genre"
    };

    Object.keys(REGISTRATION_CHOICES).forEach((key) => {
        choice[key] = oneLine(body[key]);

        if (!REGISTRATION_CHOICES[key].includes(choice[key])) {
            fail(key, `Choose a valid ${labels[key]}.`);
        }
    });

    const specialRequests = body.specialRequests == null
        ? ""
        : String(body.specialRequests)
            .replace(/\r\n?/g, "\n")
            .replace(/[ \t]+/g, " ")
            .trim();

    if (specialRequests.length > 500) {
        fail(
            "specialRequests",
            "Special requests must be 500 characters or fewer."
        );
    }

    if (errors.length) {
        return { errors };
    }

    return {
        doc: {
            registrationId:
                "REG-" + crypto.randomBytes(4).toString("hex").toUpperCase(),

            event: EVENT_NAME,

            registeredAt: new Date().toISOString(),

            contact: {
                fullName,
                email
            },

            options: {
                ticketType: choice.ticketType,
                attendanceType: choice.attendance,
                session: choice.session,
                favoriteGenre: choice.favoriteGenre,
                featuredTrack: null,
                specialRequests,
                receiveUpdates:
                    ["yes", "true", "on"].includes(
                        String(body.updates).toLowerCase()
                    ) || body.updates === true
            }
        }
    };
};

// Read existing registrations
const readRegistrations = () => {
    if (!fs.existsSync(REGISTRATIONS_FILE)) return [];

    const data = JSON.parse(
        fs.readFileSync(REGISTRATIONS_FILE, "utf8")
    );

    if (!Array.isArray(data)) {
        throw new Error("registrations.json is not a JSON array.");
    }

    return data;
};

// Write registrations
const writeRegistrations = (registrations) => {
    const tmp = REGISTRATIONS_FILE + ".tmp";

    fs.writeFileSync(
        tmp,
        JSON.stringify(registrations, null, 2)
    );

    fs.renameSync(tmp, REGISTRATIONS_FILE);
};

// Save event registration
app.post("/api/register", async (req, res) => {
    const { errors, doc } = cleanRegistration(req.body);

    if (errors) {
        return res.status(400).json({
            success: false,
            message: errors[0].message,
            errors
        });
    }

    // Look up featured track in MongoDB
    const trackId = oneLine(req.body.featuredTrack);

    if (trackId) {
        try {
            const product = await findProductById(trackId);

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "Choose a track from the catalog."
                });
            }

            doc.options.featuredTrack = {
                productId: String(product.productId),
                title: oneLine(product.description)
            };
        } catch (err) {
            console.error("Error finding featured track:", err);

            return res.status(500).json({
                success: false,
                message: "Could not verify the selected track."
            });
        }
    }

    try {
        const registrations = readRegistrations();

        registrations.push(doc);

        writeRegistrations(registrations);
    } catch (err) {
        console.error("Error saving registration:", err);

        return res.status(500).json({
            success: false,
            message: "The server could not save your registration. Please try again."
        });
    }

    res.status(201).json({
        success: true,
        message: "Registration successful!",
        data: doc
    });
});


// --------------------------------------------------
// BILLING ENDPOINT - MONGODB
// --------------------------------------------------

const SHIPPING_COST = 4.99;

// Determine card brand
const cardBrand = (number) => {
    if (/^4/.test(number)) return "visa";

    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) {
        return "mastercard";
    }

    if (/^3[47]/.test(number)) return "amex";

    if (/^(6011|65|64[4-9])/.test(number)) {
        return "discover";
    }

    return "unknown";
};

// Save billing and shipping information
app.post("/api/billing", async (req, res) => {
    try {
        const billingData = req.body || {};
        const items = Array.isArray(billingData.items)
            ? billingData.items
            : [];

        if (!items.length) {
            return res.status(400).json({
                success: false,
                message: "Add items to your cart before submitting billing."
            });
        }

        const requiredFields = [
            "fullName",
            "email",
            "address",
            "city",
            "state",
            "zipCode",
            "cardName"
        ];

        for (const field of requiredFields) {
            if (!String(billingData[field] || "").trim()) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required.`
                });
            }
        }

        const cardNumber = String(
            billingData.cardNumber || ""
        ).replace(/[ -]/g, "");

        if (!/^\d{13,19}$/.test(cardNumber)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid demo card number."
            });
        }

        const orderItems = items.map((item) => ({
            trackId: String(item.trackId),
            title: String(item.title),
            category: String(item.category),
            format: String(item.format),
            price: Number(item.price),
            quantity: Number(item.quantity)
        }));

        const validItems = orderItems.every((item) =>
            item.trackId &&
            item.title &&
            item.category &&
            item.format &&
            Number.isFinite(item.price) &&
            item.price >= 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );

        if (!validItems) {
            return res.status(400).json({
                success: false,
                message: "One or more cart items are invalid."
            });
        }

        const subtotal = Math.round(
            orderItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            ) * 100
        ) / 100;

        const total = Math.round(
            (subtotal + SHIPPING_COST) * 100
        ) / 100;

        // Save billing information without storing the full card number or security code
        const billing = await Billing.create({
            fullName: billingData.fullName.trim(),
            email: billingData.email.trim(),
            address: billingData.address.trim(),
            city: billingData.city.trim(),
            state: billingData.state.trim(),
            zipCode: billingData.zipCode.trim(),
            cardName: billingData.cardName.trim(),
            cardLastFour: cardNumber.slice(-4),
            cardBrand: cardBrand(cardNumber),
            items: orderItems,
            subtotal,
            shippingCost: SHIPPING_COST,
            total
        });

        // Use the billing document ID as the order number
        const orderNumber = billing._id.toString();

        // Create a separate shipping document using the billing address
        const shipping = await Shipping.create({
            orderNumber,
            fullName: billingData.fullName.trim(),
            email: billingData.email.trim(),
            address: billingData.address.trim(),
            city: billingData.city.trim(),
            state: billingData.state.trim(),
            zipCode: billingData.zipCode.trim()
        });

        res.status(201).json({
            success: true,
            message: "Billing details successfully saved.",
            orderNumber,
            data: billing,
            shipping
        });

    } catch (error) {
        console.error("Error saving billing information:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save billing information."
        });
    }
});


// --------------------------------------------------
// START SERVER AFTER DATABASE CONNECTION
// --------------------------------------------------

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
