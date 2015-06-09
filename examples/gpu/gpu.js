/*global GLEffect, FileReader */
/*jslint vars: true, nomen: true, browser: true, plusplus: true */
/*exported init */

'use strict';


// Global variables
var IMAGE, VIDEO, IS_VIDEO;
var TIMER;
var FILTERS;
var CLICKED;

// Shortcut for 'getElementById'
function $(str) {
    return window.document.getElementById(str);
}

// Create and run the GLEffect
function runEffects() {
    var start = new Date().getTime();
    var input = IS_VIDEO ? VIDEO : IMAGE;
    if (!input) {
        return;
    }
    var image = new GLEffect.Image();
    image.load(input);
    var k;
    for (k = 0; k < FILTERS.length; k++) {
        if (!FILTERS[k].ui_disabled) {
            image = FILTERS[k].run(image, FILTERS[k].ui_opts);
        }
    }
    image.toCanvas($('outputCanvas'));
    var end = new Date().getTime();
    $('outputStatus').value = 'Run in ' + (end - start) + 'ms';  // Load image + apply filters + export
}


/********** DATA LOADING FUNCTIONS **********/

// Reset input to 1x1 pixel
function resetInputImages() {
    var image = $('inputImage');
    image.width = '1px';
    image.height = '1px';
    var video = $('inputVideo');
    video.width = '1px';
    video.height = '1px';
}

// Callback function: process a frame of the VIDEO
function processVideoFrame() {
    runEffects();
    if (VIDEO.paused && TIMER) {
        clearInterval(TIMER);
        TIMER = null;
    }
}

// Callback function: load the image
function loadImageFromUrl() {
    var im = new Image();
    im.onload = function () {
        resetInputImages();
        IS_VIDEO = false;
        IMAGE = im;
        var img = $('inputImage');
        img.width = im.width;
        img.height = im.height;
        img.src = im.src;
        // MATRIX = Matrix.imread(image).im2double();
        runEffects();
    };
    im.src = this;
}

// Callback function: load the video
function loadVideoFromUrl() {
    var video = $('inputVideo');
    video.src = this;
    var runEffectLoop = function () {
        if (!TIMER) {
            TIMER = setInterval(processVideoFrame, 1);
        }
    };
    video.onloadedmetadata = function () {
        resetInputImages();
        video.width = video.videoWidth;
        video.height = video.videoHeight;
    };
    video.oncanplaythrough = function () {
        VIDEO = video;
        IS_VIDEO = true;
        video.ontimeupdate = runEffectLoop;
        runEffectLoop();
    };
    video.load();
}

// Callback function: handle the selected file
function fileSelectionCallback() {
    if (this.files.length) {
        var file = this.files[0];
        var type = file.type.match(new RegExp('^[^/]*'))[0];
        var callbackList = {'image': loadImageFromUrl, 'video': loadVideoFromUrl};
        var callback = callbackList[type];
        if (!callback) {
            throw new Error('Unknown file type, must be an image or video');
        }
        var reader = new FileReader();
        reader.onerror = function () {
            throw new Error('Cannot load the selected file');
        };
        reader.onload = function () {
            callback.call(reader.result);
        };
        reader.readAsDataURL(file);
    }
}

// Allow this element to be dropped on
function makeDropArea(elmt) {
    var minHeight = '200px';
    elmt.ondrop = function (evt) {
        evt.preventDefault();
        fileSelectionCallback.call(evt.dataTransfer);
    };
    elmt.ondragover = function (evt) {
        elmt.style.border = '2px dotted black';
        elmt.style.minHeight = minHeight;
        evt.preventDefault();
        evt.stopPropagation();
    };
    document.ondragover = function () {
        elmt.style.border = '2px dotted lightgray';
        elmt.style.minHeight = minHeight;
    };
    document.ondrop = function() {
        elmt.style.border = '';
        elmt.style.minHeight = '';
    };
}

// Allow TAB to insert spaces
function configureTabKey(elmt, spaces) {
    var tab = '\t';
    if (spaces) {
        tab = new Array(spaces + 1).join(' ');
    }
    elmt.onkeydown = function (evt) {
        if (evt.keyCode === 9) {
            var index = this.selectionStart;
            var txt = elmt.value;
            elmt.value = txt.substr(0, index) + tab + txt.substr(elmt.selectionEnd);
            elmt.selectionStart = elmt.selectionEnd = index + tab.length;
            evt.preventDefault();
        }
    };
}


/********** UI FUNCTIONS **********/

// Remove all the children of a node
function removeAllChildren(elmt) {
    while (elmt.lastChild) {
        elmt.removeChild(elmt.lastChild);
    }
}

// Get the selected filter, or null if no selection
function getSelectedFilter() {
    var filter = $('filterList');
    var id = filter.selectedIndex;
    return (id < 0) ? null : FILTERS[filter.options[id].value];
}

// Remove the spaces at the end of a line
function removeTrailingSpaces(str) {
    var lines = (str + '\n').split(/[ \t\r]*\n/);
    do {
        lines.pop();
    } while (lines.length && !lines[lines.length - 1].length);
    return lines.join('\n');
}

// Refresh the list of filters
function refreshFilterList() {
    $('filterDetails').style.display = 'none';
    var filtersList = $('filterList');
    var paramList = $('paramList');
    removeAllChildren(filtersList);
    removeAllChildren(paramList);
    var n, filter, name, group, opt, params;
    for (n = 0; n < FILTERS.length; n++) {
        filter = FILTERS[n];
        name = filter.ui_name || 'Default';
        // filters list
        opt = document.createElement('option');
        opt.appendChild(document.createTextNode(name));
        opt.value = n;
        filtersList.appendChild(opt);
        // parameters list
        $('paramValue').value = '';
        params = filter.getParametersList();
        if (params.length) {
            group = document.createElement('optgroup');
            group.label = name;
            group.id = 'filter-no-' + n;
            params.reverse();
            while (params.length) {
                opt = document.createElement('option');
                opt.appendChild(document.createTextNode(params.pop()));
                group.appendChild(opt);
            }
            paramList.appendChild(group);
        }
    }
}

// Enable / disable the selected filter
function toggleSelectedFilter(checkbox) {
    var filter = getSelectedFilter();
    if (!filter) {
        return;
    }
    filter.ui_disabled = !checkbox.checked;
    runEffects();
}

// Compile the selected filter
function compileSelectedFilter() {
    var filter = null;
    try {
        filter = new GLEffect($('shaderCode').value);
    } catch (e) {
        window.alert('Compilation failed---see console for more details');
        throw e;
    }
    var opts = null;
    try {
        opts = JSON.parse($('shaderOpts').value || '{}');
    } catch (e) {
        window.alert('Cannot parse options, they are ignored.\n' + e.toString());
        opts = {};
    }
    filter.ui_name = $('shaderName').value;
    filter.ui_opts = opts;
    var id = $('filterList').selectedIndex;
    if (id < 0) {
        FILTERS.push(filter);
    } else {
        FILTERS[id] = filter;
    }
    refreshFilterList();
    runEffects();
}

// Add a new filter in the list
function appendNewFilter() {
    var filter = new GLEffect();
    FILTERS = FILTERS || [];
    FILTERS.push(filter);
    refreshFilterList();
}

// Delete the selected filter
function deleteSelectedFilter() {
    var n =  $('filterList').selectedIndex;
    if (n >= 0) {
        FILTERS.splice(n, 1);
        refreshFilterList();
    }
}

// Display or hide the filter informations
function expandSelectedFilter(doView) {
    var filter = getSelectedFilter();
    if (doView && filter) {
        // View
        $('filterDetails').style.display = '';
        $('shaderName').value = filter.ui_name || 'Default';
        $('shaderOpts').value = JSON.stringify(filter.ui_opts || {});
        $('shaderCode').value = removeTrailingSpaces(filter.sourceCode);
        $('shaderEnabled').checked = !filter.ui_disabled;
    } else {
        // Hide
        $('filterDetails').style.display = 'none';
        var k, opts = $('filterList').options;
        for (k = 0; k < opts.length; k++) {
            opts[k].selected = false;
        }
    }
}

// Get the selected parameter and its filter index, or null if no selected
function getSelectedParameter() {
    // return {'name': str, 'filterIndex': n}
    var list = $('paramList');
    var index = list.selectedIndex;
    if (index < 0) {
        return null;
    }
    var opt = list.options[index];
    var n = opt.parentElement.id.match(/\d+$/)[0];
    return {'name': opt.value, 'filterIndex': n};
}

// Display the value of the selected parameter
function displaySelectedParam() {
    var param = getSelectedParameter();
    if (param) {
        var value = FILTERS[param.filterIndex].parameters[param.name];
        var str = (value !== undefined) ? JSON.stringify(value) : '';
        $('paramValue').value = str;
    }
}

// Set the selected parameter
function updateSelectedParam() {
    var param = getSelectedParameter();
    if (!param) {
        return;
    }
    var list = $('paramList');
    var index = list.selectedIndex;
    var data = $('paramValue');
    var value;
    try {
        value = eval(data.value);
    } catch (e) {
        window.alert('Invalid parameter value');
        return;
    }
    FILTERS[param.filterIndex].setParameter(param.name, value);
    refreshFilterList();
    list.selectedIndex = index;
    data.focus();
    displaySelectedParam();
    runEffects();
}

// Handle event on 'updateParam' field
function ifEnterPressed(evt, callback) {
    if (evt.keyCode === 13) {
        callback();
    }
}


/********** INITIALIZATION **********/

// Initialize the demo
function init() {
    configureTabKey($('shaderCode'), 4);
    makeDropArea($('dropZone'));
    $('inputFile').onchange = fileSelectionCallback;
    document.ondblclick = function (evt) {
        CLICKED = evt.target;
        console.log(CLICKED);
    };
    appendNewFilter();
}
