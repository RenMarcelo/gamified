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
let sound

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
let recovering = false

let enemies
let super_spawned = false

let lines
let supers
let super_chances = 0.75
let hell = ""
let countdown = ""

function preload() {
    sound = loadSound('Nightcore  Psycho [NV].mp3')
}

function setup() {
	new Canvas(width, height);
	displayMode('maxed');

    textSize(15)

    allSprites.pixelPerfect = true
    strokeWeight(2)

    enemies = new Group()
    enemies.d = 50
    enemies.direction = 180
    enemies.x = width + 500
    enemies.y = random(0, height)
    enemies.color = 'red'
    enemies.speed = 0
    enemies.layer = 2
    
    var enemy = new enemies.Sprite()
    enemy.speed = 15

	player = new Sprite();
	player.diameter = player_diameter;
    player.collider = "d"
    player.color = 'white'
    player.stroke = 'blue'
    player.drag = 0.25
    player.layer = 5
}

function draw() {
    color_time = map(time, 0, 500, 0, 255)
	background(color(color_time, color_time, color_time, world_opacity));
    count_score()
    fill('white')
    textSize(16)
    text("FPS:" + round(frameRate()), 5, 15)
    text("Time: " + time, 5, 30)
    text("Score: " + round(player_score), 5, 45)
    text("HP: " + player_hp, (width / 2) - 23, 45)
    textSize(400)
    fill("black")
    text(hell, (width/2) - 450, (height/2) + 150)
    fill("white")
    text(countdown, (width/2) - 110, (height/2) + 150)

    for (let i = 0; i < enemies.length; i ++) {
        enemy_move(enemies[i])
    }

    if (super_spawned) {
        for (let i = 0; i < supers.length; i++) {
            supers_move(supers[i], lines[i])
        }
    }
    
	player_move()
    player_constraints()

    enemy_spawn()
}

function supers_move(superEnemy, lined) {
    lined.y = superEnemy.y
    lined.color = color(255, 0, 0, lined.opacity)
    if (superEnemy.x > width) {
        lined.opacity = map(superEnemy.x, width + (width * 4), width, 200, 0)
    } else {
        lined.opacity = 0
    }
    if (superEnemy.x < (0 - (width * 2))) {
        var chance = Math.random()
        if (chance < (super_chances / 3)) {
            superEnemy.y = player.y + random(-(superEnemy.h / 2), superEnemy.h)
        } else if (chance < super_chances) {
            superEnemy.y = player.y + random(-(superEnemy.h / 2), superEnemy.h / 2)
        } else {
            superEnemy.y = random(0, height)
        }
        superEnemy.x = width + (width * 4)
        superEnemy.direction = 180
    }
}


function enemy_move(enemy) {
    if (enemy.x < 0 - enemy.radius) {
        if (Math.random() <= 0.25) {
            enemy.y = player.y + random(-enemy.radius, enemy.radius)
        } else {
            enemy.y = random(0, height)
        }
        enemy.x = width + enemy.radius + player.radius + 100
        enemy.speed += 0.01
        enemy.direction = 180
    }
    if (enemy.y < 0 - enemy.radius) {
        enemy.y = height + enemy.radius
    } else if (enemy.y > height + enemy.radius) {
        enemy.y = 0 - enemy.radius
    }
}

function disable_player() {
    if (!disabled) {
        disabled = true
        recovering = true
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
    if (super_spawned) {
        if(player.collides(enemies) || player.overlaps(supers)) {
            disable_player()
        }
    } else {
        if(player.collides(enemies)) {
            disable_player()
        }
    }

    if (disabled) {
        if ((time - disabled_timer) === 1) {
            recovering = false
        }
        if ((time - disabled_timer) === 2) {
            player.color = 'white'
            world.timeScale = 1
            world_opacity = 100
            disabled = false
        }
    }

    if (!recovering) {
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
    player_score = round(time * (1 + score_multiplier))
}

function enemy_spawn() {
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
    if (time == 32) {
        if (!(sound.isPlaying())){
            sound.play()
        }
    }
    if (time == 35 && enemies.length < 8) {
        var enemy = new enemies.Sprite()
        enemy.d = 100
        enemy.speed = 10
        score_multiplier += 1
    }
    if (time == 40 && enemies.length < 9) {
        var enemy = new enemies.Sprite()
        enemy.d = 50
        enemy.speed = 15
        score_multiplier += 1.5

        lines = new Group()
        lines.opacity = 0
        lines.h = 35
        lines.w = width * 4
        lines.collider = "n"
        lines.color = color(255, 0, 0, lines.opacity)
        lines.layer = 1

        supers = new Group()
        supers.x = width + (width * 4)
        supers.direction = 180
        supers.h = 35
        supers.w = 100
        supers.speed = 100
        supers.collider = "n"
        supers.color = color('yellow')
        supers.layer = 2
        
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        super_spawned = true
    }

    if (time == 50 && supers.length < 2) {
        super_chances = 1
        enemies.speed = 0
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 52 && supers.length < 3) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 54 && supers.length < 4) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 56 && supers.length < 5) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 58 && supers.length < 6) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 60 && supers.length < 7) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 62 && supers.length < 8) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 64 && supers.length < 9) {
        var lined = new lines.Sprite()
        var superEnemy = new supers.Sprite()
        superEnemy.y = player.y
        lined.y = superEnemy.y
    }
    if (time == 66) {
        countdown = "3"
    }
    if (time == 67) {
        countdown = "2"
    }
    if (time == 68) {
        countdown = "1"
    }
    if (time == 69) {
        countdown = "0"
    }

    if (time == 70) {
        countdown = ""
        enemies.forEach(enemy => {
            enemy.speed = random(10, 25)
        });
        super_chances = 0.75
        hell = "HELL"
    }
}