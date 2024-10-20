const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Shield {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 70;
        this.height = 30;
        this.blocks = [];
        this.initBlocks();
    }

    initBlocks() {
        const blockWidth = 10;
        const blockHeight = 10;
        for (let i = 0; i < this.width / blockWidth; i++) {
            for (let j = 0; j < this.height / blockHeight; j++) {
                this.blocks.push({
                    x: this.x + i * blockWidth,
                    y: this.y + j * blockHeight,
                    width: blockWidth,
                    height: blockHeight,
                    destroyed: false
                });
            }
        }
    }

    draw() {
        this.blocks.forEach(block => {
            if (!block.destroyed) {
                ctx.fillStyle = 'green';
                ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
    }

    hitTest(bullet) {
        let hit = false;
        this.blocks.forEach(block => {
            if (!block.destroyed &&
                bullet.x < block.x + block.width &&
                bullet.x + bullet.width > block.x &&
                bullet.y < block.y + block.height &&
                bullet.y + bullet.height > block.y) {
                block.destroyed = true;
                hit = true;  // 標記為碰撞發生
            }
        });
        return hit;
    }
}

class Player {
    constructor() {
        this.width = 50;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 7;
        this.color = 'white';
        this.movingLeft = false;
        this.movingRight = false;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    move() {
        if (this.movingLeft) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (this.movingRight) {
            this.x = Math.min(canvas.width - this.width, this.x + this.speed);
        }
    }
}

class Bullet {
    constructor(x, y, isPlayer) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 20;
        this.speed = isPlayer ? 7 : -5;  // 玩家子彈向上，敵人雷射向下
        this.isPlayer = isPlayer;
    }
    
    draw() {
        ctx.fillStyle = this.isPlayer ? 'red' : 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    update() {
        this.y -= this.speed;
    }
}

class Enemy {
    constructor(x, y) {
        this.width = 40;
        this.height = 20;
        this.x = x;
        this.y = y;
        this.speed = 2;
        this.direction = 1;
    }
    
    draw() {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    update() {
        this.x += this.speed * this.direction;
    }
    
    fire(bullets) {
        if (bullets.filter(bullet => !bullet.isPlayer).length < 5) {  // 限制敵方雷射數量不超過 3 個
            bullets.push(new Bullet(this.x + this.width / 2 - 2.5, this.y + this.height, false));
        }
    }
}

const player = new Player();
const bullets = [];
const enemies = [];
const shields = [];

const shieldCount = 5;
const shieldSpacing = (canvas.width - shieldCount * 70) / (shieldCount + 1);

for (let i = 0; i < shieldCount; i++) {
    const x = shieldSpacing + i * (70 + shieldSpacing);
    shields.push(new Shield(x, canvas.height - 200));
}

// 產生敵人
for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 10; j++) {
        enemies.push(new Enemy(100 + j * 50, 50 + i * 40));
    }
}

function gameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    cancelAnimationFrame(animationId);  // 停止遊戲
}

function victory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('Victory!', canvas.width / 2 - 100, canvas.height / 2);
    cancelAnimationFrame(animationId);  // 停止遊戲
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 玩家更新及繪製
    player.move();
    player.draw();
    
    // 敵人更新及繪製
    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        
        if (enemy.x > canvas.width - enemy.width || enemy.x < 0) {
            enemies.forEach(e => {
                e.direction *= -1;  // 換方向
                e.y += 20;  // 向下移動
            });
        }
        
        // 隨機發射敵人雷射
        if (Math.random() < 0.01) {
            enemy.fire(bullets);
        }
        
        // 檢查玩家子彈碰撞敵人
        bullets.forEach((bullet, bIndex) => {
            if (
                bullet.isPlayer &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                bullets.splice(bIndex, 1);
                enemies.splice(index, 1);
            }
        });

        if (enemies.length === 0) {
            victory();
        }
    });
    
    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();

        let removeBullet = false;

        // 檢查是否擊中防護罩
        shields.forEach(shield => {
            if (shield.hitTest(bullet)) {
                removeBullet = true;
            }
        });

        // 檢查是否超出畫面或已經擊中防護罩
        if (bullet.y < 0 || bullet.y > canvas.height || removeBullet) {
            bullets.splice(index, 1);
        }  

        if (
            !bullet.isPlayer &&
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            console.log('Player hit!');
            gameOver();  // 當玩家被擊中時呼叫結束遊戲函數
        }
    });

    // 繪製防護罩
    shields.forEach(shield => shield.draw());
    
    requestAnimationFrame(drawGame);
}

let canShoot = true;  // 初始化時允許發射

// 玩家移動和射擊控制
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        player.movingLeft = true;
    }
    if (e.key === 'ArrowRight') {
        player.movingRight = true;
    }
    if (e.key === ' ' && canShoot) {  // 只有當 canShoot 為 true 時才能發射
        bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y, true));
        canShoot = false;  // 發射後設置為 false，等待0.5秒

        // 設置0.5秒延遲，之後再允許發射
        setTimeout(() => {
            canShoot = true;
        }, 500);  // 500毫秒 = 0.5秒
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        player.movingLeft = false;
    }
    if (e.key === 'ArrowRight') {
        player.movingRight = false;
    }
});

drawGame();