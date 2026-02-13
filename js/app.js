/**
 * Block Puzzle Game - Main Game Logic
 */

// Block Shapes (Tetromino)
const BLOCK_SHAPES = {
    I: [
        [[1, 1, 1, 1]]
    ],
    O: [
        [[1, 1], [1, 1]]
    ],
    T: [
        [[0, 1, 0], [1, 1, 1]],
        [[1, 0], [1, 1], [1, 0]],
        [[1, 1, 1], [0, 1, 0]],
        [[0, 1], [1, 1], [0, 1]]
    ],
    S: [
        [[0, 1, 1], [1, 1, 0]],
        [[1, 0], [1, 1], [0, 1]]
    ],
    Z: [
        [[1, 1, 0], [0, 1, 1]],
        [[0, 1], [1, 1], [1, 0]]
    ],
    J: [
        [[1, 0, 0], [1, 1, 1]],
        [[1, 1], [1, 0], [1, 0]],
        [[1, 1, 1], [0, 0, 1]],
        [[0, 1], [0, 1], [1, 1]]
    ],
    L: [
        [[0, 0, 1], [1, 1, 1]],
        [[1, 0], [1, 0], [1, 1]],
        [[1, 1, 1], [1, 0, 0]],
        [[1, 1], [0, 1], [0, 1]]
    ]
};

const BLOCK_COLORS = {
    I: '#00d4ff',
    O: '#ffff00',
    T: '#ff00ff',
    S: '#00ff00',
    Z: '#ff0080',
    J: '#ff8000',
    L: '#0080ff'
};

class BlockPuzzle {
    constructor() {
        this.gridWidth = 10;
        this.gridHeight = 20;
        this.blockSize = 30;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;

        // Game state
        this.grid = this.createEmptyGrid();
        this.currentBlock = null;
        this.nextBlocks = [];
        this.heldBlock = null;
        this.canHold = true;

        // Timing
        // Improved: Slower initial speed (900ms) for easier early game
        this.dropSpeed = 900; // ms
        this.dropCounter = 0;
        this.lastDropTime = 0;
        this.isSoftDropping = false;
        this.moveDirection = 0;
        this.moveInterval = null;

        // Leaderboard system
        this.leaderboard = new LeaderboardManager('block-puzzle', 10);

        // Initialize
        this.setupDOM();
        this.setupCanvas();
        this.loadHighScore();
        this.spawnNextBlocks();
        this.setupEventListeners();
        this.spawnBlock();
    }

    setupDOM() {
        this.elements = {
            gameScreen: document.getElementById('game-screen'),
            menuScreen: document.getElementById('menu-screen'),
            gameoverScreen: document.getElementById('gameover-screen'),
            statsScreen: document.getElementById('stats-screen'),
            pauseOverlay: document.getElementById('pause-overlay'),
            interstitialOverlay: document.getElementById('interstitial-overlay'),
            hudScore: document.getElementById('hud-score'),
            hudLevel: document.getElementById('hud-level'),
            tapHint: document.getElementById('tap-hint'),
            btnStart: document.getElementById('btn-start'),
            btnPause: document.getElementById('btn-pause'),
            btnResume: document.getElementById('btn-resume'),
            btnQuit: document.getElementById('btn-quit'),
            btnRetry: document.getElementById('btn-retry'),
            btnMenu: document.getElementById('btn-menu'),
            btnShare: document.getElementById('btn-share'),
            btnStats: document.getElementById('btn-stats'),
            btnStatsBack: document.getElementById('btn-stats-back'),
            btnHold: document.getElementById('btn-hold'),
            btnLeft: document.getElementById('btn-left'),
            btnRight: document.getElementById('btn-right'),
            btnRotate: document.getElementById('btn-rotate'),
            btnDrop: document.getElementById('btn-drop'),
            btnHardDrop: document.getElementById('btn-hard-drop'),
            goScore: document.getElementById('go-score'),
            goLevel: document.getElementById('go-level'),
            goBest: document.getElementById('go-best'),
            goNewRecord: document.getElementById('go-new-record'),
            statsContent: document.getElementById('stats-content'),
            menuHighscore: document.getElementById('menu-highscore')
        };

        // Validate critical DOM elements
        if (!this.elements.btnStart) {
            console.error('Critical DOM element btn-start not found!');
        }
        if (!this.elements.gameScreen) {
            console.error('Critical DOM element game-screen not found!');
        }
        if (!this.elements.menuScreen) {
            console.error('Critical DOM element menu-screen not found!');
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const isMobile = window.innerWidth <= 600;

        // Calculate available space from viewport
        const hud = document.querySelector('.game-hud');
        const hudHeight = hud ? hud.offsetHeight : 50;
        const padding = isMobile ? 12 : 24;

        let availableHeight, availableWidth;
        if (isMobile) {
            // Mobile: game above, sidebar below (~35% for sidebar)
            availableHeight = (window.innerHeight - hudHeight - padding) * 0.65;
            availableWidth = window.innerWidth - padding;
        } else {
            // Desktop: game left, sidebar right
            const sidebarWidth = 200;
            const gap = 16;
            availableHeight = window.innerHeight - hudHeight - padding;
            availableWidth = window.innerWidth - sidebarWidth - padding - gap;
        }

        // Height-driven block size (board is 10x20, always height-limited)
        const blockSizeH = availableHeight / this.gridHeight;
        const blockSizeW = availableWidth / this.gridWidth;
        this.blockSize = Math.floor(Math.min(blockSizeW, blockSizeH));
        this.blockSize = Math.max(20, this.blockSize);

        const width = this.gridWidth * this.blockSize;
        const height = this.gridHeight * this.blockSize;

        // High-DPI canvas for crisp rendering
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const previewSize = Math.max(80, Math.floor(this.blockSize * 4));
        this.nextCanvas.width = previewSize * dpr;
        this.nextCanvas.height = previewSize * dpr;
        this.nextCanvas.style.width = previewSize + 'px';
        this.nextCanvas.style.height = previewSize + 'px';
        this.nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.holdCanvas.width = previewSize * dpr;
        this.holdCanvas.height = previewSize * dpr;
        this.holdCanvas.style.width = previewSize + 'px';
        this.holdCanvas.style.height = previewSize + 'px';
        this.holdCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this._previewSize = previewSize;
        this.render();
    }

    setupEventListeners() {
        // Menu - Add null checks
        if (this.elements.btnStart) {
            this.elements.btnStart.addEventListener('click', () => this.startGame());
        } else {
            console.error('btnStart element not found for event listener');
        }

        if (this.elements.btnStats) {
            this.elements.btnStats.addEventListener('click', () => {
                // GA4 engagement event
                if (!this._engagementFired) {
                    this._engagementFired = true;
                    if (typeof gtag === 'function') {
                        gtag('event', 'engagement', { event_category: 'block_puzzle', event_label: 'first_interaction' });
                    }
                }
                this.showStats();
            });
        }

        if (this.elements.btnStatsBack) {
            this.elements.btnStatsBack.addEventListener('click', () => this.hideStats());
        }

        // Game Controls
        if (this.elements.btnPause) {
            this.elements.btnPause.addEventListener('click', () => this.togglePause());
        }

        if (this.elements.btnResume) {
            this.elements.btnResume.addEventListener('click', () => this.togglePause());
        }

        if (this.elements.btnQuit) {
            this.elements.btnQuit.addEventListener('click', () => this.quitGame());
        }

        if (this.elements.btnRetry) {
            this.elements.btnRetry.addEventListener('click', () => this.startGame());
        }

        if (this.elements.btnMenu) {
            this.elements.btnMenu.addEventListener('click', () => this.gotoMenu());
        }

        if (this.elements.btnShare) {
            this.elements.btnShare.addEventListener('click', () => this.shareScore());
        }

        // Hold
        if (this.elements.btnHold) {
            this.elements.btnHold.addEventListener('click', () => this.holdBlockAction());
        }

        // Mobile Buttons
        if (this.elements.btnLeft) {
            this.elements.btnLeft.addEventListener('mousedown', () => this.startMoving(-1));
            this.elements.btnLeft.addEventListener('mouseup', () => this.stopMoving());
            this.elements.btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.startMoving(-1); });
            this.elements.btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); this.stopMoving(); });
        }

        if (this.elements.btnRight) {
            this.elements.btnRight.addEventListener('mousedown', () => this.startMoving(1));
            this.elements.btnRight.addEventListener('mouseup', () => this.stopMoving());
            this.elements.btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.startMoving(1); });
            this.elements.btnRight.addEventListener('touchend', (e) => { e.preventDefault(); this.stopMoving(); });
        }

        if (this.elements.btnRotate) {
            this.elements.btnRotate.addEventListener('click', () => this.rotate());
        }

        if (this.elements.btnDrop) {
            this.elements.btnDrop.addEventListener('mousedown', () => { this.isSoftDropping = true; });
            this.elements.btnDrop.addEventListener('mouseup', () => { this.isSoftDropping = false; });
            this.elements.btnDrop.addEventListener('touchstart', (e) => { e.preventDefault(); this.isSoftDropping = true; });
            this.elements.btnDrop.addEventListener('touchend', (e) => { e.preventDefault(); this.isSoftDropping = false; });
        }

        if (this.elements.btnHardDrop) {
            this.elements.btnHardDrop.addEventListener('click', () => this.hardDrop());
        }

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Touch/Swipe
        let touchStartX = 0;
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        this.canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 30) this.move(1);
                else if (diffX < -30) this.move(-1);
            } else {
                if (diffY > 30) this.hardDrop();
                else if (diffY < -30) this.rotate();
            }
        });

        // Click to start
        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.elements.tapHint.classList.add('hidden');
            }
        });
    }

    handleKeyDown(e) {
        // Global shortcuts (work even when paused or on menu)
        switch(e.key.toLowerCase()) {
            case 'p':
            case 'escape':
                if (this.gameRunning) {
                    e.preventDefault();
                    this.togglePause();
                }
                return;
            case 'r':
                if (this.gameRunning || document.getElementById('gameover-screen').classList.contains('active')) {
                    e.preventDefault();
                    this.startGame();
                }
                return;
        }

        if (!this.gameRunning || this.gamePaused) return;

        switch(e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                e.preventDefault();
                this.move(-1);
                break;
            case 'arrowright':
            case 'd':
                e.preventDefault();
                this.move(1);
                break;
            case 'arrowdown':
            case 's':
                e.preventDefault();
                this.isSoftDropping = true;
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
            case 'z':
            case 'arrowup':
                e.preventDefault();
                this.rotate();
                break;
            case 'h':
                e.preventDefault();
                this.holdBlockAction();
                break;
        }
    }

    handleKeyUp(e) {
        if (e.key.toLowerCase() === 'arrowdown' || e.key.toLowerCase() === 's') {
            this.isSoftDropping = false;
        }
    }

    startMoving(direction) {
        this.moveDirection = direction;
        this.moveInterval = setInterval(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.move(direction);
            }
        }, 100);
    }

    stopMoving() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        this.moveDirection = 0;
    }

    startGame() {
        if(typeof gtag!=='undefined') gtag('event','game_start');
        // GA4 engagement event to reduce bounce rate
        if (!this._engagementFired) {
            this._engagementFired = true;
            if (typeof gtag === 'function') {
                gtag('event', 'engagement', { event_category: 'block_puzzle', event_label: 'first_interaction' });
            }
        }
        try {
            this.grid = this.createEmptyGrid();
            this.score = 0;
            // Improved: Start with slower speed (900ms) for easy early game
            this.dropSpeed = 900;
            this.level = 1;
            this.lines = 0;
            this.combo = 0;
            this.dropSpeed = 1000;
            this.dropCounter = 0;
            this.lastDropTime = Date.now();
            this.canHold = true;
            this.heldBlock = null;
            this.gameStarted = false;
            this.gamePaused = false;
            this.isSoftDropping = false;

            this.nextBlocks = [];
            this.spawnNextBlocks();
            this.spawnBlock();

            // Show game screen
            this.showScreen('game-screen');
            this.gameRunning = true;

            // Resize canvas after screen is visible
            requestAnimationFrame(() => this.resizeCanvas());

            if (this.elements.tapHint) {
                this.elements.tapHint.classList.remove('hidden');
            }

            // Start game loop
            this.gameLoop();
            console.log('Game started successfully');
        } catch (e) {
            console.error('Error in startGame():', e);
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;

        const now = Date.now();
        const deltaTime = now - this.lastDropTime;

        if (this.gameStarted && !this.gamePaused) {
            const effectiveSpeed = this.isSoftDropping ? this.dropSpeed * 0.2 : this.dropSpeed;

            if (deltaTime > effectiveSpeed) {
                if (!this.moveDown()) {
                    // Block locked
                    this.lockBlock();
                    const clearedLines = this.clearLines();

                    if (clearedLines > 0) {
                        this.updateScore(clearedLines);
                    }

                    this.spawnBlock();

                    if (this.isColliding(this.currentBlock)) {
                        this.gameOver();
                        return;
                    }
                }
                this.lastDropTime = now;
            }
        }

        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    createEmptyGrid() {
        return Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(0));
    }

    spawnNextBlocks() {
        while (this.nextBlocks.length < 3) {
            const keys = Object.keys(BLOCK_SHAPES);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            this.nextBlocks.push(randomKey);
        }
    }

    spawnBlock() {
        const blockType = this.nextBlocks.shift();
        const shape = BLOCK_SHAPES[blockType][0];
        this.currentBlock = {
            type: blockType,
            shape: shape,
            rotation: 0,
            x: Math.floor((this.gridWidth - shape[0].length) / 2),
            y: 0
        };

        this.canHold = true;
        this.spawnNextBlocks();
    }

    moveDown() {
        this.currentBlock.y++;
        if (this.isColliding(this.currentBlock)) {
            this.currentBlock.y--;
            return false;
        }
        return true;
    }

    move(direction) {
        this.currentBlock.x += direction;
        if (this.isColliding(this.currentBlock)) {
            this.currentBlock.x -= direction;
        }
    }

    rotate() {
        const block = BLOCK_SHAPES[this.currentBlock.type];
        const nextRotation = (this.currentBlock.rotation + 1) % block.length;
        const oldShape = this.currentBlock.shape;
        const oldRotation = this.currentBlock.rotation;

        this.currentBlock.shape = block[nextRotation];
        this.currentBlock.rotation = nextRotation;

        if (this.isColliding(this.currentBlock)) {
            // Wall kick attempt
            const width = this.currentBlock.shape[0].length;
            const kicks = [-1, 1, -2, 2];

            let kicked = false;
            for (const kick of kicks) {
                this.currentBlock.x += kick;
                if (!this.isColliding(this.currentBlock)) {
                    kicked = true;
                    break;
                }
            }

            if (!kicked) {
                this.currentBlock.shape = oldShape;
                this.currentBlock.rotation = oldRotation;
            }
        }

        if (window.sfx) window.sfx.play('rotate');
    }

    hardDrop() {
        while (this.moveDown()) {}
        this.lockBlock();
        const clearedLines = this.clearLines();
        if (clearedLines > 0) {
            this.updateScore(clearedLines);
        }
        this.spawnBlock();
        if (this.isColliding(this.currentBlock)) {
            this.gameOver();
        }
    }

    holdBlockAction() {
        if (!this.canHold || !this.currentBlock) return;

        const temp = this.currentBlock.type;
        if (this.heldBlock) {
            const shape = BLOCK_SHAPES[this.heldBlock][0];
            this.currentBlock = {
                type: this.heldBlock,
                shape: shape,
                rotation: 0,
                x: Math.floor((this.gridWidth - shape[0].length) / 2),
                y: 0
            };
        } else {
            this.nextBlocks.unshift(this.currentBlock.type);
            this.spawnBlock();
        }

        this.heldBlock = temp;
        this.canHold = false;
        if (window.sfx) window.sfx.play('hold');
    }

    isColliding(block) {
        for (let row = 0; row < block.shape.length; row++) {
            for (let col = 0; col < block.shape[row].length; col++) {
                if (!block.shape[row][col]) continue;

                const x = block.x + col;
                const y = block.y + row;

                if (x < 0 || x >= this.gridWidth || y >= this.gridHeight) return true;
                if (y >= 0 && this.grid[y][x]) return true;
            }
        }
        return false;
    }

    lockBlock() {
        for (let row = 0; row < this.currentBlock.shape.length; row++) {
            for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                if (!this.currentBlock.shape[row][col]) continue;

                const x = this.currentBlock.x + col;
                const y = this.currentBlock.y + row;

                if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
                    this.grid[y][x] = this.currentBlock.type;
                }
            }
        }
        if (window.sfx) window.sfx.play('lock');
    }

    clearLines() {
        const linesToClear = [];

        for (let row = this.gridHeight - 1; row >= 0; row--) {
            if (this.grid[row].every(cell => cell !== 0)) {
                linesToClear.push(row);
            }
        }

        if (linesToClear.length === 0) {
            this.combo = 0;
            return 0;
        }

        // Remove cleared lines
        for (let i = linesToClear.length - 1; i >= 0; i--) {
            this.grid.splice(linesToClear[i], 1);
            this.grid.unshift(Array(this.gridWidth).fill(0));
        }

        this.lines += linesToClear.length;
        this.combo++;

        if (window.sfx) window.sfx.play('clear');

        return linesToClear.length;
    }

    updateScore(clearedLines) {
        const basePoints = clearedLines * 100;
        const comboMultiplier = Math.pow(1.2, this.combo - 1);
        const points = Math.floor(basePoints * comboMultiplier);

        this.score += points;
        this.elements.hudScore.textContent = this.score;

        // Improved difficulty curve: slower early game, faster later
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            // Early game: slow speed increase (lines 1-20 = levels 1-2, stay at 900ms)
            // Mid game: moderate speed increase (lines 20-60 = levels 2-6, decrease 25ms/level)
            // Late game: faster speed increase (lines 60+ = levels 6+, decrease 35ms/level)
            let newSpeed;
            if (this.level <= 2) {
                newSpeed = 900;
            } else if (this.level <= 6) {
                newSpeed = 900 - ((this.level - 2) * 25);
            } else {
                newSpeed = 800 - ((this.level - 6) * 35);
            }
            this.dropSpeed = Math.max(200, newSpeed);
            if (window.sfx) window.sfx.play('levelup');
        }
        this.elements.hudLevel.textContent = `Lv. ${this.level}`;
    }

    gameOver() {
        if(typeof gtag!=='undefined') gtag('event','game_over',{score:this.score});
        this.gameRunning = false;

        // Add score to leaderboard
        const leaderboardResult = this.leaderboard.addScore(this.score, {
            level: this.level,
            lines: this.lines,
            combo: this.combo
        });

        const isNewRecord = leaderboardResult.isNewRecord;
        if (isNewRecord) {
            this.highScore = this.score;
            localStorage.setItem('blockPuzzleHighScore', this.score);
            this.elements.goNewRecord.classList.remove('hidden');
        } else {
            this.elements.goNewRecord.classList.add('hidden');
        }

        this.elements.goScore.textContent = this.score;
        this.elements.goLevel.textContent = this.level;
        this.elements.goBest.textContent = this.highScore;

        // Display leaderboard
        this.displayLeaderboard(leaderboardResult);

        this.showScreen('gameover-screen');
    }

    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;
        this.elements.pauseOverlay.classList.toggle('active');
    }

    quitGame() {
        this.gameRunning = false;
        this.elements.pauseOverlay.classList.remove('active');
        this.gotoMenu();
    }

    gotoMenu() {
        this.gameRunning = false;
        this.elements.pauseOverlay.classList.remove('active');
        this.showScreen('menu-screen');
        this.elements.menuHighscore.querySelector('.hs-value').textContent = this.highScore;
    }

    showStats() {
        const stats = `
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.highScore') || 'High Score'}</span>
                <span class="stat-value">${this.highScore}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.currentScore') || 'Current Score'}</span>
                <span class="stat-value">${this.score}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.linesCleared') || 'Lines Cleared'}</span>
                <span class="stat-value">${this.lines}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.currentLevel') || 'Current Level'}</span>
                <span class="stat-value">Lv. ${this.level}</span>
            </div>
        `;
        this.elements.statsContent.innerHTML = stats;
        this.showScreen('stats-screen');
    }

    hideStats() {
        this.showScreen('menu-screen');
    }

    showScreen(screenId) {
        try {
            document.querySelectorAll('.screen').forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden');
            });
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('active');
                screen.classList.remove('hidden');
                console.log(`Screen switched to: ${screenId}`);
            } else {
                console.error(`Screen element not found: ${screenId}`);
            }
        } catch (e) {
            console.error(`Error in showScreen(${screenId}):`, e);
        }
    }

    shareScore() {
        const shareTemplate = window.i18n?.t('share_msg.text') || '🧩 Block Puzzle: {score} pts!\nLevel: {level}\n\n{url}';
        const text = shareTemplate.replace('{score}', this.score).replace('{level}', this.level).replace('{url}', location.href);

        if (navigator.share) {
            navigator.share({
                title: 'Block Puzzle',
                text: text,
                url: location.href
            });
        } else {
            alert(text);
        }
    }

    loadHighScore() {
        this.highScore = parseInt(localStorage.getItem('blockPuzzleHighScore') || '0');
        this.elements.menuHighscore.querySelector('.hs-value').textContent = this.highScore;
    }

    render() {
        // Game Canvas (use logical size, not DPR-scaled)
        const logicalW = this.gridWidth * this.blockSize;
        const logicalH = this.gridHeight * this.blockSize;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, logicalW, logicalH);

        // Grid
        this.ctx.strokeStyle = 'rgba(155, 89, 182, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridWidth; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.blockSize, 0);
            this.ctx.lineTo(i * this.blockSize, logicalH);
            this.ctx.stroke();
        }
        for (let i = 0; i <= this.gridHeight; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.blockSize);
            this.ctx.lineTo(logicalW, i * this.blockSize);
            this.ctx.stroke();
        }

        // Placed blocks
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col]) {
                    this.drawBlock(this.ctx, col, row, this.grid[row][col], this.blockSize);
                }
            }
        }

        // Current block
        if (this.currentBlock) {
            for (let row = 0; row < this.currentBlock.shape.length; row++) {
                for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                    if (this.currentBlock.shape[row][col]) {
                        const x = this.currentBlock.x + col;
                        const y = this.currentBlock.y + row;
                        if (y >= 0) {
                            this.drawBlock(this.ctx, x, y, this.currentBlock.type, this.blockSize);
                        }
                    }
                }
            }
        }

        // Next preview
        this.renderNextPreview();

        // Hold preview
        this.renderHoldPreview();
    }

    renderNextPreview() {
        const ps = this._previewSize || 80;
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, ps, ps);

        if (this.nextBlocks.length > 0) {
            const blockType = this.nextBlocks[0];
            const shape = BLOCK_SHAPES[blockType][0];
            const blockSize = Math.floor(ps / 5);
            const offsetX = (ps - shape[0].length * blockSize) / 2;
            const offsetY = (ps - shape.length * blockSize) / 2;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const x = offsetX + col * blockSize;
                        const y = offsetY + row * blockSize;
                        this.drawBlockDirect(this.nextCtx, x, y, blockType, blockSize);
                    }
                }
            }
        }
    }

    renderHoldPreview() {
        const ps = this._previewSize || 80;
        this.holdCtx.fillStyle = '#000';
        this.holdCtx.fillRect(0, 0, ps, ps);

        if (this.heldBlock) {
            const shape = BLOCK_SHAPES[this.heldBlock][0];
            const blockSize = Math.floor(ps / 5);
            const offsetX = (ps - shape[0].length * blockSize) / 2;
            const offsetY = (ps - shape.length * blockSize) / 2;

            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const x = offsetX + col * blockSize;
                        const y = offsetY + row * blockSize;
                        this.drawBlockDirect(this.holdCtx, x, y, this.heldBlock, blockSize);
                    }
                }
            }
        }

        this.elements.btnHold.disabled = !this.canHold;
    }

    drawBlock(ctx, col, row, type, size) {
        const x = col * size;
        const y = row * size;
        this.drawBlockDirect(ctx, x, y, type, size);
    }

    drawBlockDirect(ctx, x, y, type, size) {
        const color = BLOCK_COLORS[type];

        // Block
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        ctx.shadowBlur = 0;
    }
}

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

// Initialize game when DOM is ready
window.addEventListener('load', () => {
    console.log('Window load event fired');
    try {
        // Initialize i18n
        if (window.i18n) {
            console.log('i18n found, initializing...');
            window.i18n.initI18n().then(() => {
                console.log('i18n initialized successfully');
                // Create game instance
                window.game = new BlockPuzzle();
                console.log('BlockPuzzle instance created');

                // Hide loader
                const loader = document.getElementById('app-loader');
                if (loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                    }, 300);
                }
            }).catch((err) => {
                console.error('i18n initialization failed:', err);
                // Fallback to game creation
                window.game = new BlockPuzzle();
                document.getElementById('app-loader').style.display = 'none';
            });
        } else {
            // Fallback if i18n fails
            console.warn('i18n not found, creating BlockPuzzle without i18n');
            window.game = new BlockPuzzle();
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Error in window load handler:', e);
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
});

// Add displayLeaderboard method to BlockPuzzle
BlockPuzzle.prototype.displayLeaderboard = function(leaderboardResult) {
    const gameoverScreen = document.getElementById('gameover-screen');
    let leaderboardContainer = gameoverScreen.querySelector('.leaderboard-section');
    if (!leaderboardContainer) {
        leaderboardContainer = document.createElement('div');
        leaderboardContainer.className = 'leaderboard-section';
        gameoverScreen.appendChild(leaderboardContainer);
    }

    const topScores = this.leaderboard.getTopScores(5);
    const currentScore = parseInt(document.getElementById('go-score').textContent);

    let html = '<div class="leaderboard-title">🏆 Top 5 Scores</div>';
    html += '<div class="leaderboard-list">';

    topScores.forEach((entry, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const isCurrentScore = entry.score === currentScore && leaderboardResult.isNewRecord;
        const classes = isCurrentScore ? 'leaderboard-item highlight' : 'leaderboard-item';

        html += `
            <div class="${classes}">
                <span class="medal">${medals[index] || (index + 1) + '.'}</span>
                <span class="score-value">${entry.score}</span>
                <span class="score-date">${entry.date}</span>
            </div>
        `;
    });

    html += '</div>';
    html += '<button id="reset-leaderboard-btn" class="reset-btn">Reset Records</button>';

    leaderboardContainer.innerHTML = html;

    const resetBtn = leaderboardContainer.querySelector('#reset-leaderboard-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all records?')) {
                this.leaderboard.resetScores();
                this.highScore = 0;
                localStorage.setItem('blockPuzzleHighScore', '0');
                this.displayLeaderboard({ isNewRecord: false, rank: -1, notifications: [] });
                alert('Records reset!');
            }
        });
    }

    leaderboardResult.notifications.forEach(notif => {
        this.showNotification(notif);
    });
};

BlockPuzzle.prototype.showNotification = function(notification) {
    const notifEl = document.createElement('div');
    notifEl.className = `notification notification-${notification.type}`;
    notifEl.textContent = notification.message;
    notifEl.style.position = 'fixed';
    notifEl.style.top = '20px';
    notifEl.style.right = '20px';
    notifEl.style.padding = '12px 20px';
    notifEl.style.backgroundColor = notification.type === 'new-record' ? '#FFD700' : '#4CAF50';
    notifEl.style.color = '#000';
    notifEl.style.borderRadius = '8px';
    notifEl.style.fontSize = '14px';
    notifEl.style.fontWeight = 'bold';
    notifEl.style.zIndex = '9999';
    notifEl.style.animation = 'slideIn 0.3s ease-out';

    document.body.appendChild(notifEl);

    setTimeout(() => {
        notifEl.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notifEl.remove(), 300);
    }, 3000);
};
