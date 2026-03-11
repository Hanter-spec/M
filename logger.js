(function() {
    var logs = [];
    var startTime = Date.now();

    // Универсальная функция записи
    function record(category, message) {
        var elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        var entry = "[" + elapsed + "s] [" + category + "] " + message;
        logs.push(entry);
        if (logs.length > 2000) logs.shift(); // Ограничение памяти
    }

    // 1. ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ (Самое важное)
    window.onerror = function(m, s, l, c, e) {
        record("CRITICAL_ERROR", m + " (" + s + ":" + l + ")");
        return false;
    };
    window.onunhandledrejection = function(e) {
        record("PROMISE_ERROR", e.reason);
    };

    // 2. КОНСОЛЬ (Все сообщения от игры)
    var methods = ['log', 'warn', 'error', 'info', 'debug'];
    methods.forEach(function(m) {
        var original = console[m];
        console[m] = function() {
            var args = Array.prototype.slice.call(arguments);
            var msg = args.map(function(a) {
                try { return (typeof a === 'object') ? JSON.stringify(a) : String(a); }
                catch(e) { return "[Complex Object]"; }
            }).join(' ');
            record(m.toUpperCase(), msg);
            original.apply(console, arguments);
        };
    });

    // 3. СЕТЬ (Загрузка data.js, текстур, конфигов)
    var oldOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        record("NETWORK", method + " -> " + url);
        return oldOpen.apply(this, arguments);
    };

    // 4. ТАЧ-СОБЫТИЯ (Куда вы нажимаете)
    window.addEventListener('touchstart', function(e) {
        var touch = e.touches[0];
        var target = e.target;
        record("TOUCH", "X:" + Math.round(touch.clientX) + " Y:" + Math.round(touch.clientY) + " Element:" + target.tagName + (target.id ? "#"+target.id : ""));
    }, {passive: true});

    // 5. ЖИЗНЕННЫЙ ЦИКЛ (Загрузка скриптов)
    window.addEventListener('load', function() { record("SYSTEM", "Window loaded"); });
    document.addEventListener('DOMContentLoaded', function() { record("SYSTEM", "DOM Ready"); });

    // ИНТЕРФЕЙС
    function createUI() {
        var btn = document.createElement('div');
        btn.innerHTML = "DEBUG";
        Object.assign(btn.style, {
            position: 'fixed', top: '40%', right: '0',
            width: '45px', height: '30px', background: 'rgba(0,0,0,0.6)',
            color: '#0f0', fontSize: '10px', textAlign: 'center',
            lineHeight: '30px', zIndex: '999999', borderRadius: '5px 0 0 5px',
            border: '1px solid #0f0', borderRight: 'none'
        });

        var panel = document.createElement('div');
        Object.assign(panel.style, {
            display: 'none', position: 'fixed', top: '0', left: '0',
            width: '100%', height: '100%', background: '#111',
            color: '#0f0', zIndex: '1000000', padding: '10px',
            boxSizing: 'border-box', overflowY: 'auto', fontFamily: 'monospace'
        });

        var controls = document.createElement('div');
        controls.style.marginBottom = "10px";

        var closeBtn = createBtn("ЗАКРЫТЬ", "#f00");
        closeBtn.onclick = function() { panel.style.display = 'none'; };

        var copyBtn = createBtn("КОПИРОВАТЬ ТЕКСТ", "#0af");
        copyBtn.onclick = function() {
            var area = document.createElement('textarea');
            area.value = logs.join('\n');
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            document.body.removeChild(area);
            alert("Скопировано!");
        };

        var saveBtn = createBtn("СКАЧАТЬ .TXT", "#f80");
        saveBtn.onclick = function() {
            var blob = new Blob([logs.join('\n')], {type: 'text/plain'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "game_logs.txt";
            a.click();
        };

        var content = document.createElement('div');
        content.style.fontSize = "9px";
        content.style.whiteSpace = "pre-wrap";

        btn.onclick = function() {
            content.innerText = logs.join('\n');
            panel.style.display = 'block';
        };

        function createBtn(txt, clr) {
            var b = document.createElement('button');
            b.innerText = txt;
            b.style.cssText = "margin:2px; background:#222; color:"+clr+"; border:1px solid "+clr+"; padding:5px;";
            return b;
        }

        controls.appendChild(closeBtn);
        controls.appendChild(copyBtn);
        controls.appendChild(saveBtn);
        panel.appendChild(controls);
        panel.appendChild(content);
        document.body.appendChild(btn);
        document.body.appendChild(panel);
    }

    if (document.readyState === 'complete') createUI();
    else window.addEventListener('load', createUI);

    record("SYSTEM", "Logger started. Waiting for game...");
})();