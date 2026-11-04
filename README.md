# AIMaze

This is a simulation matrix built to test spatial reasoning capabilities of different AI Models based on Maze-based puzzles solving efficiency. This is an open-source project and it runs entirely on your browser, which means, your data never leaves your computer. So, it's safe for you to test different models using their API Keys.

🚀 Key Features

* Guaranteed Solvable Mazes: Uses a recursive backtracking (DFS) algorithm so every generated maze (from 5x5 simple grids to 25x25 super-critical mazes) has a valid exit path.
* Real-Time Cognitive Reasoning: Forces models to output a step-by-step 'thought_process' JSON payload before making a physical move ('UP', 'DOWN', 'LEFT', 'RIGHT') rather than blindly guessing.
* Groq & Frontier Model Support: Lightning-fast inference testing using Groq API endpoints alongside standard OpenAI and Anthropic models.
* Zero-Dependency Local Setup: Runs entirely inside your browser using vanilla JavaScript, HTML5 Canvas, and Tailwind CSS. No backend server or 'npm install' required.
* Secure Client-Side Config: API keys are stored exclusively in your browser's 'localStorage' and never transmitted to any third-party servers.
* Analysis Telemetry Matrix: Live tracking of elapsed time, total steps, loop/backtracks, and wall collision/stuck frequency.

 🛠️ Project Structure

AIMaze/
├── index.html  -> Main UI, Non-sliding workspace layout & API Settings Modal
├── styles.css  -> Strict viewport constraints & custom scrollbar styling
├── app.js      -> Maze generator, canvas renderer, API fetcher & telemetry engine
└── README.md   -> Project documentation

⚙️ Quick Start & Installation

Clone or Download this repository to your local machine:

Bash

```bash
git clone https://github.com/anonymoususernil-26/AIMaze.git
```
Open the App: Simply double-click index.html or open it directly in any modern web browser (Chrome, Firefox, Edge, Safari).

Configure API Keys:

Click the ⚙️ API Keys button in the top header.
Paste your Groq API Key (gsk_...) or other provider keys.
Click Save Keys & Activate API Mode.
Run Benchmark: Select your preferred grid size, click New Maze, and hit 'Run Test' to watch real-time AI spatial reasoning in action!

📊 Performance Metrics Tracked

Total Steps: Number of valid coordinate transitions taken to reach the target exit.
Time Escaped: Total duration from start to successful termination.
Loop / Backtracks: Frequency of returning to previously visited coordinates.
Stuck Frequency: Count of consecutive collisions against maze walls.

📄 License
This project is open-source and available under the MIT License.
