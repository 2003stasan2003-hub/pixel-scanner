// Створено: 13.11.2026, 22:10

const video = document.getElementById('webcam');
const resultDisplay = document.getElementById('result-display');
const detectionBox = document.getElementById('detection-box');
const boxLabel = document.getElementById('box-label');
const scoreValue = document.getElementById('score-value');

let model = undefined;
let currentScore = 0;
let isAnalyzing = false;

// 1. Словник перекладів (Український, мінімальний)
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
        resultDisplay.innerText = "СКАНЕР ГОТОВИЙ";
        startPixelRadar();
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

// 3. Цикл авто-радара (Pixel версія)
function startPixelRadar() {
    setInterval(async () => {
        if (!model || isAnalyzing || video.readyState !== 4) return;

        isAnalyzing = true;

        try {
            const predictions = await model.detect(video);

            if (predictions.length > 0) {
                const target = predictions[0];
                const confidence = Math.round(target.score * 100);

                if (confidence > 70) {
                    const rawClass = target.class.toLowerCase();
                    const translatedName = ukrainianPixelLabels[rawClass] || target.class;

                    resultDisplay.innerText = `ВИЯВЛЕНО: ${translatedName} (${confidence}%)`;
                    drawPixelDetectionBox(target.bbox, `${translatedName} ${confidence}%`);
                    
                    currentScore += 10; // Більше очок для піксельного стилю
                    scoreValue.innerText = currentScore;
                } else {
                    hidePixelDetectionBox();
                }
            } else {
                hidePixelDetectionBox();
                resultDisplay.innerText = "СКАНУВАННЯ ПРОСТОРУ...";
            }
        } catch (err) {
            console.error("Помилка сканування:", err);
        } finally {
            isAnalyzing = false;
        }
    }, 750); // Сканування трохи повільніше для "лампового" ефекту
}

// Функції управління рамкою (Pixel версія)
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