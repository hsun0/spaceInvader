const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Shield {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 140;
        this.height = 60;
        this.blocks = [];
        this.initBlocks();
    }

    initBlocks() {
        const blockWidth = 10;
        const blockHeight = 10;
        for (let i = 0; i < this.width / blockWidth; i++) {
            for (let j = 0; j < this.height / blockHeight; j++) {
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const blockCenterX = i * blockWidth + blockWidth / 2;
                const blockCenterY = j * blockHeight + blockHeight / 2;
                
                const distanceFromCenter = Math.abs(blockCenterX - centerX);
                const maxHeight = this.height * 0.8;
                const heightOffset = (distanceFromCenter * distanceFromCenter) / (2 * centerX);
                
                if (j * blockHeight < this.height - heightOffset) {
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
    }

    draw() {
        this.blocks.forEach(block => {
            if (!block.destroyed) {
                ctx.fillStyle = 'green';
                ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
    }

    // 子彈碰撞檢測保持不變
    hitTest(bullet) {
        let hit = false;
        this.blocks.forEach(block => {
            if (!block.destroyed &&
                bullet.x < block.x + block.width &&
                bullet.x + bullet.width > block.x &&
                bullet.y < block.y + block.height &&
                bullet.y + bullet.height > block.y) {
                block.destroyed = true;
                hit = true;
            }
        });
        return hit;
    }

    // 新增敵人碰撞檢測
    checkEnemyCollision(enemy) {
        this.blocks.forEach(block => {
            if (!block.destroyed &&
                enemy.x < block.x + block.width &&
                enemy.x + enemy.width > block.x &&
                enemy.y < block.y + block.height &&
                enemy.y + enemy.height > block.y) {
                block.destroyed = true;
            }
        });
    }
}


// 修改 Player 類別，加入生命值
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
        this.lives = 3; // 新增生命值屬性
        this.isInvulnerable = false; // 新增無敵狀態
    }
    
    draw() {
        // 在無敵狀態下閃爍效果
        if (!this.isInvulnerable || Math.floor(Date.now() / 100) % 2) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // 在右下角顯示生命值
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Lives: ${this.lives}`, canvas.width - 100, canvas.height - 20);
    }
    
    move() {
        if (this.movingLeft) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (this.movingRight) {
            this.x = Math.min(canvas.width - this.width, this.x + this.speed);
        }
    }

    // 新增重生方法
    respawn() {
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.isInvulnerable = true;
        // 2秒無敵時間
        setTimeout(() => {
            this.isInvulnerable = false;
        }, 2000);
    }

    // 新增受傷方法
    hit() {
        if (!this.isInvulnerable) {
            this.lives--;
            if (this.lives > 0) {
                this.respawn();
                return false; // 還沒死亡
            }
            return true; // 死亡
        }
        return false;
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
        ctx.fillStyle = this.isPlayer ? 'blue' : 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    update() {
        this.y -= this.speed;
    }
}

class Enemy {
    constructor(x, y, row) {
        this.width = 40;
        this.height = 20;
        this.x = x;
        this.y = y;
        this.speed = 2;
        this.direction = 1;

        // 根據row來設定顏色與分數
        if (row === 0) {  // 第一層
            this.color = 'purple';
            this.points = 50;
        } else if (row === 1 || row === 2) {  // 第二、三層
            this.color = 'yellow';
            this.points = 20;
        } else {  // 剩下的層
            this.color = 'white';
            this.points = 10;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.speed * this.direction;
    }

    fire(bullets) {
        if (bullets.filter(bullet => !bullet.isPlayer).length < 5) {  // 限制敵方雷射數量不超過 5 個
            bullets.push(new Bullet(this.x + this.width / 2 - 2.5, this.y + this.height, false));
        }
    }
}


const player = new Player();
const bullets = [];
const enemies = [];
const shields = [];

// 修改防護罩的初始化部分
const shieldCount = 3;  // 改為3個防護罩
const shieldSpacing = (canvas.width - shieldCount * 140) / (shieldCount + 1);  // 注意這裡的140是新的寬度


let score = 0;

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
}

// 重新創建防護罩
for (let i = 0; i < shieldCount; i++) {
    const x = shieldSpacing + i * (140 + shieldSpacing);
    shields.push(new Shield(x, canvas.height - 200));
}

// 產生敵人
for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 10; j++) {
        enemies.push(new Enemy(100 + j * 50, 50 + i * 40, i));
    }
}

function gameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    
    // 顯示 "Game Over"
    const gameOverText = 'Game Over';
    const gameOverTextWidth = ctx.measureText(gameOverText).width;
    ctx.fillText(gameOverText, (canvas.width - gameOverTextWidth) / 2, canvas.height / 2);

    // 顯示分數
    ctx.font = '36px Arial';  // 調整字體大小
    const scoreText = `Your Score: ${score}`;
    const scoreTextWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, (canvas.width - scoreTextWidth) / 2, (canvas.height / 2) + 100);

    cancelAnimationFrame(animationId);  // 停止遊戲迴圈
}

function victory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    
    // 顯示 "Victory!"
    const victoryText = 'Victory!';
    const victoryTextWidth = ctx.measureText(victoryText).width;
    ctx.fillText(victoryText, (canvas.width - victoryTextWidth) / 2, canvas.height / 2);

    // 顯示分數
    ctx.font = '36px Arial';  // 調整字體大小
    const scoreText = `Your Score: ${score}`;
    const scoreTextWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, (canvas.width - scoreTextWidth) / 2, (canvas.height / 2) + 100);

    cancelAnimationFrame(animationId);  // 停止遊戲迴圈
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawScore();
    
    player.move();
    player.draw();
    
    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        
        // 檢查敵人是否碰到螢幕邊緣
        if (enemy.x > canvas.width - enemy.width || enemy.x < 0) {
            enemies.forEach(e => {
                e.direction *= -1;
                e.y += 20;
            });
        }
        
        // 檢查敵人是否到達底部或碰到玩家
        if (enemy.y + enemy.height >= canvas.height || 
            (enemy.x < player.x + player.width &&
             enemy.x + enemy.width > player.x &&
             enemy.y < player.y + player.height &&
             enemy.y + enemy.height > player.y)) {
            gameOver();
            return;
        }

        // 檢查敵人是否碰到防護罩
        shields.forEach(shield => {
            shield.checkEnemyCollision(enemy);
        });
        
        if (Math.random() < 0.01) {
            enemy.fire(bullets);
        }
        
        bullets.forEach((bullet, bIndex) => {
            if (
                bullet.isPlayer &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                score += enemy.points;
                bullets.splice(bIndex, 1);
                enemies.splice(index, 1);
            }
        });
    });

    if (enemies.length === 0) {
        victory();
        return;
    }
    
    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();

        let removeBullet = false;

        shields.forEach(shield => {
            if (shield.hitTest(bullet)) {
                removeBullet = true;
            }
        });

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
            bullets.splice(index, 1);
            if (player.hit()) {
                gameOver();
                return;
            }
        }
    });

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