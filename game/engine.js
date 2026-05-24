// game/engine.js

class GameEngine {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.callbacks = callbacks; // { onScore, onGameOver }

        this.width = canvas.width;
        this.height = canvas.height;
        this.unitSize = 32;

        // Game State
        this.audio = new AudioController();
        this.haptic = new HapticFeedback();
        this.input = { keys: {} };
        this.player = null;
        this.blocks = [];          // Falling blocks + active platforms
        this.staticBlocks = [];    // Landed blocks forming the tower
        this.blockPool = new BlockPool(20); // Object pool for blocks

        this.cameraY = 0;
        this.score = 0;
        this.combo = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.difficulty = 1;
        this.goldBlocksJumpedOn = new Set();

        // Timers
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.gameTime = 0;

        // Swipe sensitivity (pixels)
        this.SWIPE_THRESHOLD = 20;

        // Touch state
        this.touch = {
            active: false,
            startX: 0,
            startY: 0
        };

        // Bind methods
        this.loop = this.loop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Setup input listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd);
        window.addEventListener('touchcancel', this.handleTouchEnd);
    }

    // --- Keyboard handlers ---
    handleKeyDown(e) {
        this.input.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.input.keys[e.code] = false;
    }

    // --- Touch handlers ---
    handleTouchStart(e) {
        e.preventDefault(); // Prevent page scroll
        if (e.touches.length === 0) return;

        this.touch.active = true;
        this.touch.startX = e.touches[0].clientX;
        this.touch.startY = e.touches[0].clientY;

        // Do not modify input keys here – wait for movement
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.touch.active || e.touches.length === 0) return;

        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        const dx = moveX - this.touch.startX;
        const dy = moveY - this.touch.startY; // negative = up
        const absDx = Math.abs(dx);

        // Horizontal control (left/right)
        if (absDx > this.SWIPE_THRESHOLD) {
            if (dx < 0) {
                this.input.keys.ArrowLeft = true;
                this.input.keys.ArrowRight = false;
            } else {
                this.input.keys.ArrowRight = true;
                this.input.keys.ArrowLeft = false;
            }
        } else {
            // Inside deadzone – no horizontal movement
            this.input.keys.ArrowLeft = false;
            this.input.keys.ArrowRight = false;
        }

        // Vertical control (jump) – only upward (negative dy)
        if (dy < -this.SWIPE_THRESHOLD) {
            this.input.keys.Space = true;
        } else {
            this.input.keys.Space = false;
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.touch.active) return;

        this.touch.active = false;

        // Release all touch‑controlled keys
        this.input.keys.ArrowLeft = false;
        this.input.keys.ArrowRight = false;
        this.input.keys.Space = false;
    }

    // --- Game lifecycle ---
    start() {
        // Reset state
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.difficulty = 1;
        this.gameTime = 0;
        this.spawnTimer = 0;
        this.blocks = [];
        this.staticBlocks = [];
        this.goldBlocksJumpedOn.clear();

        // Initial ground
        const ground = new Block(0, 640 - 32, 10);
        ground.isFalling = false;
        ground.color = '#555';
        this.staticBlocks.push(ground);

        // Player start
        this.player = new Player(160 - 8, 640 - 32 - 16);

        this.cameraY = 0;

        this.audio.resume();
        this.audio.playSpawn();

        if (this.callbacks.onScore) this.callbacks.onScore(0, 0);

        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    gameOver() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.audio.playGameOver();
        this.haptic.gameOver();
        if (this.callbacks.onGameOver) this.callbacks.onGameOver(Math.floor(this.score));
    }

    revivePlayer() {
        if (this.isPlaying) return; // Already playing
        
        // Reset game state but keep score
        this.isPlaying = true;
        this.combo = 0;
        
        // Reset player position
        const topBlock = this.staticBlocks[this.staticBlocks.length - 1];
        if (topBlock) {
            this.player.y = topBlock.y - this.player.height;
            this.player.vy = 0;
            this.player.isGrounded = true;
        }
        
        // Resume game
        this.audio.playSpawn();
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    spawnBlock() {
        // Difficulty scaling (unchanged)
        let maxUnits = 2;
        let spawnRate = 3000;
        let fallSpeedBase = 1.0;

        if (this.gameTime > 60) {
            maxUnits = 4;
            spawnRate = 2000;
            fallSpeedBase = 2.0;
        } else if (this.gameTime > 30) {
            maxUnits = 3;
            spawnRate = 2500;
            fallSpeedBase = 1.5;
        }

        const widthUnits = Utils.randomRange(2, maxUnits);
        const maxX = this.width - (widthUnits * this.unitSize);
        const x = Utils.randomRange(0, maxX);
        const spawnY = this.cameraY - 100;

        const block = this.blockPool.get();
        block.x = x;
        block.y = spawnY;
        block.widthUnits = widthUnits;
        block.width = widthUnits * this.unitSize;
        block.isFalling = true;
        block.rotation = 0;
        block.isPerfect = false;
        block.fallSpeed = fallSpeedBase + (Math.random() * 0.5);

        this.blocks.push(block);
        this.audio.playSpawn();
    }

    update(dt) {
        if (this.isPaused) return;

        this.gameTime += dt / 1000;

        // 1. Spawning
        this.spawnTimer += dt;
        const currentSpawnRate = Math.max(1000, 3000 - (this.gameTime * 20));
        if (this.spawnTimer > currentSpawnRate) {
            this.spawnBlock();
            this.spawnTimer = 0;
        }

        // 2. Player update
        const jumped = this.player.update(this.input);
        if (jumped) {
            this.audio.playJump();
            this.haptic.jump();
        }

        // Player boundaries
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.width) this.player.x = this.width - this.player.width;

        // Fall death
        if (this.player.y > this.cameraY + this.height + 50) {
            this.gameOver();
            return;
        }

        // 3. Falling blocks update
        const blocks = this.blocks;
        const staticBlocks = this.staticBlocks;
        const player = this.player;
        const width = this.width, height = this.height, cameraY = this.cameraY;

        for (let i = blocks.length - 1; i >= 0; i--) {
            const block = blocks[i];
            if (!block.isFalling) continue;

            block.y += block.fallSpeed;
            block.rotation += block.rotationSpeed;

            let landed = false;
            let landedOn = null;

            // Collision with static blocks
            for (let j = 0; j < staticBlocks.length; j++) {
                const sb = staticBlocks[j];
                if (Utils.rectIntersect(block, sb)) {
                    // Top collision (landing)
                    if (block.y + block.height - block.fallSpeed <= sb.y + 10) {
                        block.y = sb.y - block.height;
                        landed = true;
                        landedOn = sb;
                        break;
                    }
                }
            }

            if (landed) {
                block.isFalling = false;
                this.audio.playLand(block.widthUnits);

                // Move from blocks to staticBlocks
                blocks.splice(i, 1);
                staticBlocks.push(block);

                this.score += 10;

                // Perfect placement (golden)
                if (landedOn) {
                    const centerX = block.x + block.width / 2;
                    const targetCenterX = landedOn.x + landedOn.width / 2;
                    if (Math.abs(centerX - targetCenterX) < 10) {
                        block.x += targetCenterX - centerX; // snap
                        block.isPerfect = true;
                        block.goldBlockId = Math.random();
                        this.audio.playPerfect();
                    }
                }

                if (this.callbacks.onScore) this.callbacks.onScore(Math.floor(this.score), this.combo);

                // Top death
                if (block.y < cameraY) {
                    this.gameOver();
                    return;
                }
            } else if (block.y > this.cameraY + this.height + 100) {
                // Fell off bottom - return to pool
                this.blockPool.return(block);
                this.blocks.splice(i, 1);
            }
        }

        // 4. Static block animations
        for (let i = 0; i < staticBlocks.length; i++) {
            staticBlocks[i].update();
        }

        // 5. Player vs static blocks collision
        player.isGrounded = false;
        const pLeft = player.x;
        const pRight = player.x + player.width;
        const pTop = player.y;
        const pBottom = player.y + player.height;

        for (let i = 0; i < staticBlocks.length; i++) {
            const block = staticBlocks[i];
            const bLeft = block.x;
            const bRight = block.x + block.width;
            const bTop = block.y;
            const bBottom = block.y + block.height;

            if (pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom) {
                // Collision resolution
                const prevY = player.y - player.vy;

                // Landing from above
                if (prevY + player.height <= bTop + 10) {
                    player.y = bTop - player.height;
                    player.vy = 0;
                    player.isGrounded = true;

                    // Golden block bonus
                    if (block.isPerfect && block.goldBlockId && !this.goldBlocksJumpedOn.has(block.goldBlockId)) {
                        this.goldBlocksJumpedOn.add(block.goldBlockId);
                        this.combo++;
                        this.score += 50 * (this.combo + 1);
                        this.audio.playPerfect();
                        this.haptic.perfect();
                    }
                }
                // Hitting head
                else if (prevY >= bBottom - 10) {
                    player.y = bBottom;
                    player.vy = 0;
                }
                // Side collision
                else {
                    const playerCenter = player.x + player.width / 2;
                    const blockCenter = block.x + block.width / 2;
                    if (playerCenter < blockCenter) {
                        player.x = block.x - player.width;
                        player.vx = 0;
                    } else {
                        player.x = block.x + block.width;
                        player.vx = 0;
                    }
                }
            }
        }

        // 6. Camera follow (only upward)
        const targetCamY = player.y - (height * 0.6);
        if (targetCamY < this.cameraY) {
            this.cameraY += (targetCamY - this.cameraY) * 0.1;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#2a1a3a');
        gradient.addColorStop(1, '#0a0f1f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const cameraY = this.cameraY;
        const height = this.height;

        // Draw static blocks (culled)
        for (let i = 0; i < this.staticBlocks.length; i++) {
            const block = this.staticBlocks[i];
            if (block.y > cameraY - 100 && block.y < cameraY + height + 100) {
                block.draw(this.ctx, cameraY);
            }
        }

        // Draw falling blocks (culled)
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            if (block.y > cameraY - 100 && block.y < cameraY + height + 100) {
                block.draw(this.ctx, cameraY);
            }
        }

        // Draw player
        this.player.draw(this.ctx, cameraY);
    }

    loop(timestamp) {
        if (!this.isPlaying) return;

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.isPlaying = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}