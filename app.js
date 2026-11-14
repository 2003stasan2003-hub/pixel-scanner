// Створено: 14.11.2026, 18:05

const video = document.getElementById('webcam');
const resultDisplay = document.getElementById('result-display');
const detectionBox = document.getElementById('detection-box');
const boxLabel = document.getElementById('box-label');
const scoreValue = document.getElementById('score-value');
const modeBtn = document.getElementById('mode-btn');
const cameraContainer = document.getElementById('camera-container');

let model = undefined;
let currentScore = 0;
let isAnalyzing = false;
let currentMode = 'AUTO';

// Словник предметів із різними кольорами рамок
const objectConfig = {
    'bottle':     { name: 'ПЛЯШКА 🍼', color: '#00ffcc' },
    'cup':        { name: 'ЧАШКА ☕', color: '#00ffcc' },
    'wine glass': { name: 'БОКАЛ 🍷', color: '#00ffcc' },
    
    'cell phone': { name: 'ТЕЛЕФОН 📱', color: '#ffcc00' },
    'laptop':     { name: 'НОУТБУК 💻', color: '#ffcc00' },
    'tv':         { name: 'ТБ 📺', color: '#ffcc00' },
    'mouse':      { name: 'МИШКА 🖱️', color: '#ffcc00' },
    'keyboard':   { name: 'КЛАВІАТУРА ⌨️', color: '#ffcc00' },

    'car':        { name: 'МАШИНА 🚗', color: '#00ff66' },
    'truck':      { name: 'ВАНТАЖ 🚚', color: '#00ff66' },
    'bus':        { name: 'АВТОБУС 🚌', color: '#00ff66' },
    'bicycle':    { name: 'ВЕЛО 🚲', color: '#00ff66' },
    'motorcycle': { name: 'МОТО 🏍️', color: '#00ff66' },

    'person':     { name: 'ЛЮДИНА 👤', color: '#ff3399' },
    
    'bird':       { name: 'ПТАХ 🦅', color: '#00ccff' },
    'cat':        { name: 'КІТ 🐈', color: '#ff9900' },
    'dog':        { name: 'СОБАКА 🐕', color: '#ff9900' },

    'book':       { name: 'КНИГА 📖', color: '#cc66ff' },
    'backpack':   { name: 'РЮКЗАК 🎒', color: '#cc66ff' },
    'handbag':    { name: 'СУМКА 👜', color: '#cc66ff' }
};

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => { resolve(video); };
        });
    } catch (err) {
        console.error("Помилка камери:", err);
        resultDisplay.innerText = "ПОМИЛКА КАМЕРИ";
    }
}

async function loadAI() {
    resultDisplay.innerText = "ЗАВАНТАЖЕННЯ ШІ...";
    try {
        model = await cocoSsd.load({base: 'lite_mobilenet_v2'});
        resultDisplay.innerText = "ГОТОВО! ОБЕРІТЬ РЕЖИМ";
    } catch (err) {
        console.error("Помилка моделі:", err);
        resultDisplay.innerText = "ПОМИЛКА ШІ";
    }
}

async function init() {
    await setupCamera();
    await loadAI();
    video.play();
}

init();

modeBtn.addEventListener('click', () => {
    if (currentMode === 'AUTO') {
        currentMode = 'CLICK';
        modeBtn.innerText = "РЕЖИМ: ТОРКНУТИСЬ";
        resultDisplay.innerText = "Торкніться екрана для сканування";
        hidePixelDetectionBox();
    } else {
        currentMode = 'AUTO';
        modeBtn.innerText = "РЕЖИМ: АВТО";
        resultDisplay.innerText = "Автоматичний радар активний";
    }
});

// Автоматичний цикл сканування з точним масштабуванням рамки під розмір об'єкта
setInterval(async () => {
    if (currentMode !== 'AUTO' || !model || isAnalyzing || video.readyState !== 4) return;

    isAnalyzing = true;
    try {
        const predictions = await model.detect(video);
        if (predictions.length > 0) {
            const target = predictions[0];
            const confidence = Math.round(target.score * 100);

            if (confidence > 60) {
                const rawClass = target.class.toLowerCase();
                const itemInfo = objectConfig[rawClass] || { name: target.class.toUpperCase(), color: '#ffffff' };

                resultDisplay.innerText = `ЗНАЙДЕНО: ${itemInfo.name} (${confidence}%)`;
                drawCompactBox(target.bbox, itemInfo.name, itemInfo.color);
                
                currentScore += 5;
                scoreValue.innerText = currentScore;
            } else {
                hidePixelDetectionBox();
            }
        } else {
            hidePixelDetectionBox();
            resultDisplay.innerText = "АВТО-СКАНУВАННЯ ПРОСТОРУ...";
        }
    } catch (err) {
        console.error("Помилка сканування:", err);
    } finally {
        isAnalyzing = false;
    }
}, 700);

// Сканування при торканні екрана
cameraContainer.addEventListener('click', async () => {
    if (currentMode !== 'CLICK' || !model || isAnalyzing) return;

    isAnalyzing = true;
    resultDisplay.innerText = "АНАЛІЗ ТОЧКИ ТОРКАННЯ...";
    hidePixelDetectionBox();

    try {
        const predictions = await model.detect(video);
        if (predictions.length > 0) {
            const target = predictions[0];
            const confidence = Math.round(target.score * 100);
            const rawClass = target.class.toLowerCase();
            const itemInfo = objectConfig[rawClass] || { name: target.class.toUpperCase(), color: '#ffffff' };

            resultDisplay.innerText = `УСПІХ! ${itemInfo.name} (${confidence}%)`;
            drawCompactBox(target.bbox, itemInfo.name, itemInfo.color);
            
            currentScore += 15;
            scoreValue.innerText = currentScore;
        } else {
            resultDisplay.innerText = "НІЧОГО НЕ ЗНАЙДЕНО В ЦІЙ ЗОНІ";
        }
    } catch (err) {
        console.error("Помилка кліку:", err);
        resultDisplay.innerText = "ПОМИЛКА АНАЛІЗУ";
    } finally {
        isAnalyzing = false;
    }
});

// Функція розрахунку точних розмірів (широкі, довгі чи квадратні рамки)
function drawCompactBox(bbox, text, color) {
    const [x, y, width, height] = bbox;
    
    // Перераховуємо координати під реальний розмір відеоелемента на екрані
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const containerWidth = video.clientWidth;
    const containerHeight = video.clientHeight;

    const scaleX = containerWidth / videoWidth;
    const scaleY = containerHeight / videoHeight;

    // Масштабуємо координати та робимо рамку компактною строго під фігуру
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledW = width * scaleX;
    const scaledH = height * scaleY;

    detectionBox.style.left = `${scaledX}px`;
    detectionBox.style.top = `${scaledY}px`;
    detectionBox.style.width = `${scaledW}px`;
    styleBoxHeightAndColor(scaledH, color);

    boxLabel.innerText = text;
    boxLabel.style.backgroundColor = color;

    detectionBox.classList.remove('hidden-box');
}

function styleBoxHeightAndColor(height, color) {
    detectionBox.style.height = `${height}px`;
    detectionBox.style.borderColor = color;
    detectionBox.style.boxShadow = `0 0 0 2px ${color}`;
    detectionBox.style.background = hexToRgba(color, 0.12);
}

function hidePixelDetectionBox() {
    detectionBox.classList.add('hidden-box');
}

function hexToRgba(hex, alpha) {
    let c = hex.replace('#','');
    let r = parseInt(c.substring(0,2), 16);
    let g = parseInt(c.substring(2,4), 16);
    let b = parseInt(c.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
