(function() {
    // ==========================================
    // GOD ENGINE v49: FULL NATIVE UI + LAN BRIDGE
    // Кнопки интерфейса заменены на кастомную текстуру.
    // Убраны все неоновые свечения и градиенты.
    // ==========================================

    var w = 16, h = 16;
    var currentBrush = 0; 
    var isDrawing = false;
    var mapData = [];
    var c2rt = null;
    var freezeInterval = null;
    var isFrozen = false;

    // --- ИНТЕГРАЦИЯ С LANBRIDGE: ПРИЕМ КАРТЫ ОТ ДРУГА ---
    window.ZoomEditor = window.ZoomEditor || {};
    window.ZoomEditor.applyAndFreezeMap = function(incomingMapData) {
        try {
            mapData = incomingMapData; // Заменяем локальную матрицу на ту, что прислал Хост
            refreshVisuals();          // Обновляем картинку в редакторе
            
            // Если карта еще не заморожена, включаем заморозку
            if (!isFrozen) {
                toggleFreeze();
            }
            if (window.appendMsg) {
                window.appendMsg("System: Карта Хоста успешно применена и заморожена!", "#00ff00");
            }
        } catch(e) {
            console.error("Zoom Editor: Ошибка применения карты", e);
        }
    };
    // ----------------------------------------------------

    // Подключение к движку
    var initInterval = setInterval(function() {
        if (!c2rt) {
            if (window.cr_getC2Runtime) c2rt = window.cr_getC2Runtime();
            else if (window.c2runtime) c2rt = window.c2runtime;
        }
        if (c2rt) clearInterval(initInterval);
    }, 500);

    for(var y=0; y<h; y++) {
        mapData[y] = [];
        for(var x=0; x<w; x++) { mapData[y][x] = 0; }
    }

    var style = document.createElement("style");
    style.innerHTML = "" +
        ".arch-toggle-btn { position: fixed; z-index: 9999; bottom: 20px; left: 20px; width: 60px; height: 60px; background-image: url('gui_pad_btn-sheet0.png'); background-size: contain; background-repeat: no-repeat; background-position: center; image-rendering: pixelated; cursor: pointer; transition: transform 0.1s; -webkit-tap-highlight-color: transparent; }" +
        ".arch-toggle-btn:active { transform: scale(0.9); }" +
        ".arch-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 99999; display: none; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 10px; overflow-y: auto; font-family: sans-serif; touch-action: pan-y; }" +
        ".arch-close-x { position: absolute; top: 10px; right: 15px; color: #e74c3c; font-size: 40px; font-weight: bold; cursor: pointer; text-shadow: 0 0 10px red; padding: 10px; }" +
        ".arch-header { color: #fff; font-weight: bold; font-size: 16px; margin-bottom: 10px; letter-spacing: 1px; text-shadow: 2px 2px 0 #000;}" +
        ".arch-palette { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 5px; border: 2px solid #222; width: 95%; max-width: 500px; margin-bottom: 10px; }" +
        ".arch-brush { padding: 4px 8px; background: rgba(0,0,0,0.8); border: 2px solid #333; cursor: pointer; border-radius: 4px; font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 6px; -webkit-tap-highlight-color: transparent;}" +
        ".arch-brush.active { border-color: #fff; color: #fff; font-weight: bold; }" +
        ".arch-brush-icon { width: 16px; height: 16px; object-fit: contain; image-rendering: pixelated; pointer-events: none;}" +
        ".arch-grid { display: grid; grid-template-columns: repeat(16, 1fr); grid-template-rows: repeat(16, 1fr); width: 60vmin; height: 60vmin; max-width: 380px; max-height: 380px; gap: 1px; background: #222; border: 4px solid #111; padding: 1px; user-select: none; margin-bottom: 10px; touch-action: none; }" +
        ".arch-cell { background-color: #000; display: flex; align-items: center; justify-content: center; cursor: crosshair; color: #fff; font-weight: bold; background-size: 100% 100%; background-position: center; background-repeat: no-repeat; image-rendering: pixelated; }" +
        ".arch-cell-new { color: #ff3333; font-size: max(12px, 3vmin); text-shadow: 0 0 5px red; background-image: none !important;} " +
        ".arch-controls { display: flex; flex-direction: column; gap: 5px; width: 95%; max-width: 500px; margin-bottom: 20px;}" +
        ".arch-textarea { width: 100%; height: 50px; background: rgba(0,0,0,0.8); color: #fff; border: 2px solid #333; font-size: 10px; padding: 5px; box-sizing: border-box; resize: none; display: none; }" +
        ".arch-btn-row { display: flex; flex-wrap: wrap; gap: 5px; }" +
        ".arch-btn { " +
            "flex: 1; min-width: 140px; padding: 12px 5px; " +
            "font-weight: bold; font-size: 11px; color: #fff; text-transform: uppercase; " +
            "cursor: pointer; transition: transform 0.1s; -webkit-tap-highlight-color: transparent; " +
            "border: none; background-color: transparent; " +
            "background-image: url('" + encodeURI("кнопка.png") + "'); " +
            "background-size: 100% 100%; background-position: center; background-repeat: no-repeat; " +
            "image-rendering: pixelated; " +
            "text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 2px rgba(0,0,0,0.8); " + 
        "}" +
        ".arch-btn:active { transform: scale(0.95); }" + 
        ".btn-freeze.frozen { color: #ff4444; }"; 

    document.head.appendChild(style);

    var toggleBtn = document.createElement("div");
    toggleBtn.className = "arch-toggle-btn";
    document.body.appendChild(toggleBtn);

    var overlay = document.createElement("div");
    overlay.className = "arch-overlay";
    document.body.appendChild(overlay);

    var closeX = document.createElement("div");
    closeX.className = "arch-close-x";
    closeX.innerHTML = "✖";
    overlay.appendChild(closeX);

    var header = document.createElement("div");
    header.className = "arch-header";
    header.innerHTML = "Редактор карты";
    overlay.appendChild(header);

    var brushes = [
        { id: 0, img: "пустота.png", name: "Пустошь" },
        { id: 12, img: "вертикальная дорога.png", name: "Дорога (В)" }, 
        { id: 13, img: "горизонтальная дорога.png", name: "Дорога (Г)" }, 
        { id: 14, img: "перекрёсток.png", name: "Перекресток" },
        { id: 6, img: "город.png", name: "Город" },
        { id: 9, img: "деревня.png", name: "Деревня" },
        { id: 5, img: "военка.png", name: "Военка" },
        { id: 11, img: "больница.png", name: "Больница" },
        { id: 15, img: "пожарка.png", name: "Пожарка" },
        { id: 2, img: "секретка.png", name: "Секрет" }
    ];

    var palette = document.createElement("div");
    palette.className = "arch-palette";
    
    function getBrushById(id) { 
        for(var i=0; i<brushes.length; i++) { 
            if (brushes[i].id === id) return brushes[i]; 
        } 
        return null; 
    }

    brushes.forEach(function(b) {
        var btn = document.createElement("div");
        btn.className = "arch-brush";
        if (b.id === 0) btn.classList.add("active");
        
        btn.innerHTML = "<img src='" + encodeURI(b.img) + "' class='arch-brush-icon' onerror='this.style.display=\"none\"'> " + b.name;
        
        var selectBrush = function() { 
            var allBrushes = document.querySelectorAll('.arch-brush');
            for(var i=0; i<allBrushes.length; i++) {
                allBrushes[i].classList.remove('active');
            }
            btn.classList.add('active'); 
            currentBrush = b.id; 
        };
        
        btn.onclick = selectBrush;
        btn.ontouchstart = function(e) { e.preventDefault(); selectBrush(); };
        
        palette.appendChild(btn);
    });
    overlay.appendChild(palette);

    var grid = document.createElement("div");
    grid.className = "arch-grid";

    function updateCellVisual(cell, x, y) {
        var val = mapData[y][x];
        var brush = getBrushById(val);
        if (brush) {
            cell.innerText = "";
            cell.className = "arch-cell";
            cell.style.backgroundImage = "url('" + encodeURI(brush.img) + "')";
        } else {
            cell.style.backgroundImage = "none";
            cell.innerText = val;
            cell.className = "arch-cell arch-cell-new";
        }
    }

    function paintCell(cell, x, y) { 
        mapData[y][x] = currentBrush; 
        updateCellVisual(cell, x, y); 
    }

    var cells = [];
    for(var y = 0; y < h; y++) {
        cells[y] = [];
        for(var x = 0; x < w; x++) {
            var cell = document.createElement("div");
            cell.className = "arch-cell";
            cell.dataset.x = x; 
            cell.dataset.y = y;
            cell.onmousedown = function() { isDrawing = true; paintCell(this, parseInt(this.dataset.x), parseInt(this.dataset.y)); };
            cell.onmouseenter = function() { if (isDrawing) paintCell(this, parseInt(this.dataset.x), parseInt(this.dataset.y)); };
            grid.appendChild(cell);
            cells[y][x] = cell;
        }
    }
    overlay.appendChild(grid);

    window.addEventListener('mouseup', function() { isDrawing = false; });
    window.addEventListener('touchend', function() { isDrawing = false; });
    
    grid.addEventListener('touchmove', function(e) { 
        e.preventDefault(); 
        var touch = e.touches[0]; 
        var elem = document.elementFromPoint(touch.clientX, touch.clientY); 
        if (elem && elem.classList.contains('arch-cell')) { 
            paintCell(elem, parseInt(elem.dataset.x), parseInt(elem.dataset.y)); 
        } 
    }, {passive: false});

    var controls = document.createElement("div");
    controls.className = "arch-controls";
    
    var textArea = document.createElement("textarea");
    textArea.className = "arch-textarea";
    controls.appendChild(textArea);

    var row1 = document.createElement("div"); row1.className = "arch-btn-row";
    var row2 = document.createElement("div"); row2.className = "arch-btn-row";

    var btnFreeze = document.createElement("button");
    btnFreeze.className = "arch-btn btn-freeze";
    btnFreeze.innerText = "ЗАМОРОЗИТЬ В ПАМЯТИ";

    var btnScan = document.createElement("button");
    btnScan.className = "arch-btn btn-scan";
    btnScan.innerText = "СКАНИРОВАТЬ ИГРУ";

    var btnImport = document.createElement("button");
    btnImport.className = "arch-btn btn-io";
    btnImport.innerText = "ИМПОРТ КОДА";
    
    var btnExport = document.createElement("button");
    btnExport.className = "arch-btn btn-io";
    btnExport.innerText = "ЭКСПОРТ КОДА";

    row1.appendChild(btnFreeze);
    row2.appendChild(btnScan);
    row2.appendChild(btnImport);
    row2.appendChild(btnExport);
    
    controls.appendChild(row1);
    controls.appendChild(row2);
    overlay.appendChild(controls);

    // ==========================================
    // ЛОГИКА ОТКРЫТИЯ/ЗАКРЫТИЯ МЕНЮ
    // ==========================================
    
    function openOverlay() {
        overlay.style.display = "flex";
    }
    toggleBtn.onclick = openOverlay;
    toggleBtn.ontouchstart = function(e) { e.preventDefault(); openOverlay(); };

    function closeOverlay(e) {
        if (e.target.className === "arch-close-x") {
            overlay.style.display = "none";
        }
    }
    overlay.onclick = closeOverlay;
    overlay.ontouchstart = function(e) { if (e.target.className === "arch-close-x") { e.preventDefault(); overlay.style.display = "none"; } };

    function refreshVisuals() {
        for(var y=0; y<h; y++) {
            for(var x=0; x<w; x++) {
                updateCellVisual(cells[y][x], x, y);
            }
        }
    }

    // ЛОГИКА ЗАМОРОЗКИ И ОТПРАВКИ КАРТЫ ПО СЕТИ
    function toggleFreeze() {
        if (isFrozen) {
            clearInterval(freezeInterval);
            isFrozen = false;
            btnFreeze.classList.remove("frozen");
            btnFreeze.innerText = "ЗАМОРОЗИТЬ В ПАМЯТИ";
            return;
        }

        isFrozen = true;
        btnFreeze.classList.add("frozen");
        btnFreeze.innerText = "ЗАМОРОЖЕНО";

        // --- ИНТЕГРАЦИЯ С LANBRIDGE: ОТПРАВКА КАРТЫ ДРУГУ ---
        if (window.sendMapToPeer) {
            window.sendMapToPeer(mapData);
        }
        // ----------------------------------------------------

        freezeInterval = setInterval(function() {
            if (!c2rt || !c2rt.types_by_index) return;
            var mapInst = null;
            for (var i = 0; i < c2rt.types_by_index.length; i++) {
                var t = c2rt.types_by_index[i];
                if (t && t.name === "t518" && t.instances && t.instances.length > 0) {
                    mapInst = t.instances[0];
                    break;
                }
            }
            if (!mapInst) return; 

            mapInst.width = 16; mapInst.height = 16; mapInst.depth = 1;
            if(!mapInst.arr) mapInst.arr = [];
            
            for (var x = 0; x < w; x++) {
                if(!mapInst.arr[x]) mapInst.arr[x] = [];
                for (var y = 0; y < h; y++) {
                    if(!mapInst.arr[x][y]) mapInst.arr[x][y] = [0];
                    mapInst.arr[x][y][0] = mapData[y][x];
                }
            }
        }, 10);
    }
    btnFreeze.onclick = toggleFreeze;
    btnFreeze.ontouchstart = function(e) { e.preventDefault(); toggleFreeze(); };

    // СКАНИРОВАНИЕ
    function scanGame() {
        if (!c2rt || !c2rt.types_by_index) return;
        var mapInst = null;
        for (var i = 0; i < c2rt.types_by_index.length; i++) {
            var t = c2rt.types_by_index[i];
            if (t && t.name === "t518" && t.instances && t.instances.length > 0) { mapInst = t.instances[0]; break; }
        }
        if (!mapInst || !mapInst.arr) { alert("Матрица еще не создана игрой!"); return; }
        
        var rawArr = mapInst.arr;
        for (var x = 0; x < w; x++) {
            for (var y = 0; y < h; y++) {
                mapData[y][x] = (rawArr[x] && rawArr[x][y]) ? rawArr[x][y][0] : 0;
            }
        }
        refreshVisuals();
    }
    btnScan.onclick = scanGame;
    btnScan.ontouchstart = function(e) { e.preventDefault(); scanGame(); };

    // ИМПОРТ
    function doImport() {
        if(textArea.style.display === "block") {
            try {
                var cleanStr = textArea.value.replace(/var\s+\w+\s*=\s*/g, '').replace(/;$/g, '').trim();
                var arr = JSON.parse(cleanStr);
                if (arr.length === 16) { mapData = arr; refreshVisuals(); }
            } catch(e) {}
            textArea.style.display = "none";
        } else {
            textArea.style.display = "block";
        }
    }
    btnImport.onclick = doImport;
    btnImport.ontouchstart = function(e) { e.preventDefault(); doImport(); };

    // ЭКСПОРТ
    function doExport() {
        var out = "var customMap = [\n";
        for(var y = 0; y < h; y++) { out += "  [" + mapData[y].join(",") + "]" + (y < h - 1 ? ",\n" : "\n"); }
        out += "];";
        textArea.style.display = "block"; textArea.value = out; textArea.select(); document.execCommand("copy");
        
        setTimeout(function() {
            textArea.style.display = "none";
        }, 3000);
    }
    btnExport.onclick = doExport;
    btnExport.ontouchstart = function(e) { e.preventDefault(); doExport(); };

})();