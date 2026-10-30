// Aidan: finalization form validation and feedback.
let finalizationValidationStarted = false;

function setFinalizationFieldState(field, valid) {
    field.classList.remove("is-valid", "is-invalid");
    if (valid) {
        field.classList.add("is-valid");
        field.setAttribute("aria-invalid", "false");
    } else {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");
    }
}

function validateFinalizationForm() {
    finalizationValidationStarted = true;

    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const ticketType = document.getElementById("ticketType");
    const session = document.getElementById("session");
    const favoriteGenre = document.getElementById("favoriteGenre");
    const inPerson = document.getElementById("inPerson");
    const virtual = document.getElementById("virtual");
    const attendanceFeedback = document.getElementById("attendanceFeedback");
    const message = document.getElementById("formMessage");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const fields = [fullName, email, ticketType, inPerson, virtual, session, favoriteGenre];
    const attendanceValid = inPerson.checked || virtual.checked;
    const validFields = [
        fullName.value.trim() !== "",
        emailPattern.test(email.value.trim()) && email.validity.valid,
        ticketType.value !== "" && ticketType.validity.valid,
        attendanceValid,
        attendanceValid,
        session.value !== "" && session.validity.valid,
        favoriteGenre.value !== "" && favoriteGenre.validity.valid
    ];

    let isValid = true;

    for (let i = 0; i < fields.length; i++) {
        setFinalizationFieldState(fields[i], validFields[i]);
        if (!validFields[i]) {
            isValid = false;
        }
    }

    if (attendanceValid) {
        attendanceFeedback.classList.remove("d-block");
    } else {
        attendanceFeedback.classList.add("d-block");
    }

    if (isValid) {
        message.className = "alert alert-success";
        message.textContent = "Your details are valid and ready to submit. Registration has not been confirmed.";
    } else {
        message.className = "alert alert-danger";
        message.textContent = "Please correct the highlighted fields.";
    }

    return isValid;
}

const finalizationForm = document.getElementById("eventRegistrationForm");

if (finalizationForm) {
    finalizationForm.addEventListener("submit", function(event) {
        // Keep the page open for validation. No data is sent by this file.
        // The submission teammate should replace this handler with their flow,
        // calling validateFinalizationForm() before collecting or sending data.
        event.preventDefault();
        if (!validateFinalizationForm()) {
            const invalidFields = finalizationForm.getElementsByClassName("is-invalid");
            invalidFields[0].focus();
        }
    });

    function recheckFinalizationForm() {
        if (finalizationValidationStarted) {
            validateFinalizationForm();
        }
    }

    finalizationForm.addEventListener("input", recheckFinalizationForm);
    finalizationForm.addEventListener("change", recheckFinalizationForm);
}
