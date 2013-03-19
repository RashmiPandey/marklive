window.onload = function() {
    var socket = io.connect();
    socket.on('connect', function() {
    });

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/textmate");
    editor.getSession().setMode("ace/mode/markdown");
    var Range = ace.require('ace/range').Range;

    setTimeout(function() {
        var range = new Range(0, 11, 0, 12);
        marker = editor.getSession().addMarker(range, "ace_bracket", function(html, range, left, top, config) {
            html.push('<div class="cool" style="left:' + left + 'px;top:' + top + 'px;height:11px;width:2px"></div>');
            html.push('<div class="cool cool_header" style="left:' + left + 'px;top:' + top + 'px;"></div>');
        });
    }, 1000);

    setTimeout(function() {
        editor.getSession().getMarkers()[marker].range = new Range(0, 2, 0, 4);
        editor.updateSelectionMarkers();

    }, 2000);
}