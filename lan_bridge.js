(function() {
    // ================= ПЕРЕМЕННЫЕ =================
    var peer = null;
    var conn = null;
    var c2runtime = null;

    var remoteBase = null;
    var remoteSkin = null;

    var longPressTimer;
    var isLongPress = false;

    var activeEmotes = [];

    // --- НИКНЕЙМЫ ---
    var myNick = ""; // Пусто при старте
    var remoteNick = "";
    
    // Палитра цветов (Белый, Фиолетовый, Зеленый, Синий, Желтый)
    var nickColors = ["#ffffff", "#aa00ff", "#00ff00", "#55aaff", "#ffff00"];
    var myNickColor = "#ffffff";
    var remoteNickColor = "#ffffff";

    var localNickElem = null;  
    var remoteNickElem = null; 

    // ================= НАСТРОЙКИ ЭМОЦИЙ =================
    var emotesConfig = [
        { id: 0, button: "images/fog.png", frames: ["images/folow1.png", "images/folow2.png", "images/folow3.png"] },
        { id: 1, button: "images/dud.png", frames: ["images/kit1.png", "images/kit2.png", "images/kit3.png"] },
        { id: 2, button: "images/bob.png", frames: ["images/kot1.png", "images/kot2.png", "images/kot3.png"] },
        { id: 3, button: "images/no.png", frames: ["images/net1.png", "images/net2.png", "images/net3.png"] },
        { id: 4, button: "images/stop.png", frames: ["images/sop1.png", "images/sop2.png", "images/sop3.png"] }
    ];

    // ================= ИНИЦИАЛИЗАЦИЯ =================
    function initBridge() {
        if (typeof cr_getC2Runtime !== "undefined") {
            c2runtime = cr_getC2Runtime();
            if (c2runtime) {
                createDebugMenu();
                startHook();
                requestAnimationFrame(gameLoop);
                console.log("[LAN] Auto-Layer Bridge Ready.");
                return;
            }
        }
        setTimeout(initBridge, 500);
    }

    initBridge();

    // ================= ПОИСК ОБЪЕКТОВ =================
    function getTypeByName(name) {
        if (!c2runtime.types_by_index) return null;
        for (var i = 0; i < c2runtime.types_by_index.length; i++) {
            if (c2runtime.types_by_index[i].name === name) return c2runtime.types_by_index[i];
        }
        return null;
    }

    function findLocalPlayer() {
        if (!c2runtime) return null;
        var typeBase = getTypeByName("t181");
        if (!typeBase) return null;

        var instances = typeBase.instances;
        for (var i = 0; i < instances.length; i++) {
            var inst = instances[i];
            if (inst !== remoteBase && !inst.dead) return inst;
        }
        if (instances.length > 0) return instances[0];
        return null;
    }

    // ================= ЛОГИКА ЭКРАНА И ЭМОЦИЙ =================
    function layerToScreen(layer, x, y) {
        var layout = layer.layout;
        var canvas = c2runtime.canvas;
        var z = layer.getScale();
        var scrollX = layer.viewLeft + (layer.viewRight - layer.viewLeft) / 2;
        var scrollY = layer.viewTop + (layer.viewBottom - layer.viewTop) / 2;

        var relX = (x - scrollX) * z;
        var relY = (y - scrollY) * z;

        var cssX = relX + canvas.width / 2;
        var cssY = relY + canvas.height / 2;

        var rect = canvas.getBoundingClientRect();
        var cssScaleX = rect.width / canvas.width;
        var cssScaleY = rect.height / canvas.height;

        return {
            x: rect.left + cssX * cssScaleX,
            y: rect.top + cssY * cssScaleY
        };
    }

    function playEmote(targetInst, emoteId) {
        if (!targetInst || emoteId < 0 || emoteId >= emotesConfig.length) return;
        var config = emotesConfig[emoteId];

        var img = document.createElement("img");
        img.src = config.frames[0];
        img.style.position = "absolute";
        img.style.zIndex = "10000";
        img.style.width = "48px";
        img.style.height = "48px";
        img.style.pointerEvents = "none";
        document.body.appendChild(img);

        var emoteObj = { elem: img, target: targetInst, frameIdx: 0, loopCount: 0 };
        activeEmotes.push(emoteObj);

        var interval = setInterval(function() {
            emoteObj.frameIdx++;
            if (emoteObj.frameIdx >= 3) {
                emoteObj.frameIdx = 0;
                emoteObj.loopCount++;
            }
            if (emoteObj.loopCount >= 3) {
                clearInterval(interval);
                if (img.parentNode) img.parentNode.removeChild(img);
                var idx = activeEmotes.indexOf(emoteObj);
                if (idx > -1) activeEmotes.splice(idx, 1);
            } else {
                img.src = config.frames[emoteObj.frameIdx];
            }
        }, 400);
    }

    // --- ФУНКЦИЯ СОЗДАНИЯ МЕТКИ НИКА ---
    function createNickLabel(text, color) {
        var el = document.createElement("div");
        el.innerText = text;
        el.style.position = "absolute";
        el.style.background = "transparent"; // Убрали подложку
        el.style.color = color || "#ffffff";
        el.style.textShadow = "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000"; // Черная обводка текста
        el.style.padding = "0px";
        el.style.fontSize = "12px";
        el.style.fontFamily = "sans-serif";
        el.style.fontWeight = "bold";
        el.style.pointerEvents = "none";
        el.style.zIndex = "9998";
        el.style.whiteSpace = "nowrap";
        el.style.transform = "translate(-50%, -100%)";
        el.style.display = "none";
        document.body.appendChild(el);
        return el;
    }

    function updateNicknames() {
        var local = findLocalPlayer();
        // Показываем свой ник, только если он не пустой
        if (local && myNick !== "") {
            if (!localNickElem) localNickElem = createNickLabel(myNick, myNickColor);
            if (localNickElem.innerText !== myNick) localNickElem.innerText = myNick;
            if (localNickElem.style.color !== myNickColor) localNickElem.style.color = myNickColor;

            var layer = local.layer || (c2runtime.running_layout.layers[0]);
            var pos = layerToScreen(layer, local.x, local.y - 20); // Опустили ниже (было 70)
            
            localNickElem.style.left = pos.x + "px";
            localNickElem.style.top = pos.y + "px";
            localNickElem.style.display = "block";
        } else {
            if (localNickElem) localNickElem.style.display = "none";
        }

        // Показываем ник друга, только если он не пустой
        if (remoteBase && remoteNick !== "") {
            if (!remoteNickElem) remoteNickElem = createNickLabel(remoteNick, remoteNickColor);
            if (remoteNickElem.innerText !== remoteNick) remoteNickElem.innerText = remoteNick;
            if (remoteNickElem.style.color !== remoteNickColor) remoteNickElem.style.color = remoteNickColor;

            var rLayer = remoteBase.layer || (c2runtime.running_layout.layers[0]);
            var rPos = layerToScreen(rLayer, remoteBase.x, remoteBase.y - 45); // Опустили ниже

            remoteNickElem.style.left = rPos.x + "px";
            remoteNickElem.style.top = rPos.y + "px";
            remoteNickElem.style.display = "block";
        } else {
            if (remoteNickElem) remoteNickElem.style.display = "none";
        }
    }

    function gameLoop() {
        if (activeEmotes.length > 0 && c2runtime) {
            for (var i = 0; i < activeEmotes.length; i++) {
                var e = activeEmotes[i];
                if (e.target && e.elem) {
                    var layer = e.target.layer || (c2runtime.running_layout.layers[0]);
                    var pos = layerToScreen(layer, e.target.x, e.target.y - 95);
                    e.elem.style.left = (pos.x - 24) + "px";
                    e.elem.style.top = (pos.y - 24) + "px";
                }
            }
        }
        if (c2runtime) updateNicknames();
        requestAnimationFrame(gameLoop);
    }

    // ================= СЕТЬ =================
    function spawnGhost() {
        try {
            var donor = findLocalPlayer();
            var targetLayer;
            var spawnX = 100, spawnY = 100;

            if (donor) {
                targetLayer = donor.layer;
                spawnX = donor.x;
                spawnY = donor.y;
            } else {
                if (c2runtime.running_layout && c2runtime.running_layout.layers) {
                     targetLayer = c2runtime.running_layout.layers[0];
                } else if (c2runtime.layers) {
                     targetLayer = c2runtime.layers[0];
                }
            }
            if (!targetLayer) return;

            var typeBase = getTypeByName("t181");
            var typeSkin = getTypeByName("t997");
            if (!typeBase || !typeSkin) return;

            remoteBase = c2runtime.createInstance(typeBase, targetLayer, spawnX, spawnY);
            if (donor && donor.instance_vars) {
                remoteBase.instance_vars = donor.instance_vars.slice();
            }

            if (remoteBase.behavior_insts) {
                for (var b = 0; b < remoteBase.behavior_insts.length; b++) {
                    var beh = remoteBase.behavior_insts[b];
                    if (beh.m !== undefined) beh.m = 0;
                }
            }
            remoteSkin = c2runtime.createInstance(typeSkin, targetLayer, spawnX, spawnY);
        } catch(e) { console.error(e); }
    }

    function startHook() {
        setInterval(function() {
            if (!c2runtime || !conn || !conn.open) return;
            var local = findLocalPlayer();
            if (local) {
                var animName = "idle_down";
                if (local.instance_vars && typeof local.instance_vars[1] === "string") {
                    animName = local.instance_vars[1];
                } else if (local.cur_animation) {
                    animName = local.cur_animation.name;
                }
                try {
                    conn.send({ type: "sync", x: local.x, y: local.y, anim: animName });
                } catch(e) {}
            }

            if (remoteBase && remoteSkin) {
                remoteSkin.x = remoteBase.x;
                remoteSkin.y = remoteBase.y;
                remoteSkin.zindex = remoteBase.zindex + 1;
                if (remoteSkin.set_bbox_changed) remoteSkin.set_bbox_changed();
            }
        }, 40);
    }

    function setupDataListener(c) {
        spawnGhost();
        
        // Сразу отправляем свой ник (если он есть) и свой цвет
        if (myNick !== "") {
            c.send({ type: "nick", name: myNick, color: myNickColor });
        }

        c.on('data', function(data) {
            if (data.type === "chat") appendMsg((remoteNick || "Friend") + ": " + data.msg, "#55aaff");

            // Прием ника И ЦВЕТА
            if (data.type === "nick") {
                remoteNick = data.name;
                remoteNickColor = data.color || "#ffffff";
                appendMsg("System: Friend is now " + remoteNick, "#ffff00");
            }

            // ПРИЕМ КАРТЫ ОТ РЕДАКТОРА
            if (data.type === "map_data") {
                appendMsg("System: Карта получена от друга!", "#ffff00");
                if (window.ZoomEditor && typeof window.ZoomEditor.applyAndFreezeMap === "function") {
                    window.ZoomEditor.applyAndFreezeMap(data.map);
                } else {
                    console.error("[LAN] Редактор не найден для применения карты!");
                }
            }

            if (data.type === "emote" && remoteBase) {
                playEmote(remoteBase, data.id);
            }

            if (data.type === "sync" && remoteBase) {
                remoteBase.x = data.x;
                remoteBase.y = data.y;
                if (remoteBase.set_bbox_changed) remoteBase.set_bbox_changed();
                if (remoteBase.instance_vars) remoteBase.instance_vars[1] = data.anim;

                if (remoteSkin && remoteSkin.cur_animation && remoteSkin.cur_animation.name !== data.anim) {
                    var animObj = null;
                    if (remoteSkin.type.animations) {
                        for(var a=0; a<remoteSkin.type.animations.length; a++){
                            if(remoteSkin.type.animations[a].name === data.anim){
                                animObj = remoteSkin.type.animations[a]; break;
                            }
                        }
                    }
                    if (animObj) remoteSkin.cur_animation = animObj;
                }
            }
        });
    }

    // ================= UI И ГЛОБАЛЬНЫЕ ФУНКЦИИ =================
    
    // ОТПРАВКА КАРТЫ ДРУГУ (Вызывается из zoom.js)
    window.sendMapToPeer = function(mapData) {
        if (conn && conn.open) {
            try {
                conn.send({ type: "map_data", map: mapData });
                appendMsg("System: Карта отправлена другу!", "#00ff00");
            } catch(e) {
                console.error("Ошибка отправки карты:", e);
            }
        } else {
            appendMsg("System: Ошибка - нет подключения к другу!", "#ff4444");
        }
    };

    window.sendChatMessage = function() {
        var input = document.getElementById('chatInput');
        if (!input) return;
        var text = input.value.trim();
        if (text !== "" && conn && conn.open) {
            try {
                conn.send({ type: "chat", msg: text });
                appendMsg("Вы: " + text, "#00ff00");
                input.value = "";
            } catch(e) {}
        }
    };

    window.sendEmote = function(id) {
        var local = findLocalPlayer();
        if (local) {
            playEmote(local, id);
            if (conn && conn.open) conn.send({ type: "emote", id: id });
        }
        window.toggleEmotePanel(false);
    };

    function appendMsg(text, color) {
        var box = document.getElementById('chatBox');
        if (!box) return;
        var msg = document.createElement('div');
        msg.style.color = color || "#fff";
        msg.style.marginBottom = "4px";
        msg.style.textShadow = "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
        msg.innerText = text;
        box.appendChild(msg);
        box.scrollTop = box.scrollHeight;
    }

    // ЛОГИКА ДОЛГОГО НАЖАТИЯ (Открытие ЛАН панели)
    window.onBtnPointerDown = function() {
        isLongPress = false;
        longPressTimer = setTimeout(function() {
            var content = document.getElementById("ui-content-wrapper");
            var inputWrap = document.getElementById("chatInput");
            var nBtn = document.getElementById("nikBtnId"); // Получаем кнопку вызова ника

            if (content && inputWrap) {
                var state = (content.style.display === "none") ? "block" : "none";
                content.style.display = state;
                inputWrap.style.display = state;
                
                // Если открываем ЛАН панель -> прячем кнопку ника. И наоборот.
                if (nBtn) {
                    nBtn.style.display = (state === "block") ? "none" : "block";
                }

                isLongPress = true;
            }
        }, 800);
    };

    window.onBtnPointerUp = function() {
        clearTimeout(longPressTimer);
        if (!isLongPress) window.sendChatMessage();
    };

    window.btnPressEffect = function(el, isDown) {
        el.style.transform = isDown ? "scale(0.95)" : "scale(1.0)";
    };

    window.toggleEmotePanel = function(forceState) {
        var panel = document.getElementById("emote-panel");
        if (!panel) return;
        if (typeof forceState !== "undefined") {
            panel.style.display = forceState ? "flex" : "none";
        } else {
            panel.style.display = (panel.style.display === "none") ? "flex" : "none";
        }
    };

    // --- ЛОГИКА ОКНА НИКНЕЙМА ---
    window.toggleNikPanel = function() {
        var p = document.getElementById("mainNikPanel");
        if(p) {
            p.style.display = (p.style.display === "none") ? "flex" : "none";
        }
    };

    window.saveNickname = function() {
        var inp = document.getElementById("mainNikInput");
        if (inp && inp.value.trim() !== "") {
            myNick = inp.value.trim();
            // Выбираем рандомный цвет из массива
            myNickColor = nickColors[Math.floor(Math.random() * nickColors.length)];
            
            // Отправляем новый ник и цвет по сети сразу, если подключены
            if (conn && conn.open) {
                conn.send({ type: "nick", name: myNick, color: myNickColor });
            }
        }
        window.toggleNikPanel(); // Сворачиваем окно
    };

    window.startHost = function(myId) {
        if (typeof Peer === "undefined") return;
        myId = myId.trim();
        if (!myId) return;
        if (peer) peer.destroy();
        appendMsg("Host init...", "#aaa");
        peer = new Peer(myId, { debug: 1, secure: true });
        peer.on('open', function(id) { appendMsg("Host Ready: " + id, "#ffaa00"); });
        peer.on('connection', function(incoming) {
            conn = incoming;
            conn.on('open', function() { 
                appendMsg("Client connected!", "#007bff"); 
                setupDataListener(conn); 
            });
        });
    };

    window.joinGame = function(targetId) {
        if (typeof Peer === "undefined") return;
        targetId = targetId.trim();
        if (!targetId) return;
        if (peer) peer.destroy();
        appendMsg("Connecting...", "#aaa");
        peer = new Peer({ debug: 1, secure: true });
        peer.on('open', function() {
            var outgoing = peer.connect(targetId);
            outgoing.on('open', function() { 
                conn = outgoing; 
                appendMsg("Connected!", "#007bff"); 
                setupDataListener(conn); 
            });
            outgoing.on('error', function() { appendMsg("Connect Fail", "#ff4444"); });
        });
    };

    function createDebugMenu() {
        // --- 1. КНОПКА ОТКРЫТИЯ ПАНЕЛИ НИКНЕЙМА ---
        var nikBtn = document.createElement("img");
        nikBtn.id = "nikBtnId"; // Выдали ID для скрытия
        nikBtn.src = "images/nik777.png";
        // Поднял выше: top: 10px (вместо 20px)
        nikBtn.style.cssText = "position:fixed; top:10px; left:130px; width:29px; height:30px; cursor:pointer; z-index:10000; display:block;";
        nikBtn.onclick = window.toggleNikPanel;
        document.body.appendChild(nikBtn);

        // --- 2. САМА ПАНЕЛЬ НИКНЕЙМА ---
        var nikPanel = document.createElement("div");
        nikPanel.id = "mainNikPanel";
        nikPanel.style.cssText = "display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:300px; height:180px; background:url('images/btm777-sheet0.png') no-repeat center center; background-size:100% 100%; z-index:10001; flex-direction:column; align-items:center; justify-content:center; gap:15px; font-family:sans-serif;";
        
        var nHTML = "";
        nHTML += '<div style="color:white; font-size:14px; font-weight:bold; text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;">&lt; Введите никнейм &gt;</div>';
        nHTML += '<input type="text" id="mainNikInput" placeholder="Никнейм..." style="width:70%; background:rgba(0,0,0,0.5); color:#ffffff; border:none; padding:10px; font-size:14px; font-weight:bold; text-align:center; border-radius:4px; outline:none;">';
        nHTML += '<button onclick="window.saveNickname()" onmousedown="this.style.transform=\'scale(0.95)\'" onmouseup="this.style.transform=\'scale(1)\'" style="width:100px; height:40px; background:url(\'images/btm888-sheet0.png\') no-repeat center center; background-size:100% 100%; color:white; border:none; font-weight:bold; font-size:16px; text-shadow: 1px 1px 0 #000, -1px -1px 0 #000; cursor:pointer; transition:transform 0.1s;">OK</button>';
        nikPanel.innerHTML = nHTML;
        document.body.appendChild(nikPanel);

        // --- 3. НЕЗАВИСИМАЯ КНОПКА ЭМОЦИЙ ---
        var emoteDiv = document.createElement("div");
        emoteDiv.style.cssText = "position:fixed; top:5px; left:60px; z-index:10000; display:flex; flex-direction:column; align-items:center;";
        
        var eh = "";
        eh += '<img src="images/btm333-sheet0.png" onclick="window.toggleEmotePanel()" style="width:17px; height:40px; cursor:pointer; margin-bottom:5px;">';
        eh += '<div id="emote-panel" style="display:none; flex-direction:column; gap:5px; background:rgba(0,0,0,0.5); padding:5px; border-radius:4px;">';
        for(var i=0; i<emotesConfig.length; i++) {
             eh += '<img src="' + emotesConfig[i].button + '" onclick="window.sendEmote(' + i + ')" style="width:20px; height:20px; cursor:pointer; transition:transform 0.1s;" onmousedown="this.style.transform=\'scale(0.8)\'" onmouseup="this.style.transform=\'scale(1)\'">';
        }
        eh += '</div>';
        emoteDiv.innerHTML = eh;
        document.body.appendChild(emoteDiv);

        // --- 4. ГЛАВНАЯ ПАНЕЛЬ ЛАН ---
        var div = document.createElement("div");
        div.id = "net-ui";
        div.style.cssText = "position:fixed; top:10px; left:100px; z-index:9999; background:transparent; width:200px; font-family:sans-serif;";
        
        var btnStyle = "flex:1; background: url('images/btm888-sheet0.png') no-repeat center center; background-size: 100% 100%; color:white; border:none; padding:10px 0; cursor:pointer; font-size:14px; font-weight:bold; text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; transition: transform 0.1s;";

        var h = "";
        h += '<div id="ui-content-wrapper" style="display:none; background: url(\'images/btm777-sheet0.png\') no-repeat center center; background-size: 100% 100%; padding: 15px; border-radius: 8px; margin-bottom: 5px;">';
        h += '<input type="text" id="peerId" placeholder="Room ID" style="width:100%; box-sizing:border-box; padding:5px; background:rgba(0,0,0,0.3); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:4px; margin-bottom:8px; font-size:12px; outline:none;">';
        h += '<div style="display:flex; gap:8px; margin-bottom:10px;">';
        h += '<button onclick="window.startHost(document.getElementById(\'peerId\').value)" onmousedown="window.btnPressEffect(this, true)" onmouseup="window.btnPressEffect(this, false)" ontouchstart="window.btnPressEffect(this, true)" ontouchend="window.btnPressEffect(this, false)" style="' + btnStyle + '">HOST</button>';
        h += '<button onclick="window.joinGame(document.getElementById(\'peerId\').value)" onmousedown="window.btnPressEffect(this, true)" onmouseup="window.btnPressEffect(this, false)" ontouchstart="window.btnPressEffect(this, true)" ontouchend="window.btnPressEffect(this, false)" style="' + btnStyle + '">JOIN</button>';
        h += '</div>';
        h += '<div id="chatBox" style="height:120px; background:transparent; overflow-y:auto; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;"></div>';
        h += '</div>';

        // --- 5. НИЖНЯЯ ПАНЕЛЬ (ПОЛЕ ЧАТА И КНОПКА) ---
        h += '<div style="display:flex; gap:5px; align-items:center;">';
        h += '<input type="text" id="chatInput" placeholder="Chat..." style="display:none; flex:1; background:rgba(0,0,0,0.5); color:white; border:none; border-radius: 4px; padding: 5px; font-size:13px; outline:none;">';
        
        h += '<img src="images/btm666-sheet0.png" ' +
             'onmousedown="window.onBtnPointerDown()" onmouseup="window.onBtnPointerUp()" ' +
             'ontouchstart="window.onBtnPointerDown()" ontouchend="window.onBtnPointerUp()" ' +
             'style="width:32px; height:32px; cursor:pointer; user-select:none; -webkit-user-drag:none; margin-left: auto; margin-right: 80px;" ' +
             'onerror="this.style.background=\'white\';">';
        h += '</div>';
        
        div.innerHTML = h;
        document.body.appendChild(div);

        var inp = document.getElementById("chatInput");
        if(inp) {
            inp.addEventListener("keydown", function(e) {
                if (e.key === "Enter") window.sendChatMessage();
            });
        }
    }
})();