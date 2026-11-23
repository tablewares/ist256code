const form = document.getElementById("signupForm");
const successMessage = document.getElementById("successMessage");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    let isValid = true;

    const name = document.getElementById("name");
    const age = document.getElementById("age");
    const email = document.getElementById("email");
    const affiliation = document.getElementById("affiliation");
    const phone = document.getElementById("phone");

    // Name validation
    if (name.value.trim() === "") {
        name.classList.add("is-invalid");
        isValid = false;
    } else {
        name.classList.remove("is-invalid");
        name.classList.add("is-valid");
    }

    // Age validation
    const ageValue = Number(age.value);

    if (age.value === "" || ageValue < 13 || ageValue > 120) {
        age.classList.add("is-invalid");
        isValid = false;
    } else {
        age.classList.remove("is-invalid");
        age.classList.add("is-valid");
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.value)) {
        email.classList.add("is-invalid");
        isValid = false;
    } else {
        email.classList.remove("is-invalid");
        email.classList.add("is-valid");
    }

    // Affiliation validation
    if (affiliation.value.trim() === "") {
        affiliation.classList.add("is-invalid");
        isValid = false;
    } else {
        affiliation.classList.remove("is-invalid");
        affiliation.classList.add("is-valid");
    }

    // Optional phone validation
    const phonePattern = /^[0-9()+\-\s]{7,20}$/;

    if (phone.value.trim() !== "" && !phonePattern.test(phone.value)) {
        phone.classList.add("is-invalid");
        isValid = false;
    } else if (phone.value.trim() !== "") {
        phone.classList.remove("is-invalid");
        phone.classList.add("is-valid");
    } else {
        phone.classList.remove("is-invalid");
    }

    // Stop if validation fails
    if (!isValid) {
        successMessage.classList.add("d-none");
        return;
    }

    // Collect signup information
    const userData = {
        fullName: name.value.trim(),
        age: ageValue,
        email: email.value.trim(),
        schoolOrOrganization: affiliation.value.trim(),
        phoneNumber: phone.value.trim(),
        favoriteMusicGenre: document.getElementById("genre").value
    };

    // Send signup information to MongoDB through the API
    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });
        
        const responseText = await response.text();

let result = {};

if (responseText) {
    try {
        result = JSON.parse(responseText);
    } catch (error) {
        throw new Error("The server returned an invalid response.");
    }
}

if (!response.ok) {
    throw new Error(result.message || "Signup failed.");
}

if (!result.success) {
    throw new Error(result.message || "Signup was unsuccessful.");
}

        successMessage.textContent = result.message;
        successMessage.classList.remove("d-none");

        form.reset();

        // Remove validation styling after successful signup
        form.querySelectorAll(".is-valid").forEach(function(field) {
            field.classList.remove("is-valid");
        });

    } catch (error) {
        successMessage.textContent = error.message;
        successMessage.classList.remove("d-none");
    }
});
