(function() {
    var currentZOOM = 1.0;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 5.2;
    const STEP = 0.1;

    window.applyGameZoom = function(delta) {
        var rt = window.runtSCRIPT;
        if (!rt && typeof cr_getC2Runtime !== "undefined") rt = cr_getC2Runtime();
        
        if (!rt) {
            return;
        }

        currentZOOM += delta;
        if (currentZOOM < MIN_ZOOM) currentZOOM = MIN_ZOOM;
        if (currentZOOM > MAX_ZOOM) currentZOOM = MAX_ZOOM;

        try {
            if (rt.wj && rt.wj.autozoom) {
                rt.wj.autozoom.ci = false;
            }

            if (rt.Fs && rt.Fs.Map && rt.Fs.Map.ua) {
                var layers = rt.Fs.Map.ua;
                
                for (var i = 0; i < 51; i++) {
                    if (layers[i]) layers[i].scale = currentZOOM;
                }
                
                if (layers[61]) layers[61].scale = currentZOOM;
                
                rt.redraw = true;
            }
        } catch(err) {
            console.error(err);
        }
    };

    function createZoomButtons() {
        if (document.getElementById('custom-zoom-ui')) return;

        const ui = document.createElement("div");
        ui.id = 'custom-zoom-ui';
        ui.style = "position:fixed; top:30%; left:5px; transform:translateY(-50%); z-index:999999; display:flex; flex-direction:column; gap:20px; pointer-events:none;";
        
        const btnStyle = "width:25px; height:25px; cursor:pointer; pointer-events:auto; background:transparent; border:none; display:flex; align-items:center; justify-content:center; transition: transform 0.1s;";
        
        ui.innerHTML = 
            `<div id="zoom-in-btn" style="${btnStyle}">
                <img src="images/zoom_in-sheet0.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.innerText='+'">
            </div>
            <div id="zoom-out-btn" style="${btnStyle}">
                <img src="images/zoom_out-sheet0.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.innerText='-'">
            </div>`;
        document.body.appendChild(ui);

        var zoomInterval = null;
        const HOLD_SPEED = 50;

        function startZoom(delta) {
            window.applyGameZoom(delta);
            zoomInterval = setInterval(function() {
                window.applyGameZoom(delta);
            }, HOLD_SPEED);
        }

        function stopZoom() {
            if (zoomInterval) {
                clearInterval(zoomInterval);
                zoomInterval = null;
            }
        }

        var btnIn = document.getElementById('zoom-in-btn');
        btnIn.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.9)';
            startZoom(STEP);
        });
        btnIn.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
            stopZoom();
        });
        btnIn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            stopZoom();
        });

        var btnOut = document.getElementById('zoom-out-btn');
        btnOut.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.9)';
            startZoom(-STEP);
        });
        btnOut.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
            stopZoom();
        });
        btnOut.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            stopZoom();
        });

        btnIn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.9)';
            startZoom(STEP);
        });
        btnIn.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            stopZoom();
        });

        btnOut.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.9)';
            startZoom(-STEP);
        });
        btnOut.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            stopZoom();
        });
    }

    if (document.readyState === "complete") createZoomButtons();
    else window.addEventListener("load", createZoomButtons);
})();