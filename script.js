/**
 * Digital Paint Studio - Professional Paint System v1.0
 */

class DigitalPaintStudio {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('paintCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.currentOpacity = 100;
        this.currentHardness = 100;
        this.currentShape = 'round';
        
        // Canvas state
        this.zoomLevel = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        
        // History for undo/redo
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 50;
        
        // Layers
        this.layers = [
            { id: 0, name: '背景', visible: true, canvas: this.canvas }
        ];
        this.currentLayer = 0;
        
        // Brush settings
        this.customBrushes = [];
        this.brushPresets = {
            round: (ctx, x, y, size) => {
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            },
            square: (ctx, x, y, size) => {
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
            },
            triangle: (ctx, x, y, size) => {
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x - size / 2, y + size / 2);
                ctx.lineTo(x + size / 2, y + size / 2);
                ctx.closePath();
                ctx.fill();
            },
            star: (ctx, x, y, size) => {
                this.drawStar(ctx, x, y, 5, size / 2, size / 4);
            },
            heart: (ctx, x, y, size) => {
                this.drawHeart(ctx, x, y, size);
            },
            cross: (ctx, x, y, size) => {
                const halfSize = size / 2;
                ctx.fillRect(x - halfSize / 3, y - halfSize, halfSize / 1.5, size);
                ctx.fillRect(x - halfSize, y - halfSize / 3, size, halfSize / 1.5);
            }
        };
        
        // Drawing data for shape tools
        this.startX = 0;
        this.startY = 0;
        
        // Gallery
        this.gallery = this.loadGallery();
        
        // Initialize
        this.init();
    }

    init() {
        console.log('🎨 Digital Paint Studio v1.0 initializing...');
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateUI();
        this.saveState();
        this.updateGallery();
        
        console.log('✅ Digital Paint Studio ready!');
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.overlayCanvas.width = 800;
        this.overlayCanvas.height = 600;
        
        // Fill background with white
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set default drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.overlayCtx.lineCap = 'round';
        this.overlayCtx.lineJoin = 'round';
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectTool(btn.dataset.tool);
            });
        });

        // Brush settings
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.currentSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = `${this.currentSize}px`;
        });

        document.getElementById('brushOpacity').addEventListener('input', (e) => {
            this.currentOpacity = parseInt(e.target.value);
            document.getElementById('brushOpacityValue').textContent = `${this.currentOpacity}%`;
        });

        document.getElementById('brushHardness').addEventListener('input', (e) => {
            this.currentHardness = parseInt(e.target.value);
            document.getElementById('brushHardnessValue').textContent = `${this.currentHardness}%`;
        });

        // Brush shapes
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectShape(btn.dataset.shape);
            });
        });

        // Color selection
        document.getElementById('primaryColor').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
            document.getElementById('primaryColorHex').value = e.target.value;
        });

        document.getElementById('primaryColorHex').addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                this.currentColor = e.target.value;
                document.getElementById('primaryColor').value = e.target.value;
            }
        });

        // Color swatches
        document.querySelectorAll('.swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.currentColor = swatch.dataset.color;
                document.getElementById('primaryColor').value = this.currentColor;
                document.getElementById('primaryColorHex').value = this.currentColor;
            });
        });

        // Color harmony
        document.querySelectorAll('[data-harmony]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.generateColorHarmony(btn.dataset.harmony);
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Mouse position tracking
        this.canvas.addEventListener('mousemove', this.updateMousePosition.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Header actions
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveBtn').addEventListener('click', () => this.showSaveModal());
        document.getElementById('loadBtn').addEventListener('click', () => this.showUploadModal());

        // Canvas controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.fitToScreen());
        document.getElementById('resizeCanvasBtn').addEventListener('click', () => this.resizeCanvas());

        // Effects
        document.getElementById('applyEffectsBtn').addEventListener('click', () => this.applyEffects());
        document.getElementById('resetEffectsBtn').addEventListener('click', () => this.resetEffects());

        // Effects sliders
        document.getElementById('blurAmount').addEventListener('input', this.updateEffectPreview.bind(this));
        document.getElementById('brightnessAmount').addEventListener('input', this.updateEffectPreview.bind(this));
        document.getElementById('contrastAmount').addEventListener('input', this.updateEffectPreview.bind(this));

        // Layers
        document.getElementById('addLayerBtn').addEventListener('click', () => this.addLayer());

        // Modals
        this.setupModals();

        // File upload
        this.setupFileUpload();

        // Gallery
        document.getElementById('clearGalleryBtn').addEventListener('click', () => this.clearGallery());
    }

    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor
        this.updateCursor();
        
        this.showNotification(`${this.getToolName(tool)}を選択しました`);
    }

    selectShape(shape) {
        this.currentShape = shape;
        document.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-shape="${shape}"]`).classList.add('active');
    }

    getToolName(tool) {
        const names = {
            brush: 'ブラシ',
            pencil: '鉛筆',
            eraser: '消しゴム',
            line: '直線',
            rectangle: '四角形',
            circle: '円',
            spray: 'スプレー',
            bucket: '塗りつぶし'
        };
        return names[tool] || tool;
    }

    updateCursor() {
        const cursors = {
            brush: 'crosshair',
            pencil: 'crosshair',
            eraser: 'grab',
            line: 'crosshair',
            rectangle: 'crosshair',
            circle: 'crosshair',
            spray: 'crosshair',
            bucket: 'pointer'
        };
        this.canvas.style.cursor = cursors[this.currentTool] || 'crosshair';
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoomLevel;
        const y = (e.clientY - rect.top) / this.zoomLevel;
        
        this.startX = x;
        this.startY = y;
        
        if (this.currentTool === 'bucket') {
            this.floodFill(x, y);
            this.saveState();
            return;
        }
        
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentSize;
        
        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        if (this.currentTool === 'brush' || this.currentTool === 'pencil') {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.drawBrush(x, y);
        } else if (this.currentTool === 'spray') {
            this.drawSpray(x, y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoomLevel;
        const y = (e.clientY - rect.top) / this.zoomLevel;
        
        if (this.currentTool === 'brush' || this.currentTool === 'pencil') {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.drawBrush(x, y);
        } else if (this.currentTool === 'spray') {
            this.drawSpray(x, y);
        } else if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            this.drawPreview(x, y);
        }
    }

    stopDrawing(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoomLevel;
            const y = (e.clientY - rect.top) / this.zoomLevel;
            this.drawShape(x, y);
        }
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.saveState();
    }

    drawBrush(x, y) {
        const size = this.currentSize;
        
        if (this.currentHardness < 100) {
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size / 2);
            const alpha = this.currentOpacity / 100;
            gradient.addColorStop(0, this.hexToRgba(this.currentColor, alpha));
            gradient.addColorStop(this.currentHardness / 100, this.hexToRgba(this.currentColor, alpha * 0.5));
            gradient.addColorStop(1, this.hexToRgba(this.currentColor, 0));
            this.ctx.fillStyle = gradient;
        }
        
        if (this.brushPresets[this.currentShape]) {
            this.brushPresets[this.currentShape](this.ctx, x, y, size);
        }
    }

    drawSpray(x, y) {
        const density = 20;
        const radius = this.currentSize;
        
        for (let i = 0; i < density; i++) {
            const offsetX = (Math.random() - 0.5) * radius;
            const offsetY = (Math.random() - 0.5) * radius;
            
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius / 4) {
                this.ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
            }
        }
    }

    drawPreview(x, y) {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.overlayCtx.strokeStyle = this.currentColor;
        this.overlayCtx.lineWidth = this.currentSize;
        this.overlayCtx.globalAlpha = 0.7;
        
        this.overlayCtx.beginPath();
        
        switch (this.currentTool) {
            case 'line':
                this.overlayCtx.moveTo(this.startX, this.startY);
                this.overlayCtx.lineTo(x, y);
                break;
            case 'rectangle':
                this.overlayCtx.rect(this.startX, this.startY, x - this.startX, y - this.startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
                this.overlayCtx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
                break;
        }
        
        this.overlayCtx.stroke();
        this.overlayCtx.globalAlpha = 1;
    }

    drawShape(x, y) {
        this.ctx.globalAlpha = this.currentOpacity / 100;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentSize;
        
        this.ctx.beginPath();
        
        switch (this.currentTool) {
            case 'line':
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(x, y);
                break;
            case 'rectangle':
                this.ctx.rect(this.startX, this.startY, x - this.startX, y - this.startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
                this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
                break;
        }
        
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    floodFill(x, y) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const targetColor = this.getPixelColor(imageData, Math.floor(x), Math.floor(y));
        const fillColor = this.hexToRgb(this.currentColor);
        
        if (this.colorsEqual(targetColor, fillColor)) return;
        
        const stack = [{x: Math.floor(x), y: Math.floor(y)}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const {x: px, y: py} = stack.pop();
            const key = `${px},${py}`;
            
            if (visited.has(key) || px < 0 || px >= this.canvas.width || py < 0 || py >= this.canvas.height) {
                continue;
            }
            
            const currentColor = this.getPixelColor(imageData, px, py);
            if (!this.colorsEqual(currentColor, targetColor)) {
                continue;
            }
            
            visited.add(key);
            this.setPixelColor(imageData, px, py, fillColor);
            
            stack.push({x: px + 1, y: py});
            stack.push({x: px - 1, y: py});
            stack.push({x: px, y: py + 1});
            stack.push({x: px, y: py - 1});
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    getPixelColor(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }

    setPixelColor(imageData, x, y, color) {
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
    }

    colorsEqual(color1, color2) {
        return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    hexToRgba(hex, alpha) {
        const rgb = this.hexToRgb(hex);
        return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
    }

    drawStar(ctx, x, y, points, outerRadius, innerRadius) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    drawHeart(ctx, x, y, size) {
        const width = size;
        const height = size;
        
        ctx.beginPath();
        const topCurveHeight = height * 0.3;
        
        ctx.moveTo(x, y + topCurveHeight);
        ctx.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x - width / 2, y + (height + topCurveHeight) / 2, x, y + (height + topCurveHeight) / 2, x, y + height);
        ctx.bezierCurveTo(x, y + (height + topCurveHeight) / 2, x + width / 2, y + (height + topCurveHeight) / 2, x + width / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + topCurveHeight);
        
        ctx.closePath();
        ctx.fill();
    }

    generateColorHarmony(type) {
        const currentHue = this.rgbToHsl(this.hexToRgb(this.currentColor)).h;
        let colors = [];
        
        switch (type) {
            case 'complementary':
                colors = [
                    this.hslToHex(currentHue, 70, 50),
                    this.hslToHex((currentHue + 180) % 360, 70, 50)
                ];
                break;
            case 'triadic':
                colors = [
                    this.hslToHex(currentHue, 70, 50),
                    this.hslToHex((currentHue + 120) % 360, 70, 50),
                    this.hslToHex((currentHue + 240) % 360, 70, 50)
                ];
                break;
            case 'analogous':
                colors = [
                    this.hslToHex((currentHue - 30 + 360) % 360, 70, 50),
                    this.hslToHex(currentHue, 70, 50),
                    this.hslToHex((currentHue + 30) % 360, 70, 50)
                ];
                break;
            case 'monochromatic':
                colors = [
                    this.hslToHex(currentHue, 30, 70),
                    this.hslToHex(currentHue, 50, 50),
                    this.hslToHex(currentHue, 70, 30)
                ];
                break;
        }
        
        this.updateColorSwatches(colors);
        this.showNotification(`${type}配色を生成しました`);
    }

    updateColorSwatches(colors) {
        const swatches = document.querySelectorAll('.swatch');
        colors.forEach((color, index) => {
            if (swatches[index]) {
                swatches[index].style.background = color;
                swatches[index].dataset.color = color;
            }
        });
    }

    rgbToHsl(rgb) {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                        e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.zoomLevel);
        const y = Math.floor((e.clientY - rect.top) / this.zoomLevel);
        document.getElementById('mousePos').textContent = `X: ${x}, Y: ${y}`;
    }

    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    this.showSaveModal();
                    break;
                case 'o':
                    e.preventDefault();
                    this.showUploadModal();
                    break;
            }
        }
        
        // Tool shortcuts
        const toolKeys = {
            'b': 'brush',
            'p': 'pencil',
            'e': 'eraser',
            'l': 'line',
            'r': 'rectangle',
            'c': 'circle',
            's': 'spray',
            'f': 'bucket'
        };
        
        if (toolKeys[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
            this.selectTool(toolKeys[e.key.toLowerCase()]);
        }
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        this.updateZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
        this.updateZoom();
    }

    fitToScreen() {
        const container = document.querySelector('.canvas-container');
        const scaleX = container.clientWidth / this.canvas.width;
        const scaleY = container.clientHeight / this.canvas.height;
        this.zoomLevel = Math.min(scaleX, scaleY) * 0.9;
        this.updateZoom();
    }

    updateZoom() {
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.overlayCanvas.style.transform = `scale(${this.zoomLevel})`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }

    resizeCanvas() {
        const width = parseInt(document.getElementById('canvasWidth').value);
        const height = parseInt(document.getElementById('canvasHeight').value);
        
        if (width < 100 || width > 2000 || height < 100 || height > 2000) {
            this.showNotification('キャンバスサイズは100-2000pxの範囲で設定してください', 'error');
            return;
        }
        
        // Save current canvas
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Resize canvases
        this.canvas.width = width;
        this.canvas.height = height;
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        
        // Clear and set background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, width, height);
        
        // Restore image data
        this.ctx.putImageData(imageData, 0, 0);
        
        document.getElementById('canvasSize').textContent = `${width} × ${height}`;
        this.saveState();
        this.showNotification(`キャンバスを${width}×${height}にリサイズしました`);
    }

    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        
        this.history.push(this.canvas.toDataURL());
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyStep--;
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            this.showNotification('元に戻しました');
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            this.showNotification('やり直しました');
        }
    }

    restoreState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    clearCanvas() {
        if (confirm('キャンバスをクリアしますか？この操作は取り消せません。')) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.saveState();
            this.showNotification('キャンバスをクリアしました');
        }
    }

    applyEffects() {
        const blur = document.getElementById('blurAmount').value;
        const brightness = document.getElementById('brightnessAmount').value;
        const contrast = document.getElementById('contrastAmount').value;
        
        this.ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%)`;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(imageData, 0, 0);
        
        this.ctx.filter = 'none';
        this.saveState();
        this.showNotification('エフェクトを適用しました');
    }

    resetEffects() {
        document.getElementById('blurAmount').value = 0;
        document.getElementById('brightnessAmount').value = 100;
        document.getElementById('contrastAmount').value = 100;
        
        document.getElementById('blurValue').textContent = '0px';
        document.getElementById('brightnessValue').textContent = '100%';
        document.getElementById('contrastValue').textContent = '100%';
        
        this.showNotification('エフェクトをリセットしました');
    }

    updateEffectPreview() {
        const blur = document.getElementById('blurAmount').value;
        const brightness = document.getElementById('brightnessAmount').value;
        const contrast = document.getElementById('contrastAmount').value;
        
        document.getElementById('blurValue').textContent = `${blur}px`;
        document.getElementById('brightnessValue').textContent = `${brightness}%`;
        document.getElementById('contrastValue').textContent = `${contrast}%`;
    }

    addLayer() {
        const layerId = this.layers.length;
        const layerName = `レイヤー ${layerId}`;
        
        // Create new canvas for layer
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        
        this.layers.push({
            id: layerId,
            name: layerName,
            visible: true,
            canvas: canvas
        });
        
        this.updateLayersList();
        this.showNotification(`${layerName}を追加しました`);
    }

    updateLayersList() {
        const layersList = document.getElementById('layersList');
        layersList.innerHTML = this.layers.map(layer => `
            <div class="layer-item ${layer.id === this.currentLayer ? 'active' : ''}" data-layer="${layer.id}">
                <span class="layer-name">${layer.name}</span>
                <div class="layer-controls">
                    <button class="layer-btn" title="表示/非表示">${layer.visible ? '👁️' : '🙈'}</button>
                    <button class="layer-btn" title="削除">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    setupModals() {
        // Upload modal
        document.getElementById('closeUploadModal').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.remove('active');
        });
        
        document.getElementById('cancelUploadBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').classList.remove('active');
        });
        
        // Save modal
        document.getElementById('closeSaveModal').addEventListener('click', () => {
            document.getElementById('saveModal').classList.remove('active');
        });
        
        document.getElementById('cancelSaveBtn').addEventListener('click', () => {
            document.getElementById('saveModal').classList.remove('active');
        });
        
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadImage();
        });
        
        document.getElementById('saveToGalleryBtn').addEventListener('click', () => {
            this.saveToGallery();
        });
        
        document.getElementById('saveQuality').addEventListener('input', (e) => {
            document.getElementById('qualityValue').textContent = `${e.target.value}%`;
        });
        
        // Modal background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        document.getElementById('confirmUploadBtn').addEventListener('click', () => {
            this.loadSelectedImages();
        });
    }

    handleFiles(files) {
        const preview = document.getElementById('uploadPreview');
        preview.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const item = document.createElement('div');
                    item.className = 'preview-item';
                    item.innerHTML = `
                        <img src="${e.target.result}" class="preview-image" data-index="${index}">
                        <button class="preview-remove" onclick="this.parentElement.remove()">×</button>
                    `;
                    preview.appendChild(item);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    loadSelectedImages() {
        const images = document.querySelectorAll('.preview-image');
        if (images.length > 0) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Scale image to fit canvas
                const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (this.canvas.width - width) / 2;
                const y = (this.canvas.height - height) / 2;
                
                this.ctx.drawImage(img, x, y, width, height);
                this.saveState();
                this.showNotification('画像を読み込みました');
                document.getElementById('uploadModal').classList.remove('active');
            };
            img.src = images[0].src;
        }
    }

    showUploadModal() {
        document.getElementById('uploadModal').classList.add('active');
    }

    showSaveModal() {
        document.getElementById('saveModal').classList.add('active');
        this.updateSavePreview();
    }

    updateSavePreview() {
        const preview = document.getElementById('savePreview');
        const ctx = preview.getContext('2d');
        
        const scale = Math.min(preview.width / this.canvas.width, preview.height / this.canvas.height);
        const width = this.canvas.width * scale;
        const height = this.canvas.height * scale;
        const x = (preview.width - width) / 2;
        const y = (preview.height - height) / 2;
        
        ctx.clearRect(0, 0, preview.width, preview.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, preview.width, preview.height);
        ctx.drawImage(this.canvas, x, y, width, height);
    }

    downloadImage() {
        const filename = document.getElementById('saveFileName').value || 'artwork';
        const format = document.getElementById('saveFormat').value;
        const quality = document.getElementById('saveQuality').value / 100;
        
        let mimeType, extension;
        
        switch (format) {
            case 'png':
                mimeType = 'image/png';
                extension = 'png';
                break;
            case 'jpg':
                mimeType = 'image/jpeg';
                extension = 'jpg';
                break;
            case 'webp':
                mimeType = 'image/webp';
                extension = 'webp';
                break;
        }
        
        const link = document.createElement('a');
        link.download = `${filename}.${extension}`;
        link.href = this.canvas.toDataURL(mimeType, quality);
        link.click();
        
        this.showNotification(`${filename}.${extension}をダウンロードしました`);
        document.getElementById('saveModal').classList.remove('active');
    }

    saveToGallery() {
        const filename = document.getElementById('saveFileName').value || 'artwork';
        const dataUrl = this.canvas.toDataURL('image/png');
        
        this.gallery.unshift({
            id: Date.now(),
            name: filename,
            data: dataUrl,
            timestamp: new Date().toISOString()
        });
        
        if (this.gallery.length > 20) {
            this.gallery = this.gallery.slice(0, 20);
        }
        
        this.saveGallery();
        this.updateGallery();
        this.showNotification(`${filename}をギャラリーに保存しました`);
        document.getElementById('saveModal').classList.remove('active');
    }

    updateGallery() {
        const gallery = document.getElementById('galleryGrid');
        gallery.innerHTML = this.gallery.map(item => `
            <div class="gallery-item" data-id="${item.id}">
                <img src="${item.data}" class="gallery-image" alt="${item.name}">
                <div class="gallery-overlay">
                    <div>${item.name}</div>
                </div>
            </div>
        `).join('');
        
        // Add click events
        gallery.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.loadFromGallery(id);
            });
        });
    }

    loadFromGallery(id) {
        const item = this.gallery.find(g => g.id === id);
        if (item) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
                this.saveState();
                this.showNotification(`${item.name}を読み込みました`);
            };
            img.src = item.data;
        }
    }

    clearGallery() {
        if (confirm('ギャラリーをクリアしますか？')) {
            this.gallery = [];
            this.saveGallery();
            this.updateGallery();
            this.showNotification('ギャラリーをクリアしました');
        }
    }

    saveGallery() {
        localStorage.setItem('paintStudioGallery', JSON.stringify(this.gallery));
    }

    loadGallery() {
        const saved = localStorage.getItem('paintStudioGallery');
        return saved ? JSON.parse(saved) : [];
    }

    updateUI() {
        // Update all UI elements to reflect current state
        document.getElementById('brushSizeValue').textContent = `${this.currentSize}px`;
        document.getElementById('brushOpacityValue').textContent = `${this.currentOpacity}%`;
        document.getElementById('brushHardnessValue').textContent = `${this.currentHardness}%`;
        document.getElementById('canvasSize').textContent = `${this.canvas.width} × ${this.canvas.height}`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notificationContainer').appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
}

// Initialize application
let paintStudio;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Digital Paint Studio - Professional Paint System v1.0');
    paintStudio = new DigitalPaintStudio();
});

// Export for debugging
window.DigitalPaintStudio = DigitalPaintStudio;