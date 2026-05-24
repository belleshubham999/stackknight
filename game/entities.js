// game/entities.js

// Block Object Pool
class BlockPool {
    constructor(size = 20) {
        this.pool = [];
        this.size = size;
        for (let i = 0; i < size; i++) {
            this.pool.push(new Block(0, 0, 2));
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return new Block(0, 0, 2);
    }

    return(block) {
        if (this.pool.length < this.size) {
            this.pool.push(block);
        }
    }
}

class Player {
    constructor(x, y) {
        this.width = 16;  // visual pixels (hitbox)
        this.height = 16;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;

        // Physics constants
        this.speed = 4;        // Horizontal speed
        this.friction = 0.8;   // Slide factor
        this.gravity = 0.5;    // Gravity per frame
        this.jumpForce = -9.5; // Adjusted for ~3 blocks high

        this.isGrounded = false;
        this.lastFacingDirection = 1; // 1 for right, -1 for left

        // Sprite handling
        this.spriteRunSource = new Image();
        this.spriteRunSource.src = "./trickle/assets/Stand.jpg";

        this.spriteJumpSource = new Image();
        this.spriteJumpSource.src = "./trickle/assets/Jump.jpg";

        this.spriteRun = null;
        this.spriteJump = null;

        this.spritesLoaded = { run: false, jump: false };

        this.spriteRunSource.onload = () => {
            this.spriteRun = this.removeWhiteBackground(this.spriteRunSource);
            this.spritesLoaded.run = true;
        };
        this.spriteJumpSource.onload = () => {
            this.spriteJump = this.removeWhiteBackground(this.spriteJumpSource);
            this.spritesLoaded.jump = true;
        };

        // Fallback colors
        this.color = '#c0c0c0'; // Silver
        this.capeColor = '#4169e1'; // Blue
    }

    // Helper to remove white background from image
    removeWhiteBackground(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through pixels
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If pixel is close to white (allow some tolerance)
            // Using 230 as threshold for "white-ish"
            if (r > 230 && g > 230 && b > 230) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    update(input) {
        // Horizontal movement
        if (input.keys['ArrowLeft']) {
            this.vx -= 1;
        }
        if (input.keys['ArrowRight']) {
            this.vx += 1;
        }

        // Apply friction and speed limit
        this.vx *= this.friction;

        // Clamp horizontal speed
        if (this.vx > this.speed) this.vx = this.speed;
        if (this.vx < -this.speed) this.vx = -this.speed;

        // Stop completely if very slow
        if (Math.abs(this.vx) < 0.1) this.vx = 0;

        // Apply Gravity
        this.vy += this.gravity;

        // Jump (Space or Up Arrow)
        if ((input.keys['Space'] || input.keys['ArrowUp']) && this.isGrounded) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            return true; // Return true to signal jump SFX
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        return false;
    }

    draw(ctx, cameraY) {
        const drawY = this.y - cameraY;

        // Determine which sprite to use
        let currentSprite = this.spriteRun;
        let isLoaded = this.spritesLoaded.run;

        if (!this.isGrounded) {
            currentSprite = this.spriteJump;
            isLoaded = this.spritesLoaded.jump;
        }

        if (isLoaded && currentSprite) {
            // Draw sprite
            // Previously 32, increased to 56 for better visibility as requested
            // Hitbox is still 16x16
            const visualSize = 56;

            // Center the larger sprite on the hitbox
            // Hitbox center: x + 8, y + 8
            // Sprite center needs to be there.
            // visualSize 56 means we draw from center - 28

            ctx.save();

            // Move to center of hitbox
            ctx.translate(this.x + this.width / 2, drawY + this.height / 2);

            // Flip calculation: prioritize current input direction, fall back to velocity
            let facingDirection = this.lastFacingDirection;

            if (Math.abs(this.vx) > 0.1) {
                // Have velocity, use it to determine direction
                facingDirection = this.vx > 0 ? 1 : -1;
                this.lastFacingDirection = facingDirection;
            }

            if (facingDirection === 1) {
                ctx.scale(-1, 1);
            }

            // Draw image centered on the translated point
            // Offset Y up to position sprites better
            ctx.drawImage(currentSprite, -visualSize / 2, -visualSize / 2 - 16, visualSize, visualSize);

            ctx.restore();
        } else {
            // Fallback drawing
            // Draw Cape
            ctx.fillStyle = this.capeColor;
            ctx.fillRect(this.x - 2, drawY + 4, 4, 10);

            // Draw Body (Helmet/Armor)
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, drawY, this.width, this.height);

            // Visor
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 4, drawY + 4, 8, 2);
        }
    }
}

class Block {
    constructor(x, y, widthUnits) {
        this.unitSize = 32; // 1 block unit = 32px
        this.width = widthUnits * this.unitSize;
        this.height = this.unitSize; // Always 1 unit tall

        this.x = x;
        this.y = y;

        this.widthUnits = widthUnits; // 2, 3, or 4

        this.isFalling = true;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;

        this.color = '#b84a4a'; // Brick red
        this.strokeColor = '#6b2d2d';

        this.isPerfect = false;
    }

    update() {
        if (!this.isFalling) {
            // Smoothly interpolate rotation to 0 (ease-out)
            if (Math.abs(this.rotation) > 0.001) {
                this.rotation = this.rotation * 0.8;
            } else {
                this.rotation = 0;
            }
        }
    }

    draw(ctx, cameraY) {
        const drawY = this.y - cameraY;

        ctx.save();

        // Translate to center for rotation
        ctx.translate(this.x + this.width / 2, drawY + this.height / 2);

        if (this.isFalling) {
            ctx.rotate(this.rotation * 0.5); // subtle rotation
        } else {
            // Even when landed, we draw with rotation until it settles
            ctx.rotate(this.rotation * 0.5);
        }

        ctx.translate(-(this.x + this.width / 2), -(drawY + this.height / 2));

        // Glow if perfect
        if (this.isPerfect) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffd700';
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = 2;
        }

        ctx.fillStyle = this.isPerfect ? '#d4af37' : this.color;
        ctx.fillRect(this.x, drawY, this.width, this.height);
        ctx.strokeRect(this.x, drawY, this.width, this.height);

        // Inner detail (brick look)
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(this.x + 4, drawY + 4, this.width - 8, this.height - 8);

        ctx.restore();
    }
}