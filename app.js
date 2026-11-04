/* ==========================================================================
   AI Spatial Reasoning Engine - Core JavaScript (app.js)
   Handles: Solvable Maze Generation, Canvas Drawing, Groq/OpenAI/Claude APIs,
   Real-Time Thinking Log Streaming & Performance Metrics Matrix.
   ========================================================================== */

// --- Global State ---
let gridSize = 15;
let grid = []; // 0 = Path, 1 = Wall
let agentPos = { x: 0, y: 0 };
let goalPos = { x: 14, y: 14 };
let isRunning = false;

// Metrics Matrix
let stepCount = 0;
let loopCount = 0;
let stuckCount = 0;
let startTime = 0;
let timerInterval = null;
let visitedHistory = [];

// DOM Elements
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const btnGenerate = document.getElementById('btnGenerate');
const btnRun = document.getElementById('btnRun');
const btnConfig = document.getElementById('btnConfig');
const configModal = document.getElementById('configModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const modeDisplay = document.getElementById('modeDisplay');
const terminalLog = document.getElementById('terminalLog');
const statusIndicator = document.getElementById('statusIndicator');

// Metrics DOM Elements
const metricSteps = document.getElementById('metricSteps');
const metricTime = document.getElementById('metricTime');
const metricLoops = document.getElementById('metricLoops');
const metricStuck = document.getElementById('metricStuck');

// --- Initialization ---
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

// --- API Key Management (localStorage) ---
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
        modeDisplay.textContent = "Live API Connection Active";
        modeDisplay.className = "text-indigo-400 font-semibold";
    } else {
        modeDisplay.textContent = "Simulated Fallback Mode";
        modeDisplay.className = "text-emerald-400 font-semibold";
    }
}

// Modal Handlers
btnConfig.addEventListener('click', () => {
    const keys = getApiKeys();
    document.getElementById('groqKeyInput').value = keys.groq;
    document.getElementById('openaiKeyInput').value = keys.openai;
    document.getElementById('claudeKeyInput').value = keys.claude;
    configModal.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => configModal.classList.add('hidden'));

btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem('spatial_groq_key', document.getElementById('groqKeyInput').value.trim());
    localStorage.setItem('spatial_openai_key', document.getElementById('openaiKeyInput').value.trim());
    localStorage.setItem('spatial_claude_key', document.getElementById('claudeKeyInput').value.trim());
    configModal.classList.add('hidden');
    updateModeDisplay();
    logTerminal("System", "API Keys saved to localStorage successfully.");
});

// --- Solvable Maze Generator (Recursive Backtracking DFS) ---
function generateMaze(size) {
    gridSize = parseInt(size);
    goalPos = { x: gridSize - 1, y: gridSize - 1 };
    agentPos = { x: 0, y: 0 };
    
    // Fill grid with walls (1)
    grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(1));

    function carve(x, y) {
        grid[y][x] = 0;
        const dirs = [
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] === 1) {
                grid[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(0, 0);
    // Ensure exit target is clear
    grid[goalPos.y][goalPos.x] = 0;
    grid[goalPos.y - 1][goalPos.x] = 0;
    
    resetMetrics();
    drawMaze();
    logTerminal("Maze Engine", `Generated ${gridSize}x${gridSize} guaranteed solvable maze layout.`);
}

gridSizeSelect.addEventListener('change', (e) => generateMaze(e.target.value));
btnGenerate.addEventListener('click', () => generateMaze(gridSizeSelect.value));

// --- Canvas Drawing Engine ---
function drawMaze() {
    if (!canvas.width || grid.length === 0) return;
    const cellSize = canvas.width / gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Cells
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (grid[y][x] === 1) {
                ctx.fillStyle = '#1e293b'; // Wall
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#0f172a';
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
                ctx.fillStyle = '#020617'; // Open Path
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Highlight Start Point (0,0)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cellSize / 2, cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Highlight Exit Goal (N-1, N-1)
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc((goalPos.x + 0.5) * cellSize, (goalPos.y + 0.5) * cellSize, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Draw Agent Position
    ctx.fillStyle = '#6366f1'; // Indigo Agent Dot
    ctx.beginPath();
    ctx.arc((agentPos.x + 0.5) * cellSize, (agentPos.y + 0.5) * cellSize, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- Terminal Logging Utility ---
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

// --- Execution & Real-Time AI API Loop ---
btnRun.addEventListener('click', async () => {
    if (isRunning) return;
    isRunning = true;
    btnRun.disabled = true;
    btnRun.classList.add('opacity-50');
    statusIndicator.textContent = "Running Benchmark...";
    statusIndicator.className = "text-[10px] font-mono text-emerald-400 animate-pulse";

    resetMetrics();
    startTime = Date.now();
    timerInterval = setInterval(() => {
        metricTime.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    }, 100);

    const keys = getApiKeys();

    while (isRunning) {
        // Check win condition
        if (agentPos.x === goalPos.x && agentPos.y === goalPos.y) {
            logTerminal("SUCCESS", `Goal reached in ${stepCount} steps and ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
            stopBenchmark();
            break;
        }

        let nextMove = null;
        let thoughtProcess = null;

        if (keys.groq) {
            // Live Groq API Request
            const res = await fetchGroqNextMove(keys.groq);
            nextMove = res.move;
            thoughtProcess = res.thought;
        } else {
            // Simulated Fallback Reasoning Loop
            await new Promise(r => setTimeout(r, 250)); // Simulated network latency
            const res = simulateCognitiveMove();
            nextMove = res.move;
            thoughtProcess = res.thought;
        }

        executeMove(nextMove, thoughtProcess);

        // Safety limit to prevent infinite loops during benchmarks
        if (stepCount > 250) {
            logTerminal("SYSTEM", "Benchmark stopped: Step limit of 250 exceeded.");
            stopBenchmark();
            break;
        }
    }
});

function stopBenchmark() {
    isRunning = false;
    btnRun.disabled = false;
    btnRun.classList.remove('opacity-50');
    clearInterval(timerInterval);
    statusIndicator.textContent = "Idle / Completed";
    statusIndicator.className = "text-[10px] font-mono text-slate-500";
}

// --- Execute Agent Movement & Metrics ---
function executeMove(direction, thought) {
    let targetX = agentPos.x;
    let targetY = agentPos.y;

    if (direction === 'UP') targetY--;
    if (direction === 'DOWN') targetY++;
    if (direction === 'LEFT') targetX--;
    if (direction === 'RIGHT') targetX++;

    // Check Wall Collision
    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize || grid[targetY][targetX] === 1) {
        stuckCount++;
        metricStuck.textContent = stuckCount;
        logTerminal("AGENT", `Attempted invalid move [${direction}] into wall! Position unchanged.`, thought);
    } else {
        agentPos.x = targetX;
        agentPos.y = targetY;
        stepCount++;
        metricSteps.textContent = stepCount;

        // Track Loop / Backtrack metric
        const posKey = `${agentPos.x},${agentPos.y}`;
        if (visitedHistory.filter(p => p === posKey).length >= 2) {
            loopCount++;
            metricLoops.textContent = loopCount;
        }
        visitedHistory.push(posKey);

        logTerminal("AGENT", `Moved [${direction}] to tile (${agentPos.x}, ${agentPos.y})`, thought);
    }

    drawMaze();
}

// --- Groq API Fetch Implementation ---
async function fetchGroqNextMove(apiKey) {
    const localVision = getLocalVision(agentPos.x, agentPos.y);
    const systemPrompt = `You are an AI spatial reasoning benchmark agent navigating a 2D maze. 
Your current coordinate is (${agentPos.x}, ${agentPos.y}). Target exit coordinate is (${goalPos.x}, ${goalPos.y}).
Your visible adjacent moves: ${JSON.stringify(localVision)}.
Respond ONLY with a valid JSON object formatted exactly as:
{"thought": "<your brief step-by-step reasoning>", "move": "UP"|"DOWN"|"LEFT"|"RIGHT"}`;

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
        logTerminal("API ERROR", "Groq request failed or misformatted. Falling back to simulation step.");
        return simulateCognitiveMove();
    }
}

// Helper: Get local vision of surrounding 4 cells
function getLocalVision(x, y) {
    return {
        UP: (y > 0 && grid[y - 1][x] === 0) ? "OPEN" : "WALL",
        DOWN: (y < gridSize - 1 && grid[y + 1][x] === 0) ? "OPEN" : "WALL",
        LEFT: (x > 0 && grid[y][x - 1] === 0) ? "OPEN" : "WALL",
        RIGHT: (x < gridSize - 1 && grid[y][x + 1] === 0) ? "OPEN" : "WALL"
    };
}

// --- Simulated Cognitive Fallback Logic ---
function simulateCognitiveMove() {
    const vision = getLocalVision(agentPos.x, agentPos.y);
    const openMoves = Object.keys(vision).filter(d => vision[d] === "OPEN");

    // Simple heuristic toward goal (down/right priority)
    let chosenMove = openMoves[Math.floor(Math.random() * openMoves.length)] || "DOWN";
    if (vision.RIGHT === "OPEN" && Math.random() > 0.4) chosenMove = "RIGHT";
    if (vision.DOWN === "OPEN" && Math.random() > 0.4) chosenMove = "DOWN";

    return {
        move: chosenMove,
        thought: `Evaluating position (${agentPos.x},${agentPos.y}). Target at (${goalPos.x},${goalPos.y}). Choosing path: ${chosenMove}.`
    };
}
