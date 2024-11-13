document.getElementById("form").addEventListener('submit', function(event) {
    event.preventDefault();
    var resetKey = document.getElementById('token').value;
    var newPassword = document.getElementById('new-password').value;
    fetch("/reset-password", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_token: resetKey, new_password: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Your password has been reset successfully.');
            window.location.href = 'index.html'; // Redirect to login page
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred.');
    });
});

function show() {
    const passwordInput = document.getElementById("new-password")
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
    passwordInput.setAttribute('type', type)
    document.getElementById("show").textContent = type === 'password' ? 'Show' : 'Unshow'
}