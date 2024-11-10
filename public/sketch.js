let email
let saved = false
document.addEventListener("DOMContentLoaded", () => {
    load_data()
})

async function load_data() {
    try {
        const response = await fetch("/get_score", {
            credentials: "include"
        })
        if (!response.ok) {
            throw new Error("Failed")
        }

        const data = await response.json()
        if (data.success) {
            email = data.user.email
        } else {
            console.error("Failed", data.message)
        }
    } catch (error) {
        console.error("Error fetching user details: ", error)
    }
}

function save_highscore() {
    world.timeScale = 0
    console.log("SAVE!")
    fetch("/save_score", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: email, score: player_score}),
        credentials: "include"
    }).then(response => {
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.message || "Error saving!")
            }   
            return data
        })
    }).then(data => {
        if (data.success) {
            window.location.href = "dashboard.html"
        }
    }).catch(error => {
        console.error("ERROR! ", error)
    })
}

let width = 1280
let height = 720
let world_opacity = 100

let time = 0
let color_time = 0

let player
let player_diameter = 10
let player_speed = 7
let player_score = 0
let player_hp = 3
let score_multiplier = 1
let disabled_timer = 0
let disabled = false

let enemies

function setup() {
	new Canvas(width, height);
	displayMode('maxed');

    textSize(15)

    allSprites.pixelPerfect = true
    strokeWeight(2)

    enemies = new Group()
    enemies.d = 50
    enemies.x = width + 500
    enemies.y = random(0, height)
    enemies.color = 'red'
    enemies.speed = 0
    
    var enemy = new enemies.Sprite()
    enemy.speed = 15

	player = new Sprite();
	player.diameter = player_diameter;
    player.collider = "d"
    player.color = 'white'
    player.stroke = 'blue'
    player.drag = 0.25
}

function draw() {
    color_time = map(time, 0, 500, 0, 255)
	background(color(color_time, color_time, color_time, world_opacity));
    count_score()
    fill('white')
    text("FPS:" + round(frameRate()), 5, 15)
    text("Score: " + round(player_score), 5, 30)
    text("HP: " + player_hp, (width / 2) - 23, 45)

    for (let i = 0; i < enemies.length; i ++) {
        enemy_move(enemies[i], enemies[i].speed)
    }

	player_move()
    player_constraints()
}

function enemy_move(enemy, speed) {
    enemy.vel.x = -speed
    if (enemy.x < 0 - enemy.radius) {
        if (Math.random() <= 0.1) {
            enemy.y = player.y
        } else {
            enemy.y = random(0, height)
        }
        enemy.x = width + enemy.radius + player.radius + 100
        enemy.vel.y = 0
    }
}

function disable_player() {
    if (!disabled) {
        disabled = true
        player_hp -= 1
        background('red')
        player.color = color(255, 255, 255, 35)
        disabled_timer = time
        world_opacity = 10
        world.timeScale = 0.25
    }
}

function player_move() {
    if (player_hp == 0) {
        if (!saved) {
            save_highscore()
            saved = true
        }
    }

    if(player.collides(enemies)) {
        disable_player()
    }

    if (disabled) {
        if ((time - disabled_timer) === 2) {
            player.color = 'white'
            world.timeScale = 1
            world_opacity = 100
            disabled = false
        }
    }

    if (!disabled) {
        if (kb.pressing("w") || kb.pressing(UP_ARROW)) {
            player.vel.x = 0
            player.vel.y = 0
            player.y -= player_speed
        }
        if (kb.pressing("s") || kb.pressing(DOWN_ARROW)) {
            player.vel.x = 0
            player.vel.y = 0
            player.y += player_speed
        }
        if (kb.pressing("a") || kb.pressing(LEFT_ARROW)) {
            player.vel.x = 0
            player.vel.y = 0
            player.x -= player_speed
        }
        if (kb.pressing("d") || kb.pressing(RIGHT_ARROW)) {
            player.vel.x = 0
            player.vel.y = 0
            player.x += player_speed
        }
    }    
}

function player_constraints() {
    if (player.x > width + (player_diameter / 2)) {
        player.x = 0 - (player_diameter / 2)
    } else if (player.x < 0 - (player_diameter / 2)) {
        player.x = width + (player_diameter / 2)
    }
    if (player.y > height + (player_diameter / 2)) {
        player.y = 0 - (player_diameter / 2)
    } else if (player.y < 0 - (player_diameter / 2)) {
        player.y = height + (player_diameter / 2)
    }
}

function count_score() {
    time = round(frameCount / 60)
    player_score = round(time * score_multiplier)

    if (time == 5 && enemies.length < 2) {
        var enemy = new enemies.Sprite()
        enemy.d = 100
        enemy.speed = 10
        score_multiplier += 0.05
    }
    if (time == 10 && enemies.length < 3) {
        var enemy = new enemies.Sprite()
        enemy.d = 25
        enemy.speed = 25
        score_multiplier += 0.1
    }
    if (time == 15 && enemies.length < 4) {
        var enemy = new enemies.Sprite()
        enemy.d = 50
        enemy.speed = 15
        score_multiplier += 0.15
    }
    if (time == 20 && enemies.length < 5) {
        var enemy = new enemies.Sprite()
        enemy.d = 200
        enemy.speed = 5
        score_multiplier += 0.3
    }
    if (time == 25 && enemies.length < 6) {
        var enemy = new enemies.Sprite()
        enemy.d = 25
        enemy.speed = 25
        score_multiplier += 0.5
    }
    if (time == 30 && enemies.length < 7) {
        var enemy = new enemies.Sprite()
        enemy.d = 50
        enemy.speed = 15
        score_multiplier += 0.8
    }
}