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
    const form = finalizationForm;
    finalizationForm.addEventListener("submit", function(event) {

        event.preventDefault();
        event.stopPropagation();

        // check Bootstrap validity
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        form.classList.add('was-validated');

        // gather form data into an object
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            ticketType: document.getElementById('ticketType').value,
            attendance: document.querySelector('input[name="attendance"]:checked')?.value || '',
            session: document.getElementById('session').value,
            favoriteGenre: document.getElementById('favoriteGenre').value,
            specialRequests: document.getElementById('specialRequests').value.trim(),
            updates: document.getElementById('updates').checked ? 'yes' : 'no'
        };

        try {
            const response =  fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            }).then(response => {
                const result =  response.json();
                
            });
        } catch (error) {
            console.error('Submission error:', error);
            formMessage.className = 'alert alert-danger';
            formMessage.textContent = 'Something went wrong :(.';
            formMessage.classList.remove('d-none');
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

function submitListener(){
    const form = finalizationForm
    const formMessage = document.getElementById('formMessage');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        // check Bootstrap validity
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        form.classList.add('was-validated');

        // gather form data into an object
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            ticketType: document.getElementById('ticketType').value,
            attendance: document.querySelector('input[name="attendance"]:checked')?.value || '',
            session: document.getElementById('session').value,
            favoriteGenre: document.getElementById('favoriteGenre').value,
            specialRequests: document.getElementById('specialRequests').value.trim(),
            updates: document.getElementById('updates').checked ? 'yes' : 'no'
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                formMessage.className = 'alert alert-success';
                formMessage.textContent = result.message || 'Registration submitted successfully!';
                formMessage.classList.remove('d-none');
                
                form.reset();
                form.classList.remove('was-validated');
            } else {
                throw new Error(result.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            formMessage.className = 'alert alert-danger';
            formMessage.textContent = 'Failed to submit registration. Please make sure the server is running.';
            formMessage.classList.remove('d-none');
        }
    });
}

submitListener();