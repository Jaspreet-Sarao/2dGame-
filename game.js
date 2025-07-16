const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const playerImg = new Image();
playerImg.src = 'player.png';

const enemyImg = new Image();
enemyImg.src = 'enemy.png';

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    speed: 4,
    size: 32,
    health: 100
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let score = 0;
let playerAlpha = 1;

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);

    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 7,
        dy: Math.sin(angle) * 7,
        radius: 5
    });
});

function spawnEnemy() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    enemies.push({
        x,
        y,
        size: 32,
        visibleUntil: Date.now() + (score >= 300 ? 1000 : 2000),
        lastShot: Date.now(),
        dead: false,
        dying: false,
        alpha: 1,
        scale: 1
    });
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x,
            y,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            radius: 5 + Math.random() * 5,
            color,
            alpha: 1,
            life: 30
        });
    }
}

let lastSpawn = Date.now();

function update() {
    if (player.health <= 0) {
        if (playerAlpha === 1) createExplosion(player.x, player.y, 'red');
        playerAlpha -= 0.01;
        return;
    }

    // Move player
    if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

    // Boundaries
    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));

    // Move bullets
    bullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
    bullets = bullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

    // Move enemy bullets
    enemyBullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
    enemyBullets = enemyBullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

    // Player hit
    enemyBullets = enemyBullets.filter(b => {
        const dist = Math.hypot(b.x - player.x, b.y - player.y);
        if (dist < b.radius + player.size) {
            player.health -= 10;
            return false;
        }
        return true;
    });

    // Bullet hit enemy
    bullets = bullets.filter(bullet => {
        for (let enemy of enemies) {
            if (!enemy.dead && !enemy.dying) {
                const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
                if (dist < bullet.radius + enemy.size) {
                    enemy.dying = true;
                    enemy.deathStart = Date.now();
                    createExplosion(enemy.x, enemy.y, 'orange');
                    score += 100;
                    return false;
                }
            }
        }
        return true;
    });

    // Animate enemy death
    enemies.forEach(e => {
        if (e.dying) {
            const elapsed = Date.now() - e.deathStart;
            e.alpha = 1 - (elapsed / 400);
            e.scale = 1 - (elapsed / 400);
        }
    });

    enemies = enemies.filter(e => !(e.dying && Date.now() - e.deathStart > 400));

    // Enemy shoot
    if (score >= 500) {
        enemies.forEach(e => {
            if (!e.dead && !e.dying && Date.now() - e.lastShot > 1500) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    dx: Math.cos(angle) * 4,
                    dy: Math.sin(angle) * 4,
                    radius: 5
                });
                e.lastShot = Date.now();
            }
        });
    }

    // Spawn enemy
    if (Date.now() - lastSpawn > 3000) {
        spawnEnemy();
        lastSpawn = Date.now();
    }

    // Update particles
    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.03;
        p.life -= 1;
    });
    particles = particles.filter(p => p.life > 0 && p.alpha > 0);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Player
    ctx.save();
    ctx.globalAlpha = playerAlpha;
    ctx.drawImage(playerImg, player.x - player.size, player.y - player.size, 64, 64);
    ctx.restore();

    // Bullets
    ctx.fillStyle = "yellow";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Enemy bullets
    ctx.fillStyle = "red";
    enemyBullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Enemies
    enemies.forEach(e => {
        if (!e.dead) {
            ctx.save();
            ctx.globalAlpha = e.dying ? e.alpha : (Date.now() < e.visibleUntil ? 1 : 0.1);
            ctx.translate(e.x, e.y);
            ctx.scale(e.scale || 1, e.scale || 1);
            ctx.drawImage(enemyImg, -e.size, -e.size, 64, 64);
            ctx.restore();
        }
    });

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Health: " + player.health, 20, 60);

    if (player.health <= 0) {
        ctx.fillStyle = "red";
        ctx.font = "48px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

document.getElementById("restartBtn").addEventListener("click", () => {
    resetGame();
});

function resetGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = 100;
    playerAlpha = 1;
    score = 0;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    lastSpawn = Date.now();
}

gameLoop();
