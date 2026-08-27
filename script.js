// DOM Elements
const calculatorContainer = document.getElementById("calculatorContainer");
const expressionDisplay = document.getElementById("expressionDisplay");
const resultDisplay = document.getElementById("resultDisplay");

const modeSwitch = document.getElementById("modeSwitch");
const modeIndicatorText = document.getElementById("modeIndicatorText");
const scientificKeys = document.getElementById("scientificKeys");
const angleToggleBtn = document.getElementById("angleToggleBtn");
const angleModeIndicator = document.getElementById("angleModeIndicator");

const themeToggleBtn = document.getElementById("themeToggleBtn");
const historyToggleBtn = document.getElementById("historyToggleBtn");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const historyDrawer = document.getElementById("historyDrawer");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const soundToast = document.getElementById("soundToast");

// Application State
let expression = "";
let isResultState = false;
let angleMode = "DEG"; // DEG or RAD
let isSoundEnabled = true;
let history = [];

// Initialize
init();

function init() {
    // Load Theme Preference
    const savedTheme = localStorage.getItem("nexus_calc_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    // Load Sound Preference
    const savedSound = localStorage.getItem("nexus_calc_sound");
    if (savedSound !== null) {
        isSoundEnabled = savedSound === "true";
        updateSoundIcons();
    }

    // Load History
    const savedHistory = localStorage.getItem("nexus_calc_history");
    if (savedHistory) {
        try {
            history = JSON.parse(savedHistory);
            renderHistory();
        } catch (e) {
            history = [];
        }
    }

    // Register Event Listeners
    setupEventListeners();
    updateDisplay();
}

function setupEventListeners() {
    // Standard and Scientific Buttons Click
    document.querySelectorAll(".btn").forEach(button => {
        button.addEventListener("click", (e) => {
            // Prevent twice triggering if clicked manually
            handleBtnPress(button);
        });
    });

    // Toggle Scientific Mode
    modeSwitch.addEventListener("change", () => {
        playClickSound();
        if (modeSwitch.checked) {
            calculatorContainer.classList.add("sci-active");
            scientificKeys.classList.remove("hidden");
            modeIndicatorText.innerText = "Scientific";
        } else {
            calculatorContainer.classList.remove("sci-active");
            scientificKeys.classList.add("hidden");
            modeIndicatorText.innerText = "Standard";
        }
    });

    // Theme Toggle
    themeToggleBtn.addEventListener("click", () => {
        playClickSound();
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("nexus_calc_theme", newTheme);
    });

    // Sound Toggle
    soundToggleBtn.addEventListener("click", () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem("nexus_calc_sound", isSoundEnabled.toString());
        updateSoundIcons();
        showSoundToast(isSoundEnabled ? "Sound Effects Enabled" : "Sound Muted");
        if (isSoundEnabled) playClickSound();
    });

    // History Toggle
    historyToggleBtn.addEventListener("click", () => {
        playClickSound();
        historyDrawer.classList.add("open");
    });

    closeHistoryBtn.addEventListener("click", () => {
        playClickSound();
        historyDrawer.classList.remove("open");
    });

    clearHistoryBtn.addEventListener("click", () => {
        playClickSound();
        history = [];
        localStorage.removeItem("nexus_calc_history");
        renderHistory();
    });

    // Physical Keyboard Support
    document.addEventListener("keydown", handleKeyboardInput);
}

function updateSoundIcons() {
    const speakerOn = soundToggleBtn.querySelector(".speaker-on-icon");
    const speakerMute = soundToggleBtn.querySelector(".speaker-mute-icon");
    if (isSoundEnabled) {
        speakerOn.style.display = "block";
        speakerMute.style.display = "none";
    } else {
        speakerOn.style.display = "none";
        speakerMute.style.display = "block";
    }
}

function showSoundToast(message) {
    soundToast.querySelector("span").innerText = message;
    soundToast.classList.add("show");
    setTimeout(() => {
        soundToast.classList.remove("show");
    }, 1500);
}

function playClickSound() {
    if (!isSoundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.06);
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
        // AudioContext could block on user activation
        console.warn("AudioContext playback blocked or failed:", e);
    }
}

// Main Button Press Router
function handleBtnPress(button) {
    playClickSound();
    
    const action = button.dataset.action;
    const val = button.dataset.val;

    if (action === "clear") {
        expression = "";
        isResultState = false;
        updateDisplay();
    } 
    else if (action === "backspace") {
        performBackspace();
    } 
    else if (action === "angle-toggle") {
        angleMode = angleMode === "DEG" ? "RAD" : "DEG";
        angleModeIndicator.innerText = angleMode;
        button.innerText = angleMode === "DEG" ? "rad" : "deg";
        button.title = angleMode === "DEG" ? "Switch to Radians" : "Switch to Degrees";
        // Recalculate expression preview under new angle mode
        updateResultPreview();
    } 
    else if (action === "calculate") {
        evaluateAndSave();
    } 
    else if (action === "pow") {
        appendSymbol("^");
    }
    else {
        // Appending numbers, operators, functions, brackets
        let symbol = val || button.innerText;
        appendSymbol(symbol);
    }
}

function appendSymbol(symbol) {
    // If we just finished a calculation and the user types a number, clear and start fresh
    const isNumber = !isNaN(symbol) || symbol === ".";
    const isFunction = ["sin(", "cos(", "tan(", "log(", "ln(", "√("].includes(symbol);
    const isConstant = ["π", "e"].includes(symbol);
    const isBracketOpen = symbol === "(";

    if (isResultState) {
        if (isNumber || isFunction || isConstant || isBracketOpen) {
            expression = "";
        } else {
            // It's an operator, so they want to operate on the previous result
            expression = resultDisplay.innerText;
        }
        isResultState = false;
    }

    // Clean up starting zero if appropriate
    if (expression === "0" && (isNumber || isConstant || isFunction)) {
        expression = "";
    }

    // Guard consecutive operators
    const operators = ["+", "-", "×", "÷", "%"];
    if (operators.includes(symbol)) {
        if (expression === "") {
            // Negative sign allowed at start
            if (symbol === "-") expression += symbol;
        } else {
            const lastChar = expression.slice(-1);
            if (operators.includes(lastChar)) {
                // Swap operator
                expression = expression.slice(0, -1) + symbol;
            } else {
                expression += symbol;
            }
        }
    } else {
        expression += symbol;
    }

    updateDisplay();
    updateResultPreview();
}

function performBackspace() {
    if (expression === "") return;
    
    if (isResultState) {
        expression = "";
        isResultState = false;
        updateDisplay();
        return;
    }

    const functions = ["sin(", "cos(", "tan(", "log(", "ln(", "√("];
    let deleted = false;
    
    for (let f of functions) {
        if (expression.endsWith(f)) {
            expression = expression.substring(0, expression.length - f.length);
            deleted = true;
            break;
        }
    }
    
    if (!deleted) {
        expression = expression.substring(0, expression.length - 1);
    }

    updateDisplay();
    updateResultPreview();
}

function updateDisplay() {
    expressionDisplay.innerText = expression;
    if (expression === "") {
        resultDisplay.innerText = "0";
    }
    autoScaleResultFont();
}

function updateResultPreview() {
    if (expression === "") {
        resultDisplay.innerText = "0";
        autoScaleResultFont();
        return;
    }

    try {
        const preview = calculateResult(expression);
        if (preview !== undefined && preview !== "" && !isNaN(preview)) {
            resultDisplay.innerText = preview;
        }
    } catch (e) {
        // Silently fail preview for incomplete expressions
    }
    autoScaleResultFont();
}

function evaluateAndSave() {
    if (expression === "") return;

    try {
        const finalResult = calculateResult(expression);
        
        // Auto-close missing brackets for expression display
        let openBrackets = (expression.match(/\(/g) || []).length;
        let closeBrackets = (expression.match(/\)/g) || []).length;
        while (openBrackets > closeBrackets) {
            expression += ")";
            closeBrackets++;
        }
        
        expressionDisplay.innerText = expression;
        resultDisplay.innerText = finalResult;
        
        // Save to History
        saveToHistory(expression, finalResult);

        // Update states
        expression = finalResult;
        isResultState = true;
    } catch (err) {
        resultDisplay.innerText = "Error";
        console.error("Evaluation error:", err);
    }
    autoScaleResultFont();
}

function saveToHistory(expr, res) {
    // Avoid duplicates at the very top
    if (history.length > 0 && history[0].expr === expr) return;

    history.unshift({ expr, result: res });
    // Keep max 50 items
    if (history.length > 50) history.pop();

    localStorage.setItem("nexus_calc_history", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = `<div class="no-history">No calculations yet</div>`;
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="hist-expr">${escapeHtml(item.expr)}</div>
            <div class="hist-res">${escapeHtml(item.result)}</div>
        </div>
    `).join("");

    // Add click event listeners to history items
    document.querySelectorAll(".history-item").forEach(item => {
        item.addEventListener("click", () => {
            playClickSound();
            const index = item.dataset.index;
            expression = history[index].expr;
            isResultState = false;
            updateDisplay();
            updateResultPreview();
            historyDrawer.classList.remove("open");
        });
    });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function autoScaleResultFont() {
    const textLength = resultDisplay.innerText.length;
    if (textLength > 16) {
        resultDisplay.style.fontSize = "18px";
    } else if (textLength > 12) {
        resultDisplay.style.fontSize = "22px";
    } else if (textLength > 8) {
        resultDisplay.style.fontSize = "28px";
    } else {
        resultDisplay.style.fontSize = "34px";
    }
}

// Math Evaluation Engine
function calculateResult(exprStr) {
    if (exprStr.trim() === "") return "";
    
    // Auto-close missing brackets for computational evaluation
    let openBrackets = (exprStr.match(/\(/g) || []).length;
    let closeBrackets = (exprStr.match(/\)/g) || []).length;
    let autoClosedExpr = exprStr;
    while (openBrackets > closeBrackets) {
        autoClosedExpr += ")";
        closeBrackets++;
    }
    
    const sanitized = sanitizeForEval(autoClosedExpr);
    
    const isDegree = angleMode === "DEG";
    const sin = (val) => isDegree ? Math.sin(val * Math.PI / 180) : Math.sin(val);
    const cos = (val) => isDegree ? Math.cos(val * Math.PI / 180) : Math.cos(val);
    const tan = (val) => isDegree ? Math.tan(val * Math.PI / 180) : Math.tan(val);
    
    const log = (val) => {
        if (val <= 0) throw new Error("Invalid Input");
        return Math.log10(val);
    };
    const ln = (val) => {
        if (val <= 0) throw new Error("Invalid Input");
        return Math.log(val);
    };
    const sqrt = (val) => {
        if (val < 0) throw new Error("Invalid Input");
        return Math.sqrt(val);
    };
    
    // Controlled evaluation scope
    const evaluate = Function(
        "sin", "cos", "tan", "log", "ln", "sqrt", 
        `"use strict"; return (${sanitized});`
    );
    
    const result = evaluate(sin, cos, tan, log, ln, sqrt);
    
    if (typeof result === "number") {
        if (isNaN(result)) throw new Error("Invalid Math");
        if (!isFinite(result)) throw new Error("Infinity");
        
        // Remove floating point inaccuracies (e.g. 0.1 + 0.2 = 0.30000000000000004)
        let resultStr = result.toFixed(10);
        if (resultStr.includes(".")) {
            resultStr = resultStr.replace(/\.?0+$/, "");
        }
        return Number(resultStr).toString();
    }
    
    return result;
}

function sanitizeForEval(exprStr) {
    let s = exprStr;
    
    // Replace visual operators
    s = s.replace(/×/g, "*");
    s = s.replace(/÷/g, "/");
    
    // Replace functions and constants
    s = s.replace(/√\(/g, "sqrt(");
    s = s.replace(/π/g, "Math.PI");
    s = s.replace(/e/g, "Math.E");
    s = s.replace(/\^/g, "**");
    
    // Implicit multiplication patterns
    
    // 1. Digit followed by bracket: 5( -> 5*(
    s = s.replace(/(\d)(\()/g, "$1*$2");
    
    // 2. Bracket followed by digit: )5 -> )*5
    s = s.replace(/(\))(\d)/g, "$1*$2");
    
    // 3. Digit followed by constant/function name: 2Math.PI -> 2*Math.PI, 2sin -> 2*sin
    s = s.replace(/(\d)([a-zA-ZMath])/g, "$1*$2");
    
    // 4. Bracket followed by bracket: )( -> )*(
    s = s.replace(/(\))(\()/g, "$1*$2");
    
    // 5. Constant followed by bracket: Math.PI( -> Math.PI*(
    s = s.replace(/(Math\.PI|Math\.E)(\()/g, "$1*$2");
    
    // 6. Bracket followed by Constant/Function: )Math.PI -> )*Math.PI, )sin -> )*sin
    s = s.replace(/(\))([a-zA-ZMath])/g, "$1*$2");
    
    // 7. Constant followed by Function/Constant: Math.PIe -> Math.PI*Math.E, Math.PIsin -> Math.PI*sin
    s = s.replace(/(Math\.PI|Math\.E)(sin|cos|tan|log|ln|sqrt|Math\.PI|Math\.E)/g, "$1*$2");
    
    return s;
}

// Physical Keyboard Event Handling
function handleKeyboardInput(e) {
    const key = e.key;
    let targetBtn = null;
    
    if (key >= "0" && key <= "9") {
        targetBtn = document.querySelector(`.num-btn[data-val="${key}"]`);
    } else if (key === ".") {
        targetBtn = document.querySelector(`.num-btn[data-val="."]`);
    } else if (key === "+") {
        targetBtn = document.querySelector(`.operator-btn[data-val="+"]`);
    } else if (key === "-") {
        targetBtn = document.querySelector(`.operator-btn[data-val="-"]`);
    } else if (key === "*" || key.toLowerCase() === "x") {
        targetBtn = document.querySelector(`.operator-btn[data-val="×"]`);
    } else if (key === "/") {
        targetBtn = document.querySelector(`.operator-btn[data-val="÷"]`);
    } else if (key === "%") {
        targetBtn = document.querySelector(`.action-btn[data-val="%"]`);
    } else if (key === "(") {
        targetBtn = document.querySelector(`.sci-btn[data-val="("]`);
    } else if (key === ")") {
        targetBtn = document.querySelector(`.sci-btn[data-val=")"]`);
    } else if (key === "^") {
        targetBtn = document.querySelector(`.sci-btn[data-action="pow"]`);
    } else if (key === "Enter" || key === "=") {
        targetBtn = document.getElementById("btnEquals");
        e.preventDefault();
    } else if (key === "Backspace") {
        targetBtn = document.getElementById("btnDel");
    } else if (key === "Escape") {
        targetBtn = document.getElementById("btnAC");
    }
    
    if (targetBtn) {
        targetBtn.click();
        targetBtn.classList.add("keyboard-active");
        setTimeout(() => targetBtn.classList.remove("keyboard-active"), 100);
    }
}