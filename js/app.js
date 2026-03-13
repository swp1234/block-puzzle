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
        this.lastClearWasTetris = false; // back-to-back tracking
        this.b2bCount = 0;
        this.floatingTexts = [];
        this.shakeFrames = 0;
        this.shakeAmount = 0;
        this.clearFlashLines = [];
        this.clearFlashTimer = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStarted = false;

        // Session stats
        this.sessionGames = 0;
        this.sessionLines = 0;

        // Milestone tracking
        this.milestoneThresholds = [500, 1000, 2000, 5000];
        this.milestonesHit = new Set();

        // PB tracking during gameplay
        this._liveNewBest = false;

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

        // Resume saved game if available
        if (this.loadGameState()) {
            this.showScreen('game-screen');
            this.gameRunning = true;
            this.gameStarted = true;
            this.gamePaused = false;
            this.lastDropTime = Date.now();
            requestAnimationFrame(() => {
                this.resizeCanvas();
                this.gameLoop();
            });
        }
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
            menuHighscore: document.getElementById('menu-highscore'),
            hudPb: document.getElementById('hud-pb'),
            hudPbValue: document.getElementById('hud-pb-value'),
            hudCombo: document.getElementById('hud-combo'),
            hudComboValue: document.getElementById('hud-combo-value'),
            milestoneOverlay: document.getElementById('milestone-overlay'),
            milestoneText: document.getElementById('milestone-text'),
            sessionGames: document.getElementById('session-games'),
            sessionLines: document.getElementById('session-lines')
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

        // Preload background image
        this.bgImage = null;
        this.bgImageReady = false;
        const bgImg = new Image();
        bgImg.onload = () => { this.bgImage = bgImg; this.bgImageReady = true; };
        bgImg.src = 'assets/bg-opt.jpg';

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

        // Quick restart: tap gameover background to restart
        if (this.elements.gameoverScreen) {
            this.elements.gameoverScreen.addEventListener('click', (e) => {
                // Only trigger on background tap (not buttons/links)
                if (e.target === this.elements.gameoverScreen) {
                    this.startGame();
                }
            });
        }
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

    showNewBest() {
        let el = document.getElementById('new-best-flash');
        if (!el) {
            el = document.createElement('div');
            el.id = 'new-best-flash';
            el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-family:var(--heading,"Syne",sans-serif);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
            document.body.appendChild(el);
        }
        el.textContent = 'NEW BEST!';
        el.style.transform = 'translate(-50%,-50%) scale(1.2)';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(0.8)';
            el.style.opacity = '0';
        }, 1200);
    }

    spawnConfetti(count = 30) {
        const colors = ['#00d4ff', '#ffff00', '#ff00ff', '#00ff00', '#ff0080', '#ff8000'];
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.style.cssText = `position:fixed;width:8px;height:8px;border-radius:${Math.random()>.5?'50%':'0'};pointer-events:none;z-index:9999;background:${colors[i%colors.length]};left:${50+(Math.random()-.5)*60}%;top:40%;opacity:1;transition:all 1s ease-out;`;
            document.body.appendChild(p);
            const tx = (Math.random() - 0.5) * 200;
            const ty = -80 - Math.random() * 150;
            requestAnimationFrame(() => {
                p.style.transform = `translate(${tx}px, ${ty}px) rotate(${Math.random()*360}deg)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 1200);
        }
    }

    startGame() {
        this._newBestShown = false;
        if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#gameover-screen');
        if(typeof gtag!=='undefined') gtag('event','game_start');
        // GA4 engagement event to reduce bounce rate
        if (!this._engagementFired) {
            this._engagementFired = true;
            if (typeof gtag === 'function') {
                gtag('event', 'engagement', { event_category: 'block_puzzle', event_label: 'first_interaction' });
            }
        }
        try {
            this.clearSavedState();
            this.grid = this.createEmptyGrid();
            this.score = 0;
            this.dropSpeed = 900;
            this.level = 1;
            this.lines = 0;
            this.combo = 0;
            this.lastClearWasTetris = false;
            this.b2bCount = 0;
            this.dropSpeed = 1000;
            this.dropCounter = 0;
            this.lastDropTime = Date.now();
            this.canHold = true;
            this.heldBlock = null;
            this.gameStarted = false;
            this.gamePaused = false;
            this.isSoftDropping = false;

            // Reset milestone tracking for this game
            this.milestonesHit = new Set();
            this._liveNewBest = false;
            this.sessionGames++;

            // Update PB display in HUD
            if (this.elements.hudPbValue) {
                this.elements.hudPbValue.textContent = this.highScore;
            }
            // Hide combo counter
            if (this.elements.hudCombo) {
                this.elements.hudCombo.classList.add('hidden');
            }

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
        } catch (e) {
            console.error('Error in startGame():', e);
        }
    }

    gameLoop() {
        if (!this.gameRunning) return;

        try {
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

                        this.saveGameState();
                    }
                    this.lastDropTime = now;
                }
            }

            this.render();
        } catch (e) {
            console.error('Game loop error:', e);
        }
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
        } else {
            this.saveGameState();
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

    getGhostY() {
        if (!this.currentBlock) return 0;
        let ghostY = this.currentBlock.y;
        const testBlock = {
            shape: this.currentBlock.shape,
            x: this.currentBlock.x,
            y: ghostY
        };
        while (!this.isColliding(testBlock)) {
            testBlock.y++;
        }
        return testBlock.y - 1;
    }

    lockBlock() {
        let maxY = 0;
        const blockColor = BLOCK_COLORS[this.currentBlock.type] || '#fff';
        for (let row = 0; row < this.currentBlock.shape.length; row++) {
            for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                if (!this.currentBlock.shape[row][col]) continue;

                const x = this.currentBlock.x + col;
                const y = this.currentBlock.y + row;

                if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
                    this.grid[y][x] = this.currentBlock.type;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Landing impact particles along the bottom of the piece
        const ghostDist = this.getGhostY() - this.currentBlock.y;
        if (ghostDist <= 0) {
            // Hard drop or natural landing — spawn impact particles
            for (let col = 0; col < this.currentBlock.shape[0].length; col++) {
                // Find bottom-most filled cell in this column
                let bottomRow = -1;
                for (let row = this.currentBlock.shape.length - 1; row >= 0; row--) {
                    if (this.currentBlock.shape[row][col]) { bottomRow = row; break; }
                }
                if (bottomRow < 0) continue;
                const px = (this.currentBlock.x + col) * this.blockSize + this.blockSize / 2;
                const py = (this.currentBlock.y + bottomRow + 1) * this.blockSize;
                for (let p = 0; p < 2; p++) {
                    this.floatingTexts.push({
                        text: '',
                        x: px, y: py,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -Math.random() * 2 - 0.5,
                        life: 12 + Math.random() * 8,
                        color: blockColor,
                        isParticle: true,
                        size: 2 + Math.random() * 2
                    });
                }
            }
        }

        if (window.sfx) window.sfx.play('lock');
        if (typeof Haptic !== 'undefined') Haptic.light();
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
            if (this.elements.hudCombo) this.elements.hudCombo.classList.add('hidden');
            return 0;
        }

        // Flash animation before clearing
        this.clearFlashLines = [...linesToClear];
        this.clearFlashTimer = 1;

        // Spawn block debris particles from cleared lines
        for (const row of linesToClear) {
            for (let col = 0; col < this.gridWidth; col++) {
                const cellType = this.grid[row][col];
                if (cellType) {
                    const px = col * this.blockSize + this.blockSize / 2;
                    const py = row * this.blockSize + this.blockSize / 2;
                    for (let p = 0; p < 3; p++) {
                        this.floatingTexts.push({
                            text: '',
                            x: px, y: py,
                            vx: (Math.random() - 0.5) * 6,
                            vy: -Math.random() * 4 - 1,
                            life: 25 + Math.random() * 15,
                            color: BLOCK_COLORS[cellType] || '#fff',
                            isParticle: true,
                            size: 3 + Math.random() * 3
                        });
                    }
                }
            }
        }

        // Remove cleared lines
        for (let i = linesToClear.length - 1; i >= 0; i--) {
            this.grid.splice(linesToClear[i], 1);
            this.grid.unshift(Array(this.gridWidth).fill(0));
        }

        this.lines += linesToClear.length;
        this.combo++;

        // Perfect clear bonus (board completely empty)
        const isPerfectClear = this.grid.every(row => row.every(cell => cell === 0));
        if (isPerfectClear) {
            const pcBonus = 1000 * this.level;
            this.score += pcBonus;
            this.floatingTexts.push({
                text: `PERFECT CLEAR! +${pcBonus}`,
                x: this.gridWidth * this.blockSize / 2,
                y: this.gridHeight * this.blockSize / 2,
                life: 70,
                color: '#fbbf24'
            });
            this.spawnConfetti(50);
            this.shakeAmount = 10;
            this.shakeFrames = 15;
            if (typeof Haptic !== 'undefined') Haptic.heavy();
            if (window.sfx) window.sfx.play('levelup');
        }

        // Back-to-back Tetris tracking
        const isTetris = linesToClear.length >= 4;
        if (isTetris && this.lastClearWasTetris) {
            this.b2bCount++;
        } else if (!isTetris) {
            this.b2bCount = 0;
        }
        this.lastClearWasTetris = isTetris;

        // Visual combo feedback
        const midRow = linesToClear[Math.floor(linesToClear.length / 2)];
        const comboMultiplier = Math.pow(1.2, this.combo - 1);
        const points = Math.floor(linesToClear.length * 100 * comboMultiplier);
        if (this.b2bCount >= 1 && isTetris) {
            // Back-to-back Tetris bonus
            const b2bBonus = 200 * this.b2bCount * this.level;
            this.score += b2bBonus;
            this.floatingTexts.push({
                text: `B2B TETRIS x${this.b2bCount}! +${b2bBonus}`,
                x: this.gridWidth * this.blockSize / 2,
                y: midRow * this.blockSize - 20,
                life: 70,
                color: '#fbbf24'
            });
            this.shakeAmount = 10;
            this.shakeFrames = 18;
            this.tetrisFlash = 1.0;
            this.spawnConfetti(30);
        } else if (this.combo >= 2) {
            this.floatingTexts.push({
                text: `${this.combo}x COMBO! +${points}`,
                x: this.gridWidth * this.blockSize / 2,
                y: midRow * this.blockSize,
                life: 50,
                color: this.combo >= 4 ? '#f39c12' : '#e74c3c'
            });
            this.shakeAmount = Math.min(this.combo * 2, 8);
            this.shakeFrames = 10;
        } else if (linesToClear.length >= 4) {
            this.floatingTexts.push({
                text: 'TETRIS!',
                x: this.gridWidth * this.blockSize / 2,
                y: midRow * this.blockSize,
                life: 60,
                color: '#00d4ff'
            });
            this.shakeAmount = 8;
            this.shakeFrames = 15;
            // Full-width flash effect for Tetris
            this.tetrisFlash = 1.0;
        }

        // Confetti on multi-line clears
        if (linesToClear.length >= 4) {
            this.spawnConfetti(40);
        } else if (linesToClear.length >= 2 || this.combo >= 3) {
            this.spawnConfetti(20);
        }

        if (window.sfx) window.sfx.play('clear');
        if (typeof Haptic !== 'undefined') Haptic.medium();

        return linesToClear.length;
    }

    updateScore(clearedLines) {
        const basePoints = clearedLines * 100;
        const comboMultiplier = Math.pow(1.2, this.combo - 1);
        const points = Math.floor(basePoints * comboMultiplier);

        this.score += points;
        this.sessionLines += clearedLines;
        this.elements.hudScore.textContent = this.score;

        // Combo HUD
        if (this.combo >= 2 && this.elements.hudCombo) {
            this.elements.hudCombo.classList.remove('hidden');
            if (this.elements.hudComboValue) {
                this.elements.hudComboValue.textContent = this.combo;
            }
            // Re-trigger animation
            this.elements.hudCombo.style.animation = 'none';
            void this.elements.hudCombo.offsetWidth;
            this.elements.hudCombo.style.animation = '';
        } else if (this.elements.hudCombo) {
            this.elements.hudCombo.classList.add('hidden');
        }

        // Live PB check
        if (this.score > this.highScore && !this._liveNewBest) {
            this._liveNewBest = true;
            if (this.elements.hudPb) {
                this.elements.hudPb.classList.add('new-record-flash');
                setTimeout(() => this.elements.hudPb.classList.remove('new-record-flash'), 600);
            }
            this.showNewBest();
        }
        if (this._liveNewBest && this.elements.hudPbValue) {
            this.elements.hudPbValue.textContent = this.score;
        }

        // Score milestone celebrations
        this.checkMilestones();

        // Difficulty curve
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
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
        this.elements.hudLevel.textContent = `${window.i18n?.t('hud.level') || 'Lv.'} ${this.level}`;
    }

    checkMilestones() {
        for (const threshold of this.milestoneThresholds) {
            if (this.score >= threshold && !this.milestonesHit.has(threshold)) {
                this.milestonesHit.add(threshold);
                this.showMilestone(threshold);
            }
        }
    }

    showMilestone(score) {
        const milestoneLabels = {
            500: window.i18n?.t('milestone.500') || '500 Points!',
            1000: window.i18n?.t('milestone.1000') || '1,000 Points!',
            2000: window.i18n?.t('milestone.2000') || '2,000 Points!',
            5000: window.i18n?.t('milestone.5000') || '5,000 Points!'
        };

        if (this.elements.milestoneOverlay && this.elements.milestoneText) {
            this.elements.milestoneText.textContent = milestoneLabels[score] || `${score}!`;
            this.elements.milestoneOverlay.classList.remove('hidden');

            // Re-trigger animation
            this.elements.milestoneText.style.animation = 'none';
            void this.elements.milestoneText.offsetWidth;
            this.elements.milestoneText.style.animation = '';

            this.spawnConfetti(score >= 5000 ? 60 : score >= 2000 ? 40 : 25);
            if (window.sfx) window.sfx.play('levelup');
            if (typeof Haptic !== 'undefined') Haptic.heavy();

            setTimeout(() => {
                this.elements.milestoneOverlay.classList.add('hidden');
            }, 1600);
        }
    }

    gameOver() {
        if(typeof gtag!=='undefined') gtag('event','game_over',{score:this.score});
        this.gameRunning = false;
        this.clearSavedState();

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
            if (!this._newBestShown) {
                this._newBestShown = true;
                this.showNewBest();
            }
        } else {
            this.elements.goNewRecord.classList.add('hidden');
        }

        if (typeof Haptic !== 'undefined') Haptic.heavy();
        if (typeof DailyStreak !== 'undefined') DailyStreak.report(this.score);
        if (typeof GameAchievements !== 'undefined') GameAchievements.report({
            bestScore: this.highScore,
            totalGames: this.leaderboard.getScores().length,
            bestCombo: this.combo
        });

        this.elements.goScore.textContent = this.score;
        this.elements.goLevel.textContent = this.level;
        this.elements.goBest.textContent = this.highScore;

        // Session stats
        if (this.elements.sessionGames) this.elements.sessionGames.textContent = this.sessionGames;
        if (this.elements.sessionLines) this.elements.sessionLines.textContent = this.sessionLines;

        // Display leaderboard
        this.displayLeaderboard(leaderboardResult);

        const showGameOverAndReward = () => {
            this.showScreen('gameover-screen');
            if (typeof GameAds !== 'undefined') {
                GameAds.injectRewardButton({
                    container: '#gameover-screen',
                    label: 'Watch Ad for 2x Score',
                    onReward: () => {
                        this.score *= 2;
                        this.elements.goScore.textContent = this.score;
                        if (this.score > this.highScore) {
                            this.highScore = this.score;
                            localStorage.setItem('blockPuzzleHighScore', this.score);
                            this.elements.goBest.textContent = this.highScore;
                        }
                    }
                });
            }
        };

        if (typeof GameAds !== 'undefined') {
            GameAds.showInterstitial({ onComplete: () => showGameOverAndReward() });
        } else {
            showGameOverAndReward();
        }
    }

    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;
        this.elements.pauseOverlay.classList.toggle('active');
    }

    quitGame() {
        this.gameRunning = false;
        this.clearSavedState();
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

    saveGameState() {
        try {
            const state = {
                grid: this.grid,
                score: this.score,
                level: this.level,
                lines: this.lines,
                combo: this.combo,
                dropSpeed: this.dropSpeed,
                currentBlock: this.currentBlock,
                nextBlocks: this.nextBlocks,
                heldBlock: this.heldBlock,
                canHold: this.canHold,
                gameOver: false
            };
            localStorage.setItem('blockPuzzle_gameState', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    loadGameState() {
        try {
            const saved = localStorage.getItem('blockPuzzle_gameState');
            if (!saved) return false;

            const state = JSON.parse(saved);
            if (!state || state.gameOver) {
                this.clearSavedState();
                return false;
            }

            this.grid = state.grid;
            this.score = state.score;
            this.level = state.level;
            this.lines = state.lines;
            this.combo = state.combo;
            this.dropSpeed = state.dropSpeed;
            this.currentBlock = state.currentBlock;
            this.nextBlocks = state.nextBlocks;
            this.heldBlock = state.heldBlock;
            this.canHold = state.canHold;

            // Update HUD
            this.elements.hudScore.textContent = this.score;
            this.elements.hudLevel.textContent = `${window.i18n?.t('hud.level') || 'Lv.'} ${this.level}`;

            return true;
        } catch (e) {
            console.warn('Failed to load game state:', e);
            this.clearSavedState();
            return false;
        }
    }

    clearSavedState() {
        localStorage.removeItem('blockPuzzle_gameState');
    }

    render() {
        // Game Canvas (use logical size, not DPR-scaled)
        const logicalW = this.gridWidth * this.blockSize;
        const logicalH = this.gridHeight * this.blockSize;

        this.ctx.save();

        // Screen shake
        if (this.shakeFrames > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(sx, sy);
            this.shakeFrames--;
        }

        // Background: image or fallback solid color
        if (this.bgImageReady) {
            this.ctx.drawImage(this.bgImage, -5, -5, logicalW + 10, logicalH + 10);
        } else {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(-5, -5, logicalW + 10, logicalH + 10);
        }

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

        // Ghost piece (landing preview)
        if (this.currentBlock) {
            const ghostY = this.getGhostY();
            if (ghostY !== this.currentBlock.y) {
                this.ctx.globalAlpha = 0.2;
                for (let row = 0; row < this.currentBlock.shape.length; row++) {
                    for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                        if (this.currentBlock.shape[row][col]) {
                            const x = this.currentBlock.x + col;
                            const y = ghostY + row;
                            if (y >= 0) {
                                this.drawBlock(this.ctx, x, y, this.currentBlock.type, this.blockSize);
                            }
                        }
                    }
                }
                this.ctx.globalAlpha = 1;
                // Ghost piece (translucent filled blocks)
                this.ctx.globalAlpha = 0.2;
                for (let row = 0; row < this.currentBlock.shape.length; row++) {
                    for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                        if (this.currentBlock.shape[row][col]) {
                            if (ghostY + row >= 0) {
                                this.drawBlock(this.ctx, this.currentBlock.x + col, ghostY + row, this.currentBlock.type, this.blockSize);
                            }
                        }
                    }
                }
                this.ctx.globalAlpha = 1;
                // Ghost border dashes
                this.ctx.strokeStyle = BLOCK_COLORS[this.currentBlock.type];
                this.ctx.lineWidth = 1.5;
                this.ctx.setLineDash([3, 3]);
                for (let row = 0; row < this.currentBlock.shape.length; row++) {
                    for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                        if (this.currentBlock.shape[row][col]) {
                            const x = (this.currentBlock.x + col) * this.blockSize;
                            const y = (ghostY + row) * this.blockSize;
                            if (ghostY + row >= 0) {
                                this.ctx.strokeRect(x + 1, y + 1, this.blockSize - 2, this.blockSize - 2);
                            }
                        }
                    }
                }
                this.ctx.setLineDash([]);
            }
        }

        // Line clear flash animation
        if (this.clearFlashLines && this.clearFlashLines.length > 0 && this.clearFlashTimer > 0) {
            const flashAlpha = Math.sin(this.clearFlashTimer * Math.PI * 3) * 0.6 + 0.3;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, flashAlpha)})`;
            for (const row of this.clearFlashLines) {
                this.ctx.fillRect(0, row * this.blockSize, this.gridWidth * this.blockSize, this.blockSize);
            }
            this.clearFlashTimer -= 0.02;
            if (this.clearFlashTimer <= 0) {
                this.clearFlashLines = [];
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

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            const alpha = ft.life / 50;
            this.ctx.globalAlpha = Math.min(1, alpha);

            if (ft.isParticle) {
                // Block debris particle
                this.ctx.fillStyle = ft.color;
                this.ctx.fillRect(ft.x - ft.size / 2, ft.y - ft.size / 2, ft.size, ft.size);
                ft.x += (ft.vx || 0);
                ft.y += (ft.vy || 0);
                ft.vy = (ft.vy || 0) + 0.15;
            } else {
                this.ctx.fillStyle = ft.color;
                this.ctx.font = `bold ${Math.min(20 + (50 - ft.life), 28)}px -apple-system, sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(ft.text, ft.x, ft.y);
                this.ctx.fillText(ft.text, ft.x, ft.y);
                ft.y -= 0.8;
            }

            ft.life--;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
        this.ctx.globalAlpha = 1;

        // Tetris flash overlay
        if (this.tetrisFlash > 0) {
            this.ctx.fillStyle = `rgba(0,212,255,${this.tetrisFlash * 0.3})`;
            this.ctx.fillRect(0, 0, this.gridWidth * this.blockSize, this.gridHeight * this.blockSize);
            this.tetrisFlash -= 0.04;
        }

        this.ctx.restore();

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
        const m = 1; // margin
        const s = size - m * 2;

        // Outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        // Base fill
        ctx.fillStyle = color;
        ctx.fillRect(x + m, y + m, s, s);
        ctx.shadowBlur = 0;

        // 3D top highlight
        const grad = ctx.createLinearGradient(x + m, y + m, x + m, y + m + s);
        grad.addColorStop(0, 'rgba(255,255,255,0.35)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + m, y + m, s, s);

        // Inner shine (top-left corner gloss)
        const r = size * 0.3;
        const shine = ctx.createRadialGradient(x + m + r * 0.6, y + m + r * 0.6, 0, x + m + r, y + m + r, r);
        shine.addColorStop(0, 'rgba(255,255,255,0.4)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine;
        ctx.fillRect(x + m, y + m, s, s);

        // Border edges for depth
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + m, y + m + s);
        ctx.lineTo(x + m, y + m);
        ctx.lineTo(x + m + s, y + m);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(x + m + s, y + m);
        ctx.lineTo(x + m + s, y + m + s);
        ctx.lineTo(x + m, y + m + s);
        ctx.stroke();
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
    try {
        // Initialize i18n
        if (window.i18n) {
            window.i18n.initI18n().then(() => {
                // Create game instance
                window.game = new BlockPuzzle();
                if (typeof GameAds !== 'undefined') GameAds.init();
                if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'block-puzzle', bestScoreKey: 'blockPuzzleHighScore', minTarget: 100 });
                if (typeof GameAchievements !== 'undefined') GameAchievements.init({
                    gameId: 'block-puzzle',
                    defs: [
                        { id: 'score_500', stat: 'bestScore', target: 500, icon: '⭐', name: 'Rising Star' },
                        { id: 'score_2000', stat: 'bestScore', target: 2000, icon: '🏆', name: 'Block Master' },
                        { id: 'score_5000', stat: 'bestScore', target: 5000, icon: '👑', name: 'Block Legend' },
                        { id: 'games_10', stat: 'totalGames', target: 10, icon: '🎮', name: 'Regular Player' },
                        { id: 'games_50', stat: 'totalGames', target: 50, icon: '🔥', name: 'Dedicated' },
                        { id: 'combo_5', stat: 'bestCombo', target: 5, icon: '💥', name: 'Combo King' }
                    ]
                });

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
                if (typeof GameAds !== 'undefined') GameAds.init();
                if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'block-puzzle', bestScoreKey: 'blockPuzzleHighScore', minTarget: 100 });
                if (typeof GameAchievements !== 'undefined') GameAchievements.init({
                    gameId: 'block-puzzle',
                    defs: [
                        { id: 'score_500', stat: 'bestScore', target: 500, icon: '⭐', name: 'Rising Star' },
                        { id: 'score_2000', stat: 'bestScore', target: 2000, icon: '🏆', name: 'Block Master' },
                        { id: 'score_5000', stat: 'bestScore', target: 5000, icon: '👑', name: 'Block Legend' },
                        { id: 'games_10', stat: 'totalGames', target: 10, icon: '🎮', name: 'Regular Player' },
                        { id: 'games_50', stat: 'totalGames', target: 50, icon: '🔥', name: 'Dedicated' },
                        { id: 'combo_5', stat: 'bestCombo', target: 5, icon: '💥', name: 'Combo King' }
                    ]
                });
                document.getElementById('app-loader').style.display = 'none';
            });
        } else {
            // Fallback if i18n fails
            console.warn('i18n not found, creating BlockPuzzle without i18n');
            window.game = new BlockPuzzle();
            if (typeof GameAds !== 'undefined') GameAds.init();
            if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'block-puzzle', bestScoreKey: 'blockPuzzleHighScore', minTarget: 100 });
            if (typeof GameAchievements !== 'undefined') GameAchievements.init({
                gameId: 'block-puzzle',
                defs: [
                    { id: 'score_500', stat: 'bestScore', target: 500, icon: '⭐', name: 'Rising Star' },
                    { id: 'score_2000', stat: 'bestScore', target: 2000, icon: '🏆', name: 'Block Master' },
                    { id: 'score_5000', stat: 'bestScore', target: 5000, icon: '👑', name: 'Block Legend' },
                    { id: 'games_10', stat: 'totalGames', target: 10, icon: '🎮', name: 'Regular Player' },
                    { id: 'games_50', stat: 'totalGames', target: 50, icon: '🔥', name: 'Dedicated' },
                    { id: 'combo_5', stat: 'bestCombo', target: 5, icon: '💥', name: 'Combo King' }
                ]
            });
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
