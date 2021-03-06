/*global document console CIE Plot Tools open Matrix Colorspaces */
var CS = Matrix.CIE;
var diagram = "xyY";

var addScatter = false;
var imgOrig;
var imgCurrent;
var MAX_SIZE = 1200;
var imagePlot;

var colorsName = [
    "red", "lime", "blue", "yellow",
    "fuchsia", "aqua", "olive", "purple",
    "teal", "maroon", "green", "navy",
    "black", "gray", "sylver"
];
/*
(function (oldConsole) {
    "use strict";
    window.console = {
        log: function() {
            
            $("log").innerHTML += Array.prototype.join.call(arguments, ' ') + "<br>";
            var d = $('log');
            if(d.scrollHeight > d.clientHeight) {
                d.scrollTop = d.scrollHeight - d.clientHeight;
            }
        }, 
        warn: function(txt) {
            oldConsole.warn(txt);
        }, 
        profile: function() {
            oldConsole.profile();
        }, 
        profileEnd: function() {
            oldConsole.profileEnd();
        }
    };
})(console);
 */
function displayImage(im) {
    'use strict';
    imagePlot.displayImage(im, 0);
}

function setImage(im) {
    'use strict';
    if (im) {
        imgCurrent = im;
    }
    displayImage(imgCurrent);
}

function illuminantToCCT(input) {
    'use strict';
    var CCT;
    try {
        if (typeof input === 'string') {
            CCT = Matrix.CIE.getIlluminant(input);
            CCT = Matrix.CIE['xyY to CCT'](input);
        } else if (input === 'number') {
            CCT = input;
        } else if (Tools.isArrayLike(input)) {
            CCT = Matrix.CIE['xyY to CCT'](input);
        }
    } catch (x) {
    }
    return CCT;
}

function getWhiteRefRGB() {
    'use strict';
    var chr = [$F('ewChr1'), $F('ewChr2'), 1];
    if (diagram !== 'xyY') {
        chr = Matrix.Colorspaces[diagram + ' to xyY'](chr);
    }
    chr = Matrix.Colorspaces['xyY to XYZ'](chr);
    chr = Matrix.Colorspaces['XYZ to LinearRGB'](chr);
    return chr;
}

function getActualWhiteRGB() {
    'use strict';
    var chr = [$F('awChr1'), $F('awChr2'), 1];
    if (diagram !== 'xyY') {
        chr = Matrix.Colorspaces[diagram + ' to xyY'](chr);
    }
    chr = Matrix.Colorspaces['xyY to XYZ'](chr);
    chr = Matrix.Colorspaces['XYZ to LinearRGB'](chr);
    return chr;
}

function updateError() {
    'use strict';
    var errorElmt = $('angularError');
    var err = angularError(getWhiteRefRGB(), getActualWhiteRGB()) || 0;
    errorElmt.value = err.toFixed(2) + "°";
}

function setChromaticity(chr1, chr2, id) {
    'use strict';
    id = id || "ewChr";
    $(id + '1').value = chr1.toFixed(4);
    $(id + '2').value = chr2.toFixed(4);
    updateError();
}

function changeIlluminant(input) {
    'use strict';
    var outputStdIll = $V('outputStdIll');
    displayImage(correctImage(imgCurrent, input, outputStdIll));

    var cDiagram = $('chromaticityDiagram').getPlot();

    if (diagram !== 'xyY') {
        input = Matrix.Colorspaces['xyY to ' + diagram](input.slice());
    }
    cDiagram.setCursor(input[0], input[1]);
    setChromaticity(input[0], input[1], "awChr");
}

function reset() {
    'use strict';
    setImage(imgOrig.getCopy());
}

function exportImage() {
    'use strict';
    var canvas = document.createElement('canvas');
    imgCurrent.imshow(canvas);
    open(canvas.toDataURL());
}

function plotScatter(x1, y1, x2, y2) {
    'use strict';
    var min = Math.min, max = Math.max, round = Math.round;
    var Y1 = round(max(min(y1, y2), 0));
    var Y2 = round(min(max(y1, y2), imgCurrent.getSize(0) - 1));
    var X1 = round(max(min(x1, x2), 0));
    var X2 = round(min(max(x2, x2), imgCurrent.getSize(1) - 1));
    var subIm = imgCurrent.get([Y1, Y2], [X1, X2]);
    var points = [
        subIm.get([], [], 0).getData(),
        subIm.get([], [], 1).getData(),
        subIm.get([], [], 2).getData()
    ];

    var p = $('chromaticityDiagram').getPlot();
    if (!addScatter) {
        while (p.remove('scatter')) {
	    // Do nothing
        }
    }
    p.addChromaticitiesFromRgb(points[0], points[1], points[2], {}, diagram);
}

function callback(image) {
    'use strict';
    image = limitImageSize(image, MAX_SIZE);
    imgOrig = image.im2double();
    imgCurrent = image.im2double();
    
    $('outputStdIll').selectedIndex = 5; // D65
    imagePlot.displayImage(image, 0);
}

var selectAction = function () {
    var action = $V('selectAction');
    if (action === "scatter") {
        imagePlot.selectarea = plotScatter;
    } else if (action === "wp") { 
        imagePlot.selectArea = estimateWhiteRef;
    } else if (action === "chart") {
        imagePlot.selectArea = removeWhiteChart;
    }
};

var removeWhiteChart = function (start, end) {
    'use strict';
    var x1 = start[0], y1 = start[1], x2 = end[0], y2 = end[1];
    var m = Math.min, M = Math.max, r = Math.round;
    var Y1 = r(M(m(y1, y2), 0));
    var Y2 = r(m(M(y1, y2), imgCurrent.getSize(0) - 1));
    var X1 = r(M(m(x1, x2), 0));
    var X2 = r(m(M(x2, x2), imgCurrent.getSize(1) - 1));
    imgCurrent.set([Y1, Y2], [X1, X2], 0);
    setImage();
};

var estimateWhiteRef = function (start, end) {
    'use strict';
    var x1 = start[0], y1 = start[1], x2 = end[0], y2 = end[1];
    var m = Math.min, M = Math.max, r = Math.round;
    y1 = M(m(y1, y2), 0);
    y2 = m(M(y1, y2), imgCurrent.getSize(0) - 1);
    x1 = M(m(x1, x2), 0);
    x2 = m(M(x2, x2), imgCurrent.getSize(1) - 1);
    var wp = imgCurrent.get([y1, y2], [x1, x2]);
    wp = wp.reshape([wp.size(0) * wp.size(1), wp.size(2)]).mean(0);
    var xyY = Matrix.Colorspaces['RGB to xyY'](wp.getData());
    xyY[2] = 1;    
    setChromaticity(xyY[0], xyY[1], "ewChr");
    plotScatter(x1, y1, x2, y2);
};

function plotIsoCCTLines(p, diagram, t, dist) {
    "use strict";
    var i, color = "gray";
    var u1 = [], u2 = [], v1 = [], v2 = [];
    for (i = 0; i < t.length; i++) {
        var l = Matrix.CIE.getIsoCCTLine(t[i], dist, diagram);
        p.addPath(l.x, l.y, {"id": "CCT" + i, stroke: color, "stroke-width": 0.5});
        u1.push(l.x[0]);
        u2.unshift(l.x[1]);
        v1.push(l.y[0]);
        v2.unshift(l.y[1]);
    }
    var u = u1.concat(u2), v = v1.concat(v2);
    u.push(u[0]);
    v.push(v[0]);
    p.addPath(u, v, {"id": "CCT", stroke: color, "stroke-width": 0.5});
}
function removeIsoCCTLines(p) {
    var p = $('chromaticityDiagram').getPlot();
    var ids = p.getCurvesIds();
    
    for (var i in ids) {
        if (ids[i].substr(0, 3) === "CCT") {
            p.remove(ids[i]);
        }
    }
};

var computeEstimations = function (img) {
    'use strict';
    var imgLinear = Matrix.applycform(img, 'sRGB to LinearRGB');
    var estimations = {
        ppl: img.miredHistogram({
            k: $F("k"),
            delta: $F("delta"),
            bins : $F("bins"),
            s: $F("threshold")
        }),
        gw: imgLinear.colorConstancy('grey_world'),
        wp: imgLinear.colorConstancy('max_rgb'),
        sg: imgLinear.colorConstancy('shades_of_grey'),
        ge: imgLinear.colorConstancy('grey_edge')
    };
    return estimations;
};

var plotPPL = function (ppl) {
    var p = {
        k: $F("k"),
        delta: $F("delta"),
        bins : $F("bins"),
        s: $F("threshold")
    };
    var t1 = Matrix.ldivide(ppl.scale, 1e6).getData();
    var cDiagram = $('chromaticityDiagram').getPlot();
    plotIsoCCTLines(cDiagram, diagram, t1, p.delta);
    var h = $('histogram').getPlot();
    h.clear();
    h.addHistogram(ppl.scale.getData(), ppl.histogramWeighted.getData(), {'fill-opacity': 0.33});

    // Add modes
    $("modesList").innerHTML = "";
    for (var i = 1; i < ppl.modes.length; i++) {
        var c = colorsName[i - 1];
        var m = ppl.modes[i];
        h.drawMode(ppl.histogramWeighted, ppl.scale, m, c);
    }
};
var estimations;
var applyPPL = function (event) {
    'use strict';

    estimations = computeEstimations(imgCurrent);
    plotPPL(estimations.ppl);
    var log = function () {
        $("log").innerHTML += Array.prototype.join.call(arguments, ' ') + "<br>";
        var d = $('log');
        if(d.scrollHeight > d.clientHeight) {
            d.scrollTop = d.scrollHeight - d.clientHeight;
        }
    };
    $("log").innerHTML = "";
    log("ERRORS:");
    log("-------");
    $("modesList").innerHTML = "";
    for (var i = 1; i < estimations.ppl.modes.length; i++) {
        addOption("modesList", "PP" + i, "PPL mode 1 (" + colorsName[i - 1] + ")");
        log("PPL mode "+ i + ":", angularError(getWhiteRefRGB(), estimations.ppl.modes[i].RGB).toFixed(2) + '&deg');
    }
    addOption("modesList", "GW", "Grey-World");
    addOption("modesList", "WP", "Max-RGB");
    addOption("modesList", "SG", "Shades-of-grey");
    addOption("modesList", "GE", "Grey-Edge");
    var c = function (color, N, sc, sp) {
        Matrix.Colorspaces['LinearRGB to XYZ'](color, N, sc, sp);
        Matrix.Colorspaces['XYZ to xyY'](color, N, sc, sp);
        return color;
    };

    $("modesList").addEventListener("change", function () {
        var algo = this.value.substr(0, 2)
        var illuminant;
        if (algo === "PP") {
            var i = parseInt(this.value.substr(-1));
            illuminant = estimations.ppl.modes[i].illxy;
        } else if (algo === "GW") {
            illuminant = c(estimations.gw.get().getData());
        } else if (algo === "WP") {
            illuminant = c(estimations.wp.get().getData());
        } else if (algo === "SG") {
            illuminant = c(estimations.sg.get().getData());
        } else if (algo === "GE") {
            illuminant = c(estimations.ge.get().getData());
        }
        illuminant[2] = 1;
        changeIlluminant(illuminant);
    })
    changeIlluminant(estimations.ppl.modes[1].illxy);
    log("Gray-World:", angularError(getWhiteRefRGB(), estimations.gw.get().getData()).toFixed(2) + '&deg');
    log("Max-RGB:", angularError(getWhiteRefRGB(), estimations.wp.get().getData()).toFixed(2) + '&deg');
    log("SoG:", angularError(getWhiteRefRGB(), estimations.sg.get().getData()).toFixed(2) + '&deg');
    log("Grey-Edge:", angularError(getWhiteRefRGB(), estimations.ge.get().getData()).toFixed(2) + '&deg');
};


function startUI() {
    'use strict';
    $S("ui", "top", 10);
    // UI default parameters and events
    var diagramElement = $('diagram');
    diagramElement.addEventListener('click', function (event) {
        'use strict';
        diagram = this.value;
        setChromaticitydiagram();
    }, false);
    diagramElement.selectedIndex = 1; // xyY

    var outputStdIll = $('outputStdIll');
    outputStdIll.selectedIndex = 5; // D65

    var ill = Matrix.CIE.getIlluminant('current', diagram);
    setChromaticity(ill[0], ill[1], 'awChr');
    setChromaticity(ill[0], ill[1], 'ewChr');

    $("selectAction").addEventListener('change', selectAction);
    $("reset").addEventListener('click', reset);
    $("applyPPL").addEventListener("click", applyPPL);
    initInputs();

    imagePlot.selectArea = estimateWhiteRef;
    $("selectAction").getElementsByTagName("option")[0].selected = "selected";

    $("histogram").getPlot().clear();
    setChromaticitydiagram();
    $("log").innerHTML = "";
    $("modesList").innerHTML = "";
    var ill = Matrix.CIE.getIlluminant('current', diagram);
    setChromaticity(ill[0], ill[1], 'awChr');
    setChromaticity(ill[0], ill[1], 'ewChr');

    var onChange = function () {
        $V("kVal", $F("k"));
        $V("deltaVal", $F("delta"));
        $V("binsVal", $F("bins"));
        $V("thresholdVal", $F("threshold"));
    };
    onChange();
    $("k").addEventListener('change', onChange);
    $("delta").addEventListener('change', onChange);
    $("bins").addEventListener('change', onChange);
    $("threshold").addEventListener('change', onChange);
}

var setChromaticitydiagram = function () {
    var p = $("chromaticityDiagram").getPlot().clear();
    p.addChromaticityDiagram(diagram).setXLabel().setYLabel().setTitle();
    p.remove("Standards illuminants");
    p.remove("Spectrum locus");
};

var createPlots = function () {
  "use strict";  
    // Diagram Plot
    var plotProperties = {
        'ticks-display': false,
        'preserve-ratio': true,
        'legend-display': 'none'
    };
    
    var size = [$('plot1').clientWidth - 20, $('plot1').clientHeight - 20]
    var p = new Plot('chromaticityDiagram', size, 'plot1', plotProperties);
    setChromaticitydiagram();
    
    size = [$('plot2').clientWidth - 20, $('plot2').clientHeight - 20]
    var pH = new Plot('histogram', size, 'plot2', plotProperties);
    
    // Click on diagram
    p.click = function (coord) {
        var pos = [coord.x, coord.y, 1];
        if (diagram !== 'xyY') {
            pos = Matrix.Colorspaces[diagram + ' to xyY'](pos);
        }
        changeIlluminant(pos);
    };
    p.setLegend();

    // Image Plot
    imagePlot = new SuperCanvas(document.body);

    imagePlot.click =  function (coord) {
        var x = Math.round(coord[0]);
        var y = Math.round(coord[1]);
        var rgb = imgCurrent.get(y, x, [0, 2]).getData();
        console.log(rgb);
        var xyY = Matrix.Colorspaces['RGB to xyY'](rgb);
        xyY[2] = 1;
        changeIlluminant(xyY);
        if (diagram !== 'xyY') {
            xyY = Matrix.Colorspaces['xyY to ' + diagram](xyY);
        }
    };
    imagePlot.selectArea = estimateWhiteRef;
};

window.onload = function () {
    "use strict";
    initFileUpload("loadFile",function (evt) {
        Matrix.imread(this, callback);
        startUI();
    });
    createPlots();
    startUI();
    var displayHelp = initHelp();
    displayHelp();
};

Plot.prototype.drawMode = function (h, s, m, c) {
    "use strict";
    var nBin = h.numel();
    var hm = Matrix.zeros(nBin, 1);

    var a = Math.round(m.bins[0]), b = Math.round(m.bins[1]);
    var sum;
    if (b >= a) {
        sum = h.get([a, b]).sum()["./"](b - a + 1);
        hm.set([a, b], sum);
        this.addHistogram(s.getData(), hm.getData(), {fill: c, "fill-opacity": 0.33});
    } else {
        sum = h.get([a, -1]).sum();
        sum["+="](h.get([0, b]).sum());
        sum["/="](nBin - a + b + 1);
        hm.set([a, -1], sum);
        hm.set([0, b], sum);
        this.addHistogram(s.getData(), hm.getData(), {fill: c, "fill-opacity": 0.33});
    }
};

function bin2color(im, c) {
    "use strict";
    var R = im[".*"](c[0]), G = im[".*"](c[1]), B = im[".*"](c[2]);
    return R.cat(2, G, B);
}

