const video = document.getElementById('webcam');
const resultDisplay = document.getElementById('result-display');
const boxesContainer = document.getElementById('boxes-container');
const scoreValue = document.getElementById('score-value');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const savePhotoBtn = document.getElementById('save-photo-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');

let model = undefined;
let currentScore = 0;
let currentZoom = 1;

// Сайдбар управління
openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// Зум камери
zoomInBtn.addEventListener('click', () => {
    currentZoom = currentZoom === 1 ? 1.5 : (currentZoom === 1.5 ? 2 : 1);
    video.style.transform = `scaleX(-1) scale(${currentZoom})`;
    zoomInBtn.innerText = `ZOOM ${currentZoom}x`;
});

// Збереження фото у галерею
savePhotoBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const link = document.createElement('a');
    link.download = `scan_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Налаштування кольорових міток для різних об'єктів
const objectConfig = {
    'bottle':     { name: 'ПЛЯШКА', color: '#10b981' },
    'cup':        { name: 'ЧАШКА', color: '#10b981' },
    'cell phone': { name: 'ТЕЛЕФОН', color: '#f59e0b' },
    'laptop':     { name: 'НОУТБУК', color: '#f59e0b' },
    'tv':         { name: 'ТБ', color: '#f59e0b' },
    'car':        { name: 'МАШИНА', color: '#ef4444' },
    'truck':      { name: 'ВАНТАЖ', color: '#ef4444' },
    'bus':        { name: 'АВТОБУС', color: '#ef4444' },
    'bicycle':    { name: 'ВЕЛО', color: '#ef4444' },
    'motorcycle': { name: 'МОТО', color: '#ef4444' },
    'person':     { name: 'ЛЮДИНА', color: '#3b82f6' },
    'bird':       { name: 'ПТАХ', color: '#06b6d4' },
    'cat':        { name: 'КІТ', color: '#8b5cf6' },
    'dog':        { name: 'СОБАКА', color: '#8b5cf6' },
    'book':       { name: 'КНИГА', color: '#ec4899' }
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
        resultDisplay.innerText = "Помилка доступу до камери";
    }
}

async function loadAI() {
    resultDisplay.innerText = "Завантаження моделі ШІ...";
    try {
        model = await cocoSsd.load({base: 'lite_mobilenet_v2'});
        resultDisplay.innerText = "Система активна. Сканування...";
        startDetection();
    } catch (err) {
        resultDisplay.innerText = "Помилка завантаження ШІ";
    }
}

async function init() {
    await setupCamera();
    await loadAI();
    video.play();
}

init();

function startDetection() {
    async function detectFrame() {
        if (!model || video.readyState !== 4) {
            requestAnimationFrame(detectFrame);
            return;
        }

        try {
            const predictions = await model.detect(video);
            boxesContainer.innerHTML = '';

            if (predictions.length > 0) {
                let count = 0;
                predictions.forEach(p => {
                    const conf = Math.round(p.score * 100);
                    if (conf >= 60) {
                        count++;
                        const cfg = objectConfig[p.class.toLowerCase()] || { name: p.class.toUpperCase(), color: '#ffffff' };
                        drawBox(p.bbox, `${cfg.name} ${conf}%`, cfg.color);
                    }
                });
                resultDisplay.innerText = count > 0 ? `Знайдено об'єктів: ${count}` : "Пошук об'єктів...";
                if (count > 0) {
                    currentScore += 1;
                    scoreValue.innerText = currentScore;
                }
            } else {
                resultDisplay.innerText = "Пошук об'єктів...";
            }
        } catch (e) {
            console.error(e);
        }

        requestAnimationFrame(detectFrame);
    }
    detectFrame();
}

function drawBox(bbox, labelText, color) {
    const [x, y, w, h] = bbox;
    const scaleX = video.clientWidth / (video.videoWidth || 640);
    const scaleY = video.clientHeight / (video.videoHeight || 480);

    const box = document.createElement('div');
    box.className = 'yolo-box';
    box.style.left = `${x * scaleX}px`;
    box.style.top = `${y * scaleY}px`;
    box.style.width = `${w * scaleX}px`;
    box.style.height = `${h * scaleY}px`;
    box.style.borderColor = color;
    box.style.background = hexToRgba(color, 0.1);

    const label = document.createElement('span');
    label.className = 'yolo-label';
    label.innerText = labelText;
    label.style.backgroundColor = color;

    box.appendChild(label);
    boxesContainer.appendChild(box);
}

function hexToRgba(hex, alpha) {
    let c = hex.replace('#','');
    let r = parseInt(c.substring(0,2), 16);
    let g = parseInt(c.substring(2,4), 16);
    let b = parseInt(c.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}