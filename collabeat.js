(function () {

  "use strict";

  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
  })();

  // UI functions.
  var grid_pars = {
    "ncells": 8,
    "nvoices": 4,
    "cell_width": 50,
    "cell_height": 50
  };

  function cell_id (row, col) {
    return "cell-" + row + "-" + col;
  }

  function handle_click () {
    var $el = $(this),
        row = $el.attr("data-row"),
        col = $el.attr("data-col"),
        state = $el.attr("data-state");
    if (state == "off") updateNote(row, col, true);
    else if (state == "on") updateNote(row, col, false);
    else console.log("fail");
  }

  function setupUI (el) {
    var $el = $(el);
    for (var i = 0; i < grid_pars.nvoices; ++i) {
      var $row = $("<div class='row'>");
      for (var j = 0; j < grid_pars.ncells; ++j) {
        var $cell = $("<div class='cell'>");
        $cell.css("width", grid_pars.cell_width)
             .css("height", grid_pars.cell_height)
             .attr("data-row", i)
             .attr("data-col", j)
             .attr("data-state", "off")
             .attr("id", cell_id(i, j))
             .on("click", handle_click);
        $row.append($cell);
      }
      $el.append($row);
    }
    $el.css("width", grid_pars.ncells * (grid_pars.cell_width + 1) + 1)
       .css("height", grid_pars.nvoices * (grid_pars.cell_height + 1) + 1);
  }

  function updateNoteUI(row, cell, state) {
    var $el = $("#" + cell_id(row, cell));
    if (state) $el.attr("data-state", "on").addClass("active");
    else $el.attr("data-state", "off").removeClass("active");
  }

  // Initialize the state.
  var current_state = new Array(grid_pars.nvoices),
      current_voice = -1,
      current_cell = 0,
      note_count = 0;
  for (var i = 0; i < grid_pars.nvoices; ++i) {
    current_state[i] = new Array(grid_pars.ncells);
    for (var j = 0; j < grid_pars.ncells; ++j) current_state[i][j] = false;
  }

  // Function for updating the state of a specific note.
  function updateNote (row, col, new_state) {
    if (!current_state[row][col] && new_state) note_count += 1;
    else if (current_state[row][col] && !new_state) note_count -= 1;
    current_state[row][col] = new_state;
    updateNoteUI(row, col, new_state);
  }

  // Audio functions.
  var start_time = 0,
      note_time = 0,
      seconds_per_cell = 0.5 * 60.0 / 120.0;

  // Advance the counter to the next note.
  function nextNote () {
    current_cell++;
    if (current_cell >= grid_pars.ncells) current_cell = 0;
    note_time += seconds_per_cell;
  }

  // Schedule the sounds at the current cell.
  var lookahead = 0.2,
      timeout;
  function schedule () {
    var current_time = context.currentTime - start_time;
    while (note_time < current_time + lookahead) {
      for (var i = 0, l = grid_pars.nvoices; i < l; ++i) {
        if (current_state[i][current_cell]) {
          playNote(buffers[i], note_time);
        }
      }
      nextNote();
    }
    timeout = setTimeout("schedule()", 0);
  }
  window.schedule = schedule;

  function playNote (buffer, time) {
    var voice = context.createBufferSource();
    voice.buffer = buffer;
    voice.connect(context.destination);
    voice.start(time);
  }

  // Load the samples.
  var buffer_urls = [
        "samples/beep-mid.wav",
        "samples/hat.wav",
        "samples/snare.wav",
        "samples/kick.wav"
      ],
      buffers = new Array(buffer_urls.length),
      context,
      output_node,
      compressor,
      fader;
  function setupAudio () {
    context = new AudioContext();

    compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);

    output_node = fader = context.createGain();
    fader.gain.value = 0.7;
    fader.connect(compressor);

    for (var i in buffer_urls) {
      var url = buffer_urls[i];
      console.log("Loading: " + url);
      loadSample(url, i);
    }
  }

  function loadSample (url, index) {
    // Send the AJAX request.
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
      context.decodeAudioData(
        request.response,
        function (buffer) { buffers[index] = buffer; },
        function(buffer) {
          console.log("Error decoding drum samples!");
        }
      );
    }
    request.send();
  }

  // Start looping.
  function start () {
    note_time = 0.0;
    start_time = context.currentTime + 0.005;
    schedule();
  }

  function stop () {
    clearTimeout(timeout);
  }

  window.start = start;
  window.stop = stop;

  // Expose the setup function to the common namespace.
  window.setupBeat = function () {
    setupAudio();
    setupUI("#grid");
  };

})();

$(setupBeat);
