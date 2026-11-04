/* ==========================================================================
   AI Spatial Reasoning Engine - Core JavaScript (app.js)
   ========================================================================== */

let gridSize = 15;
let grid = []; 
let agentPos = { x: 0, y: 0 };
let goalPos = { x: 14, y: 14 };
let isRunning = false;
let isPaused = false;
let agentColor = '#6366f1';

// Metrics & Clock Tracking
let stepCount = 0;
let loopCount = 0;
let stuckCount = 0;
let startTime = 0;
let pauseStart = 0;
let timerInterval = null;
let visitedHistory = [];

// DOM Elements
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const btnGenerate = document.getElementById('btnGenerate');
const btnRun = document.getElementById('btnRun');
const btnPause = document.getElementById('btnPause');
const btnThemeToggle = document.getElementById('btnThemeToggle');
const agentColorPicker = document.getElementById('agentColorPicker');
const btnConfig = document.getElementById('btnConfig');
const configModal = document.getElementById('configModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const modeDisplay = document.getElementById('modeDisplay');
const terminalLog = document.getElementById('terminalLog');
const statusIndicator = document.getElementById('statusIndicator');

const metricSteps = document.getElementById('metricSteps');
const metricTime = document.getElementById('metricTime');
const metricLoops = document.getElementById('metricLoops');
const metricStuck = document.getElementById('metricStuck');

window.addEventListener('load', () => {
    updateModeDisplay();
    resizeCanvas();
    generateMaze(gridSize);
});

window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    const parent = canvas.parentElement;
    const size = Math.min(parent.clientWidth - 32, parent.clientHeight - 32);
    canvas.width = size;
    canvas.height = size;
    drawMaze();
}

// --- Theme & Color Picker Handlers ---
agentColorPicker.addEventListener('input', (e) => {
    agentColor = e.target.value;
    drawMaze();
});

btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    btnThemeToggle.textContent = isLight ? '☀️' : '🌙';
    drawMaze();
});

// --- API Key Management ---
function getApiKeys() {
    return {
        groq: localStorage.getItem('spatial_groq_key') || '',
        openai: localStorage.getItem('spatial_openai_key') || '',
        claude: localStorage.getItem('spatial_claude_key') || ''
    };
}

function updateModeDisplay() {
    const keys = getApiKeys();
    if (keys.groq || keys.openai || keys.claude) {
        modeDisplay.textContent = "Live API Connected";
        modeDisplay.className = "text-indigo-400 font-semibold";
    } else {
        modeDisplay.textContent = "Simulated Fallback Mode";
        modeDisplay.className = "text-emerald-400 font-semibold";
    }
}

btnConfig.addEventListener('click', () => {
    document.getElementById('groqKeyInput').value = localStorage.getItem('spatial_groq_key') || '';
    document.getElementById('openaiKeyInput').value = localStorage.getItem('spatial_openai_key') || '';
    document.getElementById('claudeKeyInput').value = localStorage.getItem('spatial_claude_key') || '';
    configModal.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => configModal.classList.add('hidden'));

btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem('spatial_groq_key', document.getElementById('groqKeyInput').value.trim());
    localStorage.setItem('spatial_openai_key', document.getElementById('openaiKeyInput').value.trim());
    localStorage.setItem('spatial_claude_key', document.getElementById('claudeKeyInput').value.trim());
    configModal.classList.add('hidden');
    updateModeDisplay();
    logTerminal("System", "API Keys updated successfully.");
});

// --- Solvable Maze Generator (Recursive Backtracking DFS) ---
function generateMaze(size) {
    gridSize = parseInt(size);
    goalPos = { x: gridSize - 1, y: gridSize - 1 };
    agentPos = { x: 0, y: 0 };
    
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(1));

    function carve(x, y) {
        grid[y][x] = 0;
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] === 1) {
                grid[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(0, 0);
    grid[goalPos.y][goalPos.x] = 0;
    grid[goalPos.y - 1][goalPos.x] = 0;
    
    resetMetrics();
    drawMaze();
    logTerminal("Maze Engine", `Generated ${gridSize}x${gridSize} solvable maze layout.`);
}

gridSizeSelect.addEventListener('change', (e) => generateMaze(e.target.value));
btnGenerate.addEventListener('click', () => generateMaze(gridSizeSelect.value));

// --- Canvas Drawing Engine ---
function drawMaze() {
    if (!canvas.width || grid.length === 0) return;
    const cellSize = canvas.width / gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isLight = document.body.classList.contains('light-mode');
    const wallColor = isLight ? '#cbd5e1' : '#1e293b';
    const pathColor = isLight ? '#ffffff' : '#020617';

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            ctx.fillStyle = grid[y][x] === 1 ? wallColor : pathColor;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    // Start Point
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cellSize / 2, cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Goal Exit
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc((goalPos.x + 0.5) * cellSize, (goalPos.y + 0.5) * cellSize, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic Agent Color
    ctx.fillStyle = agentColor;
    ctx.beginPath();
    ctx.arc((agentPos.x + 0.5) * cellSize, (agentPos.y + 0.5) * cellSize, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function logTerminal(source, message, thought = null) {
    const entry = document.createElement('div');
    entry.className = "border-b border-slate-900 pb-1.5";
    let html = `<span class="text-indigo-400 font-bold">[${source}]</span> <span class="text-slate-300">${message}</span>`;
    if (thought) {
        html += `<div class="text-amber-400/90 text-[11px] mt-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-800">💭 <i>${thought}</i></div>`;
    }
    entry.innerHTML = html;
    terminalLog.appendChild(entry);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

function resetMetrics() {
    stepCount = 0;
    loopCount = 0;
    stuckCount = 0;
    visitedHistory = [`${agentPos.x},${agentPos.y}`];
    metricSteps.textContent = '0';
    metricTime.textContent = '0.0s';
    metricLoops.textContent = '0';
    metricStuck.textContent = '0';
    clearInterval(timerInterval);
}

// --- Execution Controls (Run, Pause, Stop) ---
btnRun.addEventListener('click', async () => {
    // Handle resuming from pause
    if (isRunning && isPaused) {
        const pausedDuration = Date.now() - pauseStart;
        startTime += pausedDuration; // Offset elapsed time by pause duration
        
        isPaused = false;
        btnRun.classList.add('hidden');
        btnPause.classList.remove('hidden');
        statusIndicator.textContent = "Running Benchmark...";
        
        // Restart the clock interval
        timerInterval = setInterval(() => {
            metricTime.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        }, 100);
        return;
    }

    if (isRunning) return;

    isRunning = true;
    isPaused = false;
    btnRun.classList.add('hidden');
    btnPause.classList.remove('hidden');
    statusIndicator.textContent = "Running Benchmark...";
    statusIndicator.className = "text-[10px] font-mono text-emerald-400 animate-pulse";

    resetMetrics();
    startTime = Date.now();
    timerInterval = setInterval(() => {
        metricTime.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    }, 100);

    const keys = getApiKeys();

    // Main execution loop runs indefinitely until exit reached or manually stopped
    while (isRunning) {
        if (isPaused) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }

        if (agentPos.x === goalPos.x && agentPos.y === goalPos.y) {
            logTerminal("SUCCESS", `Goal reached successfully in ${stepCount} steps and ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
            stopBenchmark();
            break;
        }

        let nextMove = null;
        let thoughtProcess = null;

        if (keys.groq) {
            const res = await fetchGroqNextMove(keys.groq);
            nextMove = res.move;
            thoughtProcess = res.thought;
        } else {
            await new Promise(r => setTimeout(r, 200)); 
            const res = simulateCognitiveMove();
            nextMove = res.move;
            thoughtProcess = res.thought;
        }

        executeMove(nextMove, thoughtProcess);
    }
});

btnPause.addEventListener('click', () => {
    isPaused = true;
    pauseStart = Date.now();
    clearInterval(timerInterval); // Immediately freeze the timer

    btnPause.classList.add('hidden');
    btnRun.classList.remove('hidden');
    btnRun.textContent = "▶ Resume";
    statusIndicator.textContent = "Paused";
    statusIndicator.className = "text-[10px] font-mono text-amber-400";
});

function stopBenchmark() {
    isRunning = false;
    isPaused = false;
    btnPause.classList.add('hidden');
    btnRun.classList.remove('hidden');
    btnRun.textContent = "▶ Run";
    clearInterval(timerInterval);
    statusIndicator.textContent = "Idle / Completed";
    statusIndicator.className = "text-[10px] font-mono text-slate-500";
}

function executeMove(direction, thought) {
    let targetX = agentPos.x;
    let targetY = agentPos.y;

    if (direction === 'UP') targetY--;
    if (direction === 'DOWN') targetY++;
    if (direction === 'LEFT') targetX--;
    if (direction === 'RIGHT') targetX++;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize || grid[targetY][targetX] === 1) {
        stuckCount++;
        metricStuck.textContent = stuckCount;
        logTerminal("AGENT", `Invalid move [${direction}] into wall.`, thought);
    } else {
        agentPos.x = targetX;
        agentPos.y = targetY;
        stepCount++;
        metricSteps.textContent = stepCount;

        const posKey = `${agentPos.x},${agentPos.y}`;
        if (visitedHistory.filter(p => p === posKey).length >= 2) {
            loopCount++;
            metricLoops.textContent = loopCount;
        }
        visitedHistory.push(posKey);

        logTerminal("AGENT", `Moved [${direction}] to (${agentPos.x}, ${agentPos.y})`, thought);
    }

    drawMaze();
}

async function fetchGroqNextMove(apiKey) {
    const localVision = getLocalVision(agentPos.x, agentPos.y);
    const systemPrompt = `You are an AI benchmark agent navigating a 2D maze. Position: (${agentPos.x}, ${agentPos.y}). Target: (${goalPos.x}, ${goalPos.y}). Vision: ${JSON.stringify(localVision)}. Respond ONLY with JSON: {"thought": "...", "move": "UP"|"DOWN"|"LEFT"|"RIGHT"}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return { move: parsed.move.toUpperCase(), thought: parsed.thought };
    } catch (err) {
        logTerminal("API ERROR", "Groq fetch failed. Falling back to simulation step.");
        return simulateCognitiveMove();
    }
}

function getLocalVision(x, y) {
    return {
        UP: (y > 0 && grid[y - 1][x] === 0) ? "OPEN" : "WALL",
        DOWN: (y < gridSize - 1 && grid[y + 1][x] === 0) ? "OPEN" : "WALL",
        LEFT: (x > 0 && grid[y][x - 1] === 0) ? "OPEN" : "WALL",
        RIGHT: (x < gridSize - 1 && grid[y][x + 1] === 0) ? "OPEN" : "WALL"
    };
}

function simulateCognitiveMove() {
    const vision = getLocalVision(agentPos.x, agentPos.y);
    const openMoves = Object.keys(vision).filter(d => vision[d] === "OPEN");
    let chosenMove = openMoves[Math.floor(Math.random() * openMoves.length)] || "DOWN";
    if (vision.RIGHT === "OPEN" && Math.random() > 0.4) chosenMove = "RIGHT";
    if (vision.DOWN === "OPEN" && Math.random() > 0.4) chosenMove = "DOWN";

    return {
        move: chosenMove,
        thought: `Evaluating position (${agentPos.x},${agentPos.y}) towards target (${goalPos.x},${goalPos.y}). Selected: ${chosenMove}.`
    };
}
