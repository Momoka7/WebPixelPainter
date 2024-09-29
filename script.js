let canvas,
  ctx,
  pixelSize,
  isDrawing = false;
let undoStack = [];
let redoStack = [];
let lastX, lastY;
let currentBackgroundTheme = "white";
let maxBrushSize = 5; // 最大画笔大小
let currentDrawingActions = []; // 用于存储当前笔画的操作

// 将所有的初始化逻辑移到 DOMContentLoaded 事件中
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("startDrawing").addEventListener("click", () => {
    const width = parseInt(document.getElementById("canvasWidth").value);
    const height = parseInt(document.getElementById("canvasHeight").value);

    if (width && height) {
      setupCanvas(width, height);
      document.getElementById("setup").style.display = "none";
      document.getElementById("drawingApp").style.display = "flex";
    }
  });

  // 添加背景主题切换事件监听
  document
    .getElementById("backgroundTheme")
    .addEventListener("change", function (e) {
      updateBackgroundTheme(e.target.value);
    });

  document
    .getElementById("exportButton")
    .addEventListener("click", exportImage);
  document
    .getElementById("brushSize")
    .addEventListener("input", updateBrushSize);
  document.getElementById("clearButton").addEventListener("click", clearCanvas);

  // 添加键盘事件监听
  document.addEventListener("keydown", handleKeyboardShortcuts);

  // 初始化背景主题
  const initialTheme = document.getElementById("backgroundTheme").value;
  updateBackgroundTheme(initialTheme);
});

function setupCanvas(width, height) {
  canvas = document.getElementById("pixelCanvas");
  ctx = canvas.getContext("2d", { willReadFrequently: true });

  pixelSize = Math.floor(Math.min(800 / width, 600 / height));
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;

  // 初始化背景
  updateBackgroundTheme(currentBackgroundTheme);

  canvas.addEventListener("pointerdown", startDrawing);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointerout", stopDrawing);

  // 禁用默认的触摸行为，防止在移动设备上滚动或缩放
  canvas.style.touchAction = "none";

  // 初始保存状态
  saveState();
}

function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = getCoordinates(e);
  currentDrawingActions = []; // 重置当前笔画操作
  draw(e);
}

function getCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left) / pixelSize) * pixelSize,
    Math.floor((e.clientY - rect.top) / pixelSize) * pixelSize,
  ];
}

function draw(e) {
  if (!isDrawing) return;

  const [x, y] = getCoordinates(e);
  let pressure = e.pressure !== undefined ? e.pressure : 1;

  // 如果是鼠标事件，使用最大画笔大小
  if (e.pointerType === "mouse") {
    pressure = 1;
  }

  const brushSize = Math.max(1, Math.floor(pressure * maxBrushSize));

  console.log(
    `Pointer type: ${e.pointerType}, Pressure: ${pressure}, Brush size: ${brushSize}`
  );

  const color = document.getElementById("colorPicker").value;

  // 使用 Bresenham 算法在两点之间插值
  const points = bresenhamLine(lastX, lastY, x, y);
  for (let point of points) {
    ctx.fillStyle = color;
    ctx.fillRect(
      point.x,
      point.y,
      pixelSize * brushSize,
      pixelSize * brushSize
    );

    // 记录绘制操作
    currentDrawingActions.push({
      x: point.x,
      y: point.y,
      brushSize: brushSize,
      color: color,
    });
  }

  lastX = x;
  lastY = y;
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    if (currentDrawingActions.length > 0) {
      saveState();
    }
  }
}

function saveState() {
  undoStack.push({
    actions: currentDrawingActions,
    background: currentBackgroundTheme,
  });
  redoStack = []; // 清空重做栈
  currentDrawingActions = []; // 重置当前笔画操作
}

function undo() {
  if (undoStack.length > 1) {
    // 保留初始状态
    redoStack.push(undoStack.pop());
    redrawFromStack();
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(redoStack.pop());
    redrawFromStack();
  }
}

function redrawFromStack() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateBackgroundTheme(undoStack[undoStack.length - 1].background, false);

  for (let state of undoStack) {
    for (let action of state.actions) {
      ctx.fillStyle = action.color;
      ctx.fillRect(
        action.x,
        action.y,
        pixelSize * action.brushSize,
        pixelSize * action.brushSize
      );
    }
  }
}

function bresenhamLine(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? pixelSize : -pixelSize;
  const sy = y0 < y1 ? pixelSize : -pixelSize;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

function updateBackgroundTheme(theme, saveToStack = true) {
  currentBackgroundTheme = theme;
  if (canvas) {
    canvas.className = `theme-${theme}`;
    redrawCanvas();
  }

  // 更新选择框的值
  document.getElementById("backgroundTheme").value = theme;

  if (canvas && saveToStack) {
    saveState();
  }
}

function redrawCanvas() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 先绘制背景
  if (currentBackgroundTheme !== "transparent") {
    ctx.fillStyle = getBackgroundColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 然后绘制图像内容
  ctx.putImageData(imageData, 0, 0);
}

function getBackgroundColor() {
  switch (currentBackgroundTheme) {
    case "white":
      return "#ffffff";
    case "dark":
      return "#333333";
    case "black":
      return "#000000";
    default:
      return "transparent";
  }
}

function exportImage() {
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "pixel_art.png";
  link.href = dataURL;
  link.click();
}

function updateBrushSize(e) {
  maxBrushSize = parseInt(e.target.value);
  document.getElementById("brushSizeValue").textContent = maxBrushSize;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  redrawCanvas(); // 使用 redrawCanvas 函数来确保正确应用背景
  saveState();
}

function handleKeyboardShortcuts(e) {
  if (e.ctrlKey && e.key === "z") {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    redo();
  }
}
