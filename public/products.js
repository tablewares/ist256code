// Aidan: track form validation and display.
let tracks = [];

const trackForm = document.getElementById("trackForm");
const message = document.getElementById("message");

function validateField(id, error) {
    const field = document.getElementById(id);
    field.classList.remove("is-valid", "is-invalid");
    field.classList.add(error === "" ? "is-valid" : "is-invalid");
    document.getElementById(id + "Error").textContent = error;
    return error === "";
}
function loadTracks() {
    $.get('/api/tracks', function(data) {
        tracks = data;
        renderTracks(tracks);
    }).fail(function() {
        showMessage('Failed to load tracks from server.', 'danger');
    });
}

// Can also display a filtered list from the jQuery section.
function renderTracks(trackList = tracks) {
    const trackBody = document.getElementById("trackBody");
    trackBody.textContent = "";

    trackList.forEach(function(track) {
        const row = document.createElement("tr");
        const values = [track.trackId, track.title, track.category,
            track.format, track.price, track.info];

        values.forEach(function(value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        // Space for the jQuery section's edit controls.
        row.appendChild(document.createElement("td"));
        trackBody.appendChild(row);
    });

    document.getElementById("resultCount").textContent =
        trackList.length + " track(s) shown";
}

trackForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const trackId = document.getElementById("trackId").value.trim();
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const format = document.getElementById("format").value;
    const priceText = document.getElementById("price").value.trim();
    const price = Number(priceText);
    const info = document.getElementById("info").value.trim();
    let isValid = true;

    let idError = "";
    if (trackId === "") {
        idError = "Enter a track ID.";
    } else {
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].trackId.toLowerCase() === trackId.toLowerCase()) {
                idError = "This track ID is already in use.";
                break;
            }
        }
    }

    if (!validateField("trackId", idError)) isValid = false;
    if (!validateField("title", title === "" ? "Enter a title." : "")) isValid = false;
    if (!validateField("category", category === "" ? "Choose a genre." : "")) isValid = false;
    if (!validateField("format", format === "" ? "Choose a format." : "")) isValid = false;

    const priceError = priceText === "" || !Number.isFinite(price) || price < 0
        ? "Enter a valid price of 0 or more." : "";
    if (!validateField("price", priceError)) isValid = false;

    if (!isValid) {
        message.className = "alert alert-danger";
        message.textContent = "Please fix the highlighted fields.";
        return;
    }

    tracks.push({ trackId, title, category, format, price, info });
    renderTracks();
    trackForm.reset();
    trackForm.querySelectorAll(".is-valid, .is-invalid").forEach(function(field) {
        field.classList.remove("is-valid", "is-invalid");
    });

    message.className = "alert alert-success";
    message.textContent = "Track added successfully.";
});

renderTracks();
loadTracks();