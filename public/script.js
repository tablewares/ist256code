const form = document.getElementById("signupForm");
const successMessage = document.getElementById("successMessage");

form.addEventListener("submit", function(event) {

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

    if (phone.value !== "" && !phonePattern.test(phone.value)) {
        phone.classList.add("is-invalid");
        isValid = false;
    } else if (phone.value !== "") {
        phone.classList.remove("is-invalid");
        phone.classList.add("is-valid");
    }

    // Display result
    if (isValid) {
        successMessage.classList.remove("d-none");
    } else {
        successMessage.classList.add("d-none");
    }
});