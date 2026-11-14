// Створено: 14.11.2026, 17:00

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
let currentMode = 'AUTO'; // Режими: 'AUTO' або 'CLICK'

// Словник перекладів
const ukrainianPixelLabels = {
    'car': 'МАШИНА 🚗',
    'truck': 'ВАНТАЖ 🚚',
    'bus': 'АВТОБУС 🚌',
    'train': 'ПОЇЗД 🚂',
    'airplane': 'ЛІТАК ✈️',
    'bicycle': 'ВЕЛО 🚲',
    'motorcycle': 'МОТО 🏍️',
    'bird': 'ПТАХ 🦅',
    'cat': 'КІТ 🐈',
    'dog': 'СОБАКА 🐕',
    'person': 'ЛЮДИНА 👤',
    'cell phone': 'ТЕЛЕФОН 📱',
    'laptop': 'НОУТБУК 💻',
    'tv': 'ТБ 📺',
    'book': 'КНИГА 📖'
};

// 1. Налаштування камери
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

// 2. Завантаження моделі ШІ
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

// 3. Кнопка перемикання режимів
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

// 4. Режим 1: Автоматичний цикл радара
setInterval(async () => {
    if (currentMode !== 'AUTO' || !model || isAnalyzing || video.readyState !== 4) return;

    isAnalyzing = true;
    try {
        const predictions = await model.detect(video);
        if (predictions.length > 0) {
            const target = predictions[0];
            const confidence = Math.round(target.score * 100);

            if (confidence > 65) {
                const rawClass = target.class.toLowerCase();
                const translatedName = ukrainianPixelLabels[rawClass] || target.class;

                resultDisplay.innerText = `ЗНАЙДЕНО: ${translatedName} (${confidence}%)`;
                drawPixelDetectionBox(target.bbox, `${translatedName} ${confidence}%`);
                
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
}, 800);

// 5. Режим 2: Сканування при торканні (клику) екрана пальцем
cameraContainer.addEventListener('click', async () => {
    if (currentMode !== 'CLICK' || !model || isAnalyzing) return;

    isAnalyzing = true;
    resultDisplay.innerText = "АНАЛІЗ ТОЧКИ ТОРКАННЯ...";
    hidePixelDetectionBox();

    try {
        const predictions = await model.detect(video);
        if (predictions.length > 0) {
            // Беремо найближчий або перший ліпший об'єкт з кадру
            const target = predictions[0];
            const confidence = Math.round(target.score * 100);
            const rawClass = target.class.toLowerCase();
            const translatedName = ukrainianPixelLabels[rawClass] || target.class;

            resultDisplay.innerText = `УСПІХ! ${translatedName} (${confidence}%)`;
            drawPixelDetectionBox(target.bbox, `${translatedName} ${confidence}%`);
            
            currentScore += 15; // Більше очок за ручне сканування
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

// Функції малювання червоної рамки
function drawPixelDetectionBox(bbox, text) {
    const [x, y, width, height] = bbox;
    detectionBox.style.left = `${x}px`;
    detectionBox.style.top = `${y}px`;
    detectionBox.style.width = `${width}px`;
    detectionBox.style.height = `${height}px`;
    boxLabel.innerText = text;
    detectionBox.classList.remove('hidden-box');
}

function hidePixelDetectionBox() {
    detectionBox.classList.add('hidden-box');
}
