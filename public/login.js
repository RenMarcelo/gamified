let toggle_button = document.getElementById("togglePassword")
toggle_button.addEventListener("click", () => {
    const passwordInput = document.getElementById("password")
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
    passwordInput.setAttribute('type', type)
    toggle_button.textContent = type === 'password' ? '👁' : '🙈'
})

document.getElementById('form').addEventListener("submit", (event) => {
    event.preventDefault()
    
    var inp_email = document.getElementById("username").value
    var inp_password = document.getElementById("password").value
    console.log(inp_email + ' ' + inp_password)
    fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: inp_email, password: inp_password}),
        credentials: 'include'
    }).then(response => {
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.message || "Login Failed WOMP WOMP")
            }
            return data;
        })
    }).then(data => {
        if (!data.success) {
            alert(data.message)
        } else {
            if (data.role === "admin") {
                window.location.href = "admin_dash.html"
            } else {
                window.location.href = "dashboard.html"
            }
        }
    })
})