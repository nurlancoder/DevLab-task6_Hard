class EnhancedPinkPong {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.gameStatus = document.getElementById('gameStatus');
                this.pauseIndicator = document.getElementById('pauseIndicator');
                this.player1ScoreEl = document.getElementById('player1Score');
                this.player2ScoreEl = document.getElementById('player2Score');
                this.fpsCounter = document.getElementById('fpsCounter');
                
                this.setupCanvas();
                this.initializeGame();
                this.setupEventListeners();
                this.setupAudio();
                this.gameLoop();
            }

            setupCanvas() {
                const resizeCanvas = () => {
                    const maxWidth = Math.min(800, window.innerWidth * 0.8);
                    const maxHeight = Math.min(400, window.innerHeight * 0.5);
                    
                    if (maxWidth < 800) {
                        this.canvas.style.width = maxWidth + 'px';
                        this.canvas.style.height = (maxWidth * 0.5) + 'px';
                    }
                };
                
                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);
            }

            initializeGame() {
                this.gameRunning = false;
                this.gamePaused = false;
                this.gameStarted = false;
                this.winningScore = 7;
                
                this.lastTime = 0;
                this.fps = 60;
                this.frameCount = 0;
                this.fpsTime = 0;
                
                this.ball = {
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    radius: 10,
                    velocityX: 0,
                    velocityY: 0,
                    baseSpeed: 6,
                    maxSpeed: 15,
                    trailPositions: [],
                    glowIntensity: 1
                };

                this.paddleWidth = 15;
                this.paddleHeight = 90;
                this.paddleSpeed = 7;

                this.player1 = {
                    x: 25,
                    y: (this.canvas.height - this.paddleHeight) / 2,
                    score: 0,
                    velocityY: 0,
                    glowIntensity: 0.5
                };

                this.player2 = {
                    x: this.canvas.width - 25 - this.paddleWidth,
                    y: (this.canvas.height - this.paddleHeight) / 2,
                    score: 0,
                    velocityY: 0,
                    glowIntensity: 0.5
                };

                this.keys = {};
                
                this.particles = [];
                this.screenShake = { x: 0, y: 0, intensity: 0 };
                this.lastCollisionTime = 0;
                
                this.backgroundStars = this.generateStars(50);
                
                this.soundEnabled = true;
            }

            generateStars(count) {
                const stars = [];
                for (let i = 0; i < count; i++) {
                    stars.push({
                        x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        size: Math.random() * 2 + 0.5,
                        opacity: Math.random() * 0.5 + 0.2,
                        twinkleSpeed: Math.random() * 0.02 + 0.01
                    });
                }
                return stars;
            }

            setupAudio() {
                this.audioContext = null;
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.log('Audio not supported');
                }
            }

            playSound(frequency, duration = 0.1, type = 'sine') {
                if (!this.soundEnabled || !this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            }

            setupEventListeners() {
                document.addEventListener('keydown', (e) => {
                    this.keys[e.key.toLowerCase()] = true;
                    
                    if (e.key === ' ') {
                        e.preventDefault();
                        this.togglePause();
                    }
                });

                document.addEventListener('keyup', (e) => {
                    this.keys[e.key.toLowerCase()] = false;
                });

                document.getElementById('startBtn').addEventListener('click', () => this.startGame());
                document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
                document.getElementById('restartBtn').addEventListener('click', () => this.restart());
                document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());

                window.addEventListener('blur', () => {
                    if (this.gameRunning) this.pause();
                });
            }

            startGame() {
                if (this.gameStarted) return;
                
                this.gameStarted = true;
                this.gameRunning = true;
                this.gamePaused = false;
                
                const angle = (Math.random() - 0.5) * Math.PI / 4; 
                const direction = Math.random() > 0.5 ? 1 : -1;
                
                this.ball.velocityX = Math.cos(angle) * this.ball.baseSpeed * direction;
                this.ball.velocityY = Math.sin(angle) * this.ball.baseSpeed;
                
                this.showGameStatus('Game Started!', '#00ff00');
                this.playSound(440, 0.2);
            }

            togglePause() {
                if (!this.gameStarted) return;
                
                this.gamePaused = !this.gamePaused;
                this.gameRunning = !this.gamePaused;
                
                this.pauseIndicator.classList.toggle('show', this.gamePaused);
                
                if (this.gamePaused) {
                    this.playSound(330, 0.1);
                } else {
                    this.playSound(440, 0.1);
                }
            }

            pause() {
                this.gamePaused = true;
                this.gameRunning = false;
                this.pauseIndicator.classList.add('show');
            }

            toggleSound() {
                this.soundEnabled = !this.soundEnabled;
                const soundBtn = document.getElementById('soundToggle');
                soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
                soundBtn.title = this.soundEnabled ? 'Mute Sound' : 'Enable Sound';
            }

            handleInput() {
                if (!this.gameRunning) return;

                if (this.keys['w'] && this.player1.y > 0) {
                    this.player1.velocityY = -this.paddleSpeed;
                    this.player1.glowIntensity = Math.min(1, this.player1.glowIntensity + 0.1);
                } else if (this.keys['s'] && this.player1.y < this.canvas.height - this.paddleHeight) {
                    this.player1.velocityY = this.paddleSpeed;
                    this.player1.glowIntensity = Math.min(1, this.player1.glowIntensity + 0.1);
                } else {
                    this.player1.velocityY *= 0.85;
                    this.player1.glowIntensity = Math.max(0.3, this.player1.glowIntensity - 0.05);
                }

                if (this.keys['arrowup'] && this.player2.y > 0) {
                    this.player2.velocityY = -this.paddleSpeed;
                    this.player2.glowIntensity = Math.min(1, this.player2.glowIntensity + 0.1);
                } else if (this.keys['arrowdown'] && this.player2.y < this.canvas.height - this.paddleHeight) {
                    this.player2.velocityY = this.paddleSpeed;
                    this.player2.glowIntensity = Math.min(1, this.player2.glowIntensity + 0.1);
                } else {
                    this.player2.velocityY *= 0.85;
                    this.player2.glowIntensity = Math.max(0.3, this.player2.glowIntensity - 0.05);
                }
            }

            updatePaddles() {
                this.player1.y += this.player1.velocityY;
                this.player2.y += this.player2.velocityY;

                if (this.player1.y < 0) {
                    this.player1.y = 0;
                    this.player1.velocityY = 0;
                }
                if (this.player1.y > this.canvas.height - this.paddleHeight) {
                    this.player1.y = this.canvas.height - this.paddleHeight;
                    this.player1.velocityY = 0;
                }

                if (this.player2.y < 0) {
                    this.player2.y = 0;
                    this.player2.velocityY = 0;
                }
                if (this.player2.y > this.canvas.height - this.paddleHeight) {
                    this.player2.y = this.canvas.height - this.paddleHeight;
                    this.player2.velocityY = 0;
                }
            }

            updateBall() {
                if (!this.gameRunning) return;

                this.ball.trailPositions.push({
                    x: this.ball.x, 
                    y: this.ball.y,
                    time: Date.now()
                });
                
                if (this.ball.trailPositions.length > 12) {
                    this.ball.trailPositions.shift();
                }

                this.ball.x += this.ball.velocityX;
                this.ball.y += this.ball.velocityY;

                if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius) {
                    this.ball.velocityY = -this.ball.velocityY;
                    this.ball.y = Math.max(this.ball.radius, Math.min(this.canvas.height - this.ball.radius, this.ball.y));
                    this.createParticles(this.ball.x, this.ball.y, '#ffffff', 6);
                    this.screenShake.intensity = 3;
                    this.playSound(800, 0.05);
                }

                this.handlePaddleCollision();

                if (this.ball.x < -this.ball.radius) {
                    this.player2.score++;
                    this.updateScore();
                    this.resetBall();
                    this.playSound(600, 0.3, 'square');
                } else if (this.ball.x > this.canvas.width + this.ball.radius) {
                    this.player1.score++;
                    this.updateScore();
                    this.resetBall();
                    this.playSound(600, 0.3, 'square');
                }

                this.ball.glowIntensity = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            }

            handlePaddleCollision() {
                const currentTime = Date.now();
                if (currentTime - this.lastCollisionTime < 100) return;

                let collision = false;

                if (this.ball.x - this.ball.radius <= this.player1.x + this.paddleWidth &&
                    this.ball.x + this.ball.radius >= this.player1.x &&
                    this.ball.y >= this.player1.y - 5 &&
                    this.ball.y <= this.player1.y + this.paddleHeight + 5 &&
                    this.ball.velocityX < 0) {
                    
                    this.ball.velocityX = Math.abs(this.ball.velocityX);
                    this.addSpin(this.player1);
                    this.increaseSpeed();
                    this.createParticles(this.ball.x, this.ball.y, '#00ffff', 10);
                    this.screenShake.intensity = 5;
                    this.playSound(1000, 0.1);
                    collision = true;
                }

                if (this.ball.x + this.ball.radius >= this.player2.x &&
                    this.ball.x - this.ball.radius <= this.player2.x + this.paddleWidth &&
                    this.ball.y >= this.player2.y - 5 &&
                    this.ball.y <= this.player2.y + this.paddleHeight + 5 &&
                    this.ball.velocityX > 0) {
                    
                    this.ball.velocityX = -Math.abs(this.ball.velocityX);
                    this.addSpin(this.player2);
                    this.increaseSpeed();
                    this.createParticles(this.ball.x, this.ball.y, '#ff1493', 10);
                    this.screenShake.intensity = 5;
                    this.playSound(1200, 0.1);
                    collision = true;
                }

                if (collision) {
                    this.lastCollisionTime = currentTime;
                }
            }

            addSpin(player) {
                const hitPosition = (this.ball.y - (player.y + this.paddleHeight / 2)) / (this.paddleHeight / 2);
                const maxSpin = 4;
                
                this.ball.velocityY += hitPosition * maxSpin + player.velocityY * 0.2;
                this.ball.velocityY = Math.max(-10, Math.min(10, this.ball.velocityY));
            }

            increaseSpeed() {
                const currentSpeed = Math.sqrt(this.ball.velocityX ** 2 + this.ball.velocityY ** 2);
                if (currentSpeed < this.ball.maxSpeed) {
                    const speedMultiplier = 1.03;
                    this.ball.velocityX *= speedMultiplier;
                    this.ball.velocityY *= speedMultiplier;
                }
            }

            createParticles(x, y, color, count = 8) {
                for (let i = 0; i < count; i++) {
                    this.particles.push({
                        x: x + (Math.random() - 0.5) * 20,
                        y: y + (Math.random() - 0.5) * 20,
                        velocityX: (Math.random() - 0.5) * 8,
                        velocityY: (Math.random() - 0.5) * 8,
                        life: 1,
                        decay: 0.015 + Math.random() * 0.01,
                        color: color,
                        size: Math.random() * 3 + 1
                    });
                }
            }

            updateParticles() {
                this.particles = this.particles.filter(particle => {
                    particle.x += particle.velocityX;
                    particle.y += particle.velocityY;
                    particle.life -= particle.decay;
                    particle.velocityX *= 0.99;
                    particle.velocityY *= 0.99;
                    return particle.life > 0;
                });
            }

            updateScreenShake() {
                if (this.screenShake.intensity > 0) {
                    this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
                    this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
                    this.screenShake.intensity *= 0.9;
                } else {
                    this.screenShake.x = 0;
                    this.screenShake.y = 0;
                }
            }

            resetBall() {
                this.ball.x = this.canvas.width / 2;
                this.ball.y = this.canvas.height / 2;
                this.ball.velocityX = 0;
                this.ball.velocityY = 0;
                this.ball.trailPositions = [];
                
                this.gameRunning = false;
                
                setTimeout(() => {
                    if (!this.checkWinCondition()) {
                        const angle = (Math.random() - 0.5) * Math.PI / 3;
                        const direction = Math.random() > 0.5 ? 1 : -1;
                        
                        this.ball.velocityX = Math.cos(angle) * this.ball.baseSpeed * direction;
                        this.ball.velocityY = Math.sin(angle) * this.ball.baseSpeed;
                        this.gameRunning = true;
                    }
                }, 1500);
            }

            updateScore() {
                this.player1ScoreEl.textContent = this.player1.score;
                this.player2ScoreEl.textContent = this.player2.score;
            }

            checkWinCondition() {
                if (this.player1.score >= this.winningScore) {
                    this.showGameStatus('🎉 Player 1 Wins! 🎉', '#00ffff');
                    this.gameStarted = false;
                    this.playSound(523, 0.2);
                    setTimeout(() => this.playSound(659, 0.2), 200); 
                    setTimeout(() => this.playSound(784, 0.2), 400); 
                    return true;
                } else if (this.player2.score >= this.winningScore) {
                    this.showGameStatus('🎉 Player 2 Wins! 🎉', '#ff1493');
                    this.gameStarted = false;
                    this.playSound(392, 0.2); 
                    setTimeout(() => this.playSound(494, 0.2), 200); 
                    setTimeout(() => this.playSound(587, 0.2), 400); 
                    return true;
                }
                return false;
            }

            showGameStatus(message, color) {
                this.gameStatus.textContent = message;
                this.gameStatus.style.color = color;
                this.gameStatus.style.borderColor = color;
                this.gameStatus.classList.add('show');
                
                setTimeout(() => {
                    this.gameStatus.classList.remove('show');
                }, 2000);
            }

            restart() {
                this.player1.score = 0;
                this.player2.score = 0;
                this.updateScore();
                this.initializeGame();
                this.gameStarted = false;
                this.gameRunning = false;
                this.gamePaused = false;
                this.pauseIndicator.classList.remove('show');
                this.playSound(523, 0.1);
                setTimeout(() => this.playSound(392, 0.1), 100);
            }

            drawBackground() {
                const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                gradient.addColorStop(0, '#0a0a0a');
                gradient.addColorStop(0.5, '#16213e');
                gradient.addColorStop(1, '#0f3460');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.save();
                this.backgroundStars.forEach(star => {
                    const twinkle = Math.sin(Date.now() * star.twinkleSpeed) * 0.2 + 0.8;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    this.ctx.fill();
                });
                this.ctx.restore();
                
                this.ctx.strokeStyle = 'rgba(255, 20, 147, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 10]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.canvas.width / 2, 0);
                this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }

            drawPaddles() {
                const player1Gradient = this.ctx.createLinearGradient(
                    this.player1.x, 0, 
                    this.player1.x + this.paddleWidth, 0
                );
                player1Gradient.addColorStop(0, `rgba(0, 255, 255, ${this.player1.glowIntensity * 0.8})`);
                player1Gradient.addColorStop(1, `rgba(0, 255, 255, ${this.player1.glowIntensity * 0.4})`);
                
                this.ctx.fillStyle = player1Gradient;
                this.ctx.shadowColor = 'rgba(0, 255, 255, 0.7)';
                this.ctx.shadowBlur = 15 * this.player1.glowIntensity;
                this.ctx.fillRect(
                    this.player1.x + this.screenShake.x, 
                    this.player1.y + this.screenShake.y, 
                    this.paddleWidth, 
                    this.paddleHeight
                );
                
                const player2Gradient = this.ctx.createLinearGradient(
                    this.player2.x, 0, 
                    this.player2.x + this.paddleWidth, 0
                );
                player2Gradient.addColorStop(0, `rgba(255, 20, 147, ${this.player2.glowIntensity * 0.8})`);
                player2Gradient.addColorStop(1, `rgba(255, 20, 147, ${this.player2.glowIntensity * 0.4})`);
                
                this.ctx.fillStyle = player2Gradient;
                this.ctx.shadowColor = 'rgba(255, 20, 147, 0.7)';
                this.ctx.shadowBlur = 15 * this.player2.glowIntensity;
                this.ctx.fillRect(
                    this.player2.x + this.screenShake.x, 
                    this.player2.y + this.screenShake.y, 
                    this.paddleWidth, 
                    this.paddleHeight
                );
                
                this.ctx.shadowColor = 'transparent';
            }

            drawBall() {
                this.ball.trailPositions.forEach((pos, i) => {
                    const alpha = i / this.ball.trailPositions.length * 0.6;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        pos.x + this.screenShake.x, 
                        pos.y + this.screenShake.y, 
                        this.ball.radius * (0.5 + i / this.ball.trailPositions.length * 0.5), 
                        0, 
                        Math.PI * 2
                    );
                    this.ctx.fill();
                });
                
                const gradient = this.ctx.createRadialGradient(
                    this.ball.x + this.screenShake.x, 
                    this.ball.y + this.screenShake.y, 
                    0,
                    this.ball.x + this.screenShake.x, 
                    this.ball.y + this.screenShake.y, 
                    this.ball.radius * 2
                );
                
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.ball.glowIntensity})`);
                gradient.addColorStop(1, 'rgba(255, 20, 147, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.ball.x + this.screenShake.x, 
                    this.ball.y + this.screenShake.y, 
                    this.ball.radius * 2, 
                    0, 
                    Math.PI * 2
                );
                this.ctx.fill();
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.shadowColor = 'rgba(255, 20, 147, 0.8)';
                this.ctx.shadowBlur = 15 * this.ball.glowIntensity;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.ball.x + this.screenShake.x, 
                    this.ball.y + this.screenShake.y, 
                    this.ball.radius, 
                    0, 
                    Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.shadowColor = 'transparent';
            }

            drawParticles() {
                this.particles.forEach(particle => {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.globalAlpha = particle.life;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        particle.x + this.screenShake.x, 
                        particle.y + this.screenShake.y, 
                        particle.size * particle.life, 
                        0, 
                        Math.PI * 2
                    );
                    this.ctx.fill();
                });
                this.ctx.globalAlpha = 1;
            }

            draw() {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.drawBackground();
                this.drawPaddles();
                this.drawBall();
                this.drawParticles();
            }

            updateFPS(timestamp) {
                if (!this.lastTime) {
                    this.lastTime = timestamp;
                    return;
                }
                
                const deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;
                
                if (this.fpsTime > 200) {
                    this.fps = Math.round(1000 / deltaTime);
                    this.fpsCounter.textContent = `FPS: ${this.fps}`;
                    this.fpsTime = 0;
                } else {
                    this.fpsTime += deltaTime;
                }
            }

            gameLoop(timestamp = 0) {
                this.updateFPS(timestamp);
                
                this.handleInput();
                this.updatePaddles();
                this.updateBall();
                this.updateParticles();
                this.updateScreenShake();
                this.draw();
                
                requestAnimationFrame((t) => this.gameLoop(t));
            }
        }

        window.addEventListener('load', () => {
            new EnhancedPinkPong();
        });
