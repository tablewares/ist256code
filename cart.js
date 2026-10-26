
 // Aidan: cart behavior and validation.
 // Adam's search buttons can call addToCart(track) or addToCart(track, quantity).
 // Track fields: trackId, title, category, format, price, info (optional).

const cart = [];

function showCartMessage(text, type) {
    const message = document.getElementById("message");
    message.className = "alert alert-" + type;
    message.textContent = text;
}

function validQuantity(quantity) {
    const number = Number(quantity);
    return Number.isInteger(number) && number > 0;
}

function validateCartTrack(track) {
    if (!track) return "Please select a track.";

    const requiredFields = ["trackId", "title", "category", "format"];

    for (let i = 0; i < requiredFields.length; i++) {
        const value = track[requiredFields[i]];
        if (typeof value !== "string" || value.trim() === "") {
            return "The track needs an ID, title, genre, and format.";
        }
    }

    if (
        (typeof track.price !== "number" && typeof track.price !== "string") ||
        String(track.price).trim() === "" ||
        !Number.isFinite(Number(track.price)) ||
        Number(track.price) < 0
    ) {
        return "This track needs a numeric price of 0 or more before it can be added.";
    }

    return "";
}

function addToCart(track, quantity = 1) {
    const error = validateCartTrack(track);

    if (error !== "") {
        showCartMessage(error, "danger");
        return false;
    }

    if (!validQuantity(quantity)) {
        showCartMessage("Enter a whole-number quantity of 1 or more.", "danger");
        return false;
    }

    const trackId = track.trackId.trim();

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].trackId.toLowerCase() === trackId.toLowerCase()) {
            cart[i].quantity += Number(quantity);
            renderCart();
            showCartMessage("Track quantity increased.", "success");
            return true;
        }
    }

    cart.push({
        trackId: trackId,
        title: track.title.trim(),
        category: track.category.trim(),
        format: track.format.trim(),
        price: Math.round(Number(track.price) * 100) / 100,
        info: track.info || "",
        quantity: Number(quantity)
    });

    renderCart();
    showCartMessage("Track added to your cart.", "success");
    return true;
}

function removeFromCart(trackId) {
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].trackId === trackId) {
            cart.splice(i, 1);
            renderCart();
            showCartMessage("Track removed from your cart.", "success");
            return;
        }
    }
}

function updateCartQuantity(trackId, quantity) {
    if (!validQuantity(quantity)) {
        showCartMessage(
            "Enter a whole-number quantity of 1 or more. Use Remove to delete a track.",
            "danger"
        );
        return false;
    }

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].trackId === trackId) {
            cart[i].quantity = Number(quantity);
            renderCart();
            showCartMessage("Quantity updated.", "success");
            return true;
        }
    }

    return false;
}

function renderCart() {
    const cartBody = document.getElementById("cartBody");
    cartBody.textContent = "";

    let totalCents = 0;

    if (cart.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "Your cart is empty.";

        row.appendChild(cell);
        cartBody.appendChild(row);
    }

    cart.forEach(function(item) {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        titleCell.textContent = item.title + " (" + item.format + ")";
        row.appendChild(titleCell);

        const quantityCell = document.createElement("td");
        const input = document.createElement("input");

        input.type = "number";
        input.min = "1";
        input.step = "1";
        input.value = item.quantity;

        // Required for the jQuery update handler in cart.jquery.js.
        input.className = "form-control qty-input";
        input.setAttribute("data-track-id", item.trackId);
        input.setAttribute("aria-label", "Quantity for " + item.title);

        quantityCell.appendChild(input);
        row.appendChild(quantityCell);

        const lineCents = Math.round(item.price * 100) * item.quantity;
        totalCents += lineCents;

        const priceCell = document.createElement("td");
        priceCell.textContent =
            "$" + (lineCents / 100).toFixed(2) +
            " ($" + item.price.toFixed(2) + " each)";

        row.appendChild(priceCell);

        const buttonCell = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn btn-outline-danger btn-sm remove-btn";
        button.textContent = "Remove";
        button.setAttribute("data-track-id", item.trackId);

        buttonCell.appendChild(button);
        row.appendChild(buttonCell);
        cartBody.appendChild(row);
    });

    document.getElementById("cartTotal").textContent =
        "$" + (totalCents / 100).toFixed(2);
}

function getCartItems() {
    const items = [];

    cart.forEach(function(item) {
        items.push({
            trackId: item.trackId,
            title: item.title,
            category: item.category,
            format: item.format,
            price: item.price,
            info: item.info,
            quantity: item.quantity
        });
    });

    return items;
}

document.getElementById("clearCartBtn").addEventListener("click", function() {
    cart.length = 0;
    renderCart();
    showCartMessage("Cart cleared.", "success");
});

renderCart();
