export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 20;
export const LOCK_DELAY = 173;

export const TETROMINOES = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // O
    [
        [1, 1],
        [1, 1]
    ],
    // T
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // S
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    // Z
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    // J
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
];

export const COLORS = ['#000', '#0ff', '#ff0', '#f0f', '#0f0', '#00f', '#f00', '#ff8000'];
export const LIGHT_COLORS = ['#f0f0f0', '#0066cc', '#ffcc00', '#cc00cc', '#00cc00', '#0000cc', '#cc0000', '#ff8800'];

export function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function createPiece(type) {
    const shape = TETROMINOES[type];
    return {
        shape,
        color: type + 1,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

export function rotateMatrix(matrix) {
    return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
}

export function isValidMove(board, piece, newX, newY, newShape = piece.shape) {
    for (let y = 0; y < newShape.length; y++) {
        for (let x = 0; x < newShape[y].length; x++) {
            if (!newShape[y][x]) continue;
            const boardX = newX + x;
            const boardY = newY + y;
            if (boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && board[boardY][boardX])) {
                return false;
            }
        }
    }
    return true;
}

export function placePiece(board, piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[piece.y + y][piece.x + x] = piece.color;
            }
        });
    });
}

export function clearLines(board) {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    return linesCleared;
}

let canvas = null;
let ctx = null;
let nextCanvas = null;
let nextCtx = null;
let board = createBoard();
let score = 0;
let lines = 0;
let level = 1;
let highScore = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
let currentPiece = null;
let nextPiece = null;
let gameRunning = true;
let dropTimer = 0;
let dropInterval = 1000;
let lockTimer = 0;
let lockResetThisTouch = false;
let isDarkMode = true;
let lastTime = 0;

function getColorArray() {
    return isDarkMode ? COLORS : LIGHT_COLORS;
}

function updateBorderColor() {
    if (!currentPiece) return;
    const colorArray = getColorArray();
    const borderColor = colorArray[currentPiece.color] || (isDarkMode ? '#0ff' : '#0066cc');
    document.documentElement.style.setProperty('--border-color', borderColor);
}

function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    const colorArray = getColorArray();
    const blockX = x * blockSize;
    const blockY = y * blockSize;
    const radius = blockSize * 0.15;

    context.fillStyle = colorArray[color];

    if (context.roundRect) {
        context.beginPath();
        context.roundRect(blockX, blockY, blockSize, blockSize, radius);
        context.fill();
    } else {
        context.fillRect(blockX, blockY, blockSize, blockSize);
    }

    context.strokeStyle = isDarkMode ? '#fff' : '#000';
    context.lineWidth = 1;
    context.strokeRect(blockX, blockY, blockSize, blockSize);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
}

function drawPiece(piece, context = ctx, offsetX = 0, offsetY = 0, blockSize = BLOCK_SIZE) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(piece.x + x + offsetX, piece.y + y + offsetY, piece.color, context, blockSize);
            }
        });
    });
}

function drawNextPiece() {
    if (!nextCtx) return;
    nextCtx.fillStyle = isDarkMode ? '#001' : '#fff';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece || !nextPiece.shape) {
        nextCtx.fillStyle = isDarkMode ? '#fff' : '#000';
        nextCtx.font = '20px Arial';
        nextCtx.textAlign = 'center';
        nextCtx.fillText('?', nextCanvas.width / 2, nextCanvas.height / 2 + 7);
        return;
    }

    const nextBlockSize = 15;
    const offsetX = Math.floor((nextCanvas.width / nextBlockSize - nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((nextCanvas.height / nextBlockSize - nextPiece.shape.length) / 2);
    drawPiece(nextPiece, nextCtx, offsetX, offsetY, nextBlockSize);
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

function checkHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore.toString());
        updateDisplay();
    }
}

function gameOver() {
    gameRunning = false;
    ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDarkMode ? '#fff' : '#000';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Arial';
    ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 40);
}

function resetGroundLock() {
    if (!isValidMove(board, currentPiece, currentPiece.x, currentPiece.y + 1) && !lockResetThisTouch) {
        lockTimer = 0;
        lockResetThisTouch = true;
    }
}

function movePieceDown() {
    if (isValidMove(board, currentPiece, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 1;
        checkHighScore();
        updateDisplay();
        resetGroundLock();
        return true;
    }
    return false;
}

function dropPiece() {
    if (!movePieceDown()) {
        placePiece(board, currentPiece);
        const linesCleared = clearLines(board);
        if (linesCleared > 0) {
            lines += linesCleared;
            score += linesCleared * 20;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(50, 1000 - (level - 1) * 50);
            checkHighScore();
            updateDisplay();
        }
        currentPiece = nextPiece;
        nextPiece = createPiece(Math.floor(Math.random() * TETROMINOES.length));
        updateBorderColor();
        if (!isValidMove(board, currentPiece, currentPiece.x, currentPiece.y)) {
            gameOver();
        }
    }
}

function hardDrop() {
    while (isValidMove(board, currentPiece, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 1;
    }
    dropPiece();
    checkHighScore();
    updateDisplay();
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    document.getElementById('themeToggle').textContent = isDarkMode ? '🌙 Dark' : '☀️ Light';
    updateBorderColor();
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
}

function resetGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropTimer = 0;
    lockTimer = 0;
    lockResetThisTouch = false;
    gameRunning = true;
    lastTime = 0;
    currentPiece = createPiece(Math.floor(Math.random() * TETROMINOES.length));
    nextPiece = createPiece(Math.floor(Math.random() * TETROMINOES.length));
    updateBorderColor();
    updateDisplay();
    drawBoard();
    drawNextPiece();
}

function handleInput(event) {
    if (!gameRunning && event.key.toLowerCase() !== 'r') return;

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault();
            if (isValidMove(board, currentPiece, currentPiece.x - 1, currentPiece.y)) {
                currentPiece.x--;
                resetGroundLock();
            }
            break;
        case 'ArrowRight':
            event.preventDefault();
            if (isValidMove(board, currentPiece, currentPiece.x + 1, currentPiece.y)) {
                currentPiece.x++;
                resetGroundLock();
            }
            break;
        case 'ArrowDown':
            event.preventDefault();
            movePieceDown();
            break;
        case 'ArrowUp':
            event.preventDefault();
            const rotated = rotateMatrix(currentPiece.shape);
            if (isValidMove(board, currentPiece, currentPiece.x, currentPiece.y, rotated)) {
                currentPiece.shape = rotated;
            }
            resetGroundLock();
            break;
        case ' ': // Space bar for hard drop
            event.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            gameRunning = !gameRunning;
            break;
        case 'r':
        case 'R':
            if (!gameRunning) {
                resetGame();
            } else {
                const rotatedR = rotateMatrix(currentPiece.shape);
                if (isValidMove(board, currentPiece, currentPiece.x, currentPiece.y, rotatedR)) {
                    currentPiece.shape = rotatedR;
                }
                resetGroundLock();
            }
            break;
    }
}

function addControlListener(elementId, handler) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.addEventListener('touchstart', event => {
        event.preventDefault();
        handler();
    });

    element.addEventListener('mousedown', event => {
        event.preventDefault();
        handler();
    });
}

function gameLoop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (!gameRunning) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const canFall = isValidMove(board, currentPiece, currentPiece.x, currentPiece.y + 1);
    if (canFall) {
        lockTimer = 0;
        lockResetThisTouch = false;
        dropTimer += deltaTime;
        if (dropTimer >= dropInterval) {
            dropPiece();
            dropTimer = 0;
        }
    } else {
        dropTimer = 0;
        lockTimer += deltaTime;
        if (lockTimer >= LOCK_DELAY) {
            placePiece(board, currentPiece);
            const linesCleared = clearLines(board);
            if (linesCleared > 0) {
                lines += linesCleared;
                score += linesCleared * 20;
                level = Math.floor(lines / 10) + 1;
                dropInterval = Math.max(50, 1000 - (level - 1) * 50);
                checkHighScore();
                updateDisplay();
            }
            currentPiece = nextPiece;
            nextPiece = createPiece(Math.floor(Math.random() * TETROMINOES.length));
            updateBorderColor();
            if (!isValidMove(board, currentPiece, currentPiece.x, currentPiece.y)) {
                gameOver();
            }
            lockTimer = 0;
            dropTimer = 0;
        }
    }

    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
    requestAnimationFrame(gameLoop);
}

export function initTetrisGame() {
    canvas = document.getElementById('gameCanvas');
    nextCanvas = document.getElementById('nextCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

    if (!canvas || !ctx || !nextCanvas || !nextCtx) {
        return;
    }

    document.addEventListener('keydown', handleInput);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('resetBtn')?.addEventListener('click', resetGame);
    document.getElementById('pauseBtn')?.addEventListener('click', () => {
        gameRunning = !gameRunning;
    });
    document.getElementById('backBtn')?.addEventListener('click', () => {
        window.location.href = '/';
    });

    addControlListener('aBtn', () => {
        if (isValidMove(board, currentPiece, currentPiece.x - 1, currentPiece.y)) {
            currentPiece.x--;
            resetGroundLock();
        }
    });

    addControlListener('dBtn', () => {
        if (isValidMove(board, currentPiece, currentPiece.x + 1, currentPiece.y)) {
            currentPiece.x++;
            resetGroundLock();
        }
    });

    addControlListener('wBtn', hardDrop);
    addControlListener('eBtn', () => {
        const rotated = rotateMatrix(currentPiece.shape);
        if (isValidMove(board, currentPiece, currentPiece.x, currentPiece.y, rotated)) {
            currentPiece.shape = rotated;
        }
        resetGroundLock();
    });
    addControlListener('rBtn', () => {
        gameRunning = !gameRunning;
    });
    addControlListener('sBtn', movePieceDown);

    updateDisplay();
    resetGame();
    requestAnimationFrame(gameLoop);
}

if (typeof document !== 'undefined' && document.getElementById('gameCanvas')) {
    initTetrisGame();
}
