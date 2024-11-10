let form = document.getElementById("form")
form.addEventListener("submit", (event) => {
    event.preventDefault()

})

let token_input = document.getElementById("token")
let new_pass = document.getElementById("new-password")
let error_log = document.getElementById("error-log")

function validate_form() {
    var valid = true
    if (token_input.value.length < 32) {
        var li = document.createElement("li")
        li.textContent = "Must include a token"
        error_log.appendChild(li)
        valid = false
    }
    if (new_pass.value.length < 8) {
        var li = document.createElement("li")
        li.textContent = "Password must at least be 8 characters"
        error_log.appendChild(li)
        valid = false
    }
    if (!(/[A-Z]/.test(new_pass.value))) {
        var li = document.createElement("li")
        li.textContent = "Password must have at least 1 Uppercase Letter. "
        error_log.appendChild(li)
        valid = false
    }
    if (!(/[0-9]/.test(new_pass.value))) {
        var li = document.createElement("li")
        li.textContent = "Password must have at least 1 number. "
        error_log.appendChild(li)
        valid = false
    }
    if (!(new_pass.value === confirm_password.value)) {
        var li = document.createElement("li")
        li.textContent = "Confirm Password must match Password. "
        error_log.appendChild(li)
        valid = false
    }
    return valid
}