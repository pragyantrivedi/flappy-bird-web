class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.currentScoreEl = document.getElementById('currentScore');
        this.finalScoreEl = document.getElementById('finalScore');
        this.bestScoreEl = document.getElementById('bestScore');
        this.restartBtn = document.getElementById('restartBtn');

        // Mobile detection
        this.isMobile = this.detectMobile();
        
        // Set up canvas dimensions for mobile
        this.setupCanvas();

        // Game state
        this.gameState = 'start'; // start, playing, gameOver
        this.score = 0;
        this.bestScore = localStorage.getItem('flappyBestScore') || 0;
        this.bestScoreEl.textContent = this.bestScore;

        // Bird properties
        this.bird = {
            x: this.canvas.width * 0.2,
            y: this.canvas.height * 0.5,
            width: this.canvas.width * 0.075,
            height: this.canvas.width * 0.075,
            velocity: 0,
            gravity: this.canvas.height * 0.0008,
            jumpPower: -this.canvas.height * 0.017,
            color: '#FFD700'
        };

        // Pipe properties
        this.pipes = [];
        this.pipeWidth = this.canvas.width * 0.125;
        this.pipeGap = this.canvas.height * 0.25;
        this.pipeSpeed = this.canvas.width * 0.005;
        this.lastPipeTime = 0;
        this.pipeInterval = this.isMobile ? 2000 : 1500; // Slower on mobile

        // Ground
        this.groundHeight = this.canvas.height * 0.083;
        this.groundY = this.canvas.height - this.groundHeight;

        this.setupEventListeners();
        this.gameLoop();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }

    setupCanvas() {
        if (this.isMobile) {
            // Set canvas to full screen on mobile
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
        } else {
            // Desktop default size
            this.canvas.width = 400;
            this.canvas.height = 600;
        }
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });

        // Touch controls for mobile - using document instead of canvas for better coverage
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleInput();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        // Mouse/click controls for desktop
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleInput();
        });

        // Also add click event as fallback
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleInput();
        });

        // Restart button
        this.restartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.restart();
        });

        this.restartBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.restart();
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setupCanvas();
                this.adjustGameElements();
            }, 100);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isMobile) {
                this.setupCanvas();
                this.adjustGameElements();
            }
        });

        // Prevent default touch behaviors globally
        document.addEventListener('touchstart', (e) => {
            if (e.target === this.canvas || e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.target === this.canvas || e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    handleInput() {
        // Debug: Log input for troubleshooting
        console.log('Input detected, current state:', this.gameState);
        
        switch (this.gameState) {
            case 'start':
                this.startGame();
                break;
            case 'playing':
                this.flap();
                break;
            case 'gameOver':
                this.restart();
                break;
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
        this.scoreDisplay.classList.add('visible');
        this.flap();
    }

    flap() {
        this.bird.velocity = this.bird.jumpPower;
    }

    restart() {
        this.gameState = 'start';
        this.score = 0;
        this.currentScoreEl.textContent = this.score;
        this.bird.y = this.canvas.height * 0.5;
        this.bird.velocity = 0;
        this.pipes = [];
        this.lastPipeTime = 0;
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        this.scoreDisplay.classList.remove('visible');
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Update bird
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        // Generate pipes
        const currentTime = Date.now();
        if (currentTime - this.lastPipeTime > this.pipeInterval) {
            this.createPipe();
            this.lastPipeTime = currentTime;
        }

        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Remove pipes that are off screen
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            // Check for scoring
            if (!pipe.scored && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.currentScoreEl.textContent = this.score;
            }

            // Check collision
            if (this.checkCollision(pipe)) {
                this.gameOver();
                return;
            }
        }

        // Check ground and ceiling collision
        if (this.bird.y + this.bird.height > this.groundY || this.bird.y < 0) {
            this.gameOver();
        }
    }

    createPipe() {
        const minHeight = 50;
        const maxHeight = this.groundY - this.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        this.pipes.push({
            x: this.canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            scored: false
        });
    }

    checkCollision(pipe) {
        // Bird boundaries
        const birdLeft = this.bird.x;
        const birdRight = this.bird.x + this.bird.width;
        const birdTop = this.bird.y;
        const birdBottom = this.bird.y + this.bird.height;

        // Pipe boundaries
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + this.pipeWidth;

        // Check if bird is within pipe x range
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check collision with top pipe or bottom pipe
            if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
                return true;
            }
        }

        return false;
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.finalScoreEl.textContent = this.score;
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBestScore', this.bestScore);
            this.bestScoreEl.textContent = this.bestScore;
        }

        this.gameOverScreen.classList.remove('hidden');
        this.scoreDisplay.classList.remove('visible');
    }

    adjustGameElements() {
        // Recalculate game element sizes based on new canvas dimensions
        const baseWidth = this.isMobile ? this.canvas.width : 400;
        const baseHeight = this.isMobile ? this.canvas.height : 600;
        
        this.bird.x = baseWidth * 0.2;
        if (this.gameState === 'start') {
            this.bird.y = baseHeight * 0.5;
        }
        this.bird.width = baseWidth * 0.075;
        this.bird.height = baseWidth * 0.075;
        this.bird.gravity = baseHeight * 0.0008;
        this.bird.jumpPower = -baseHeight * 0.017;

        this.pipeWidth = baseWidth * 0.125;
        this.pipeGap = baseHeight * 0.25;
        this.pipeSpeed = baseWidth * 0.005;
        this.groundHeight = baseHeight * 0.083;
        this.groundY = this.canvas.height - this.groundHeight;

        // Clear existing pipes when adjusting to avoid scaling issues
        if (this.gameState === 'start') {
            this.pipes = [];
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.groundY, this.canvas.width, this.groundHeight);

        // Draw grass on ground
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.groundY, this.canvas.width, 10);

        // Draw pipes
        this.ctx.fillStyle = '#32CD32';
        this.pipes.forEach(pipe => {
            // Top pipe
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            // Bottom pipe
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, this.groundY - pipe.bottomY);
            
            // Pipe borders
            this.ctx.strokeStyle = '#228B22';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, this.groundY - pipe.bottomY);
        });

        // Draw bird
        this.ctx.fillStyle = this.bird.color;
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);
        
        // Bird border
        this.ctx.strokeStyle = '#FFA500';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);

        // Draw bird eye
        this.ctx.fillStyle = 'white';
        const eyeSize = this.bird.width * 0.2;
        this.ctx.fillRect(this.bird.x + this.bird.width * 0.65, this.bird.y + this.bird.height * 0.25, eyeSize, eyeSize);
        this.ctx.fillStyle = 'black';
        const pupilSize = eyeSize * 0.4;
        this.ctx.fillRect(this.bird.x + this.bird.width * 0.7, this.bird.y + this.bird.height * 0.35, pupilSize, pupilSize);

        // Draw beak
        this.ctx.fillStyle = '#FFA500';
        const beakWidth = this.bird.width * 0.25;
        const beakHeight = this.bird.height * 0.2;
        this.ctx.fillRect(this.bird.x + this.bird.width, this.bird.y + this.bird.height * 0.4, beakWidth, beakHeight);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new FlappyBird();
});
