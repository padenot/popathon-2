/**
 * pancarte.js, dynamic overlay creation and playback on <video>
 */

function PancartePlayer(timecode, video, callback) {
  this.callback = callback;
  this.timecode = timecode;
  this.video = video;
  this.holder = putOverlayOnVideo(video);
  document.body.appendChild(this.holder);
  this.r = Raphael(this.holder, this.holder.style.width, this.holder.style.height);
}

PancartePlayer.prototype.tick = function() {
  if (this.video.currentTime > 6) {
    this.video.currentTime = 0;
  }
  if (this.video.paused) {
    return;
  }
  var prev = 0;

  // find the closest time
  for (var time in this.timecode) {
    if (this.video.currentTime < time) {
      break;
    }
    prev = time;
  }
  this.clear();
  this.display(this.timecode[prev]);
  requestAnimationFrame(this.tick.bind(this));
}

PancartePlayer.prototype.play = function() {
  var _this = this;
  this.video.addEventListener("playing", function() {
    _this.tick();
    requestAnimationFrame(_this.tick.bind(_this));
  });
  this.video.play();
  this.video.playbackRate = 0.5;
}

PancartePlayer.prototype.clear = function() {
  this.r.clear();
}

PancartePlayer.prototype.display = function(path) {
  var str = path2string(path);
  this.r.path(str).attr({stroke: "rgba(255, 255, 255, 0.3)", fill: "rgba(255, 255, 255, 0.1)"}).click(this.callback);
}

PancartePlayer.prototype.pause = function() {
  this.video.pause();
}

function putOverlayOnVideo(v) {
  var holder = document.createElement("div");
  holder.style.position = "absolute";
  var rect = v.getBoundingClientRect();
  // overlay
  holder.style.top = rect.top + "px";
  holder.style.left = rect.left + "px";
  holder.style.width = rect.width + "px";
  holder.style.height = rect.height + "px";
  // holder.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
  return holder;
}

function PancarteRecorder(outelement, video, videofps) {
  this.outelement = outelement;
  this.video = video;
  this.outelement.value = "var points = {";
  this.videoFps = videofps;
  this.points = {};
  this.startFrame();
  this.rect = video.getBoundingClientRect();
  this.holder = putOverlayOnVideo(video);

  var rect = video.getBoundingClientRect();

  document.body.appendChild(this.holder);
  this.r = Raphael(this.holder, this.holder.style.width, this.holder.style.height);
  this.path = this.r.set();
  var _this = this;

  this.holder.addEventListener("click", function(e) {
    _this.addPoint(e.layerX, e.layerY);
  });

  // drag/drop
  var dragstate = {
    down: {x: 0, y: 0},
    up: {x: 0, y: 0},
    dragging: false
  };
  function quadFromOrigin(a, b) {
    return [
      {x: a.x, y: a.y},
      {x: b.x, y: a.y},
      {x: b.x, y: b.y},
      {x: a.x, y: b.y}
    ];
  }

  this.holder.addEventListener("mousedown", function(e) {
    dragstate.dragging = true;
    dragstate.down = {x: e.layerX, y: e.layerY};
  });

  this.holder.addEventListener("mouseup", function(e) {
    dragstate.up = {x: e.layerX, y: e.layerY};
    _this.addQuad(quadFromOrigin(dragstate.down, dragstate.up));
    dragstate.dragging = false;
  });

  this.holder.addEventListener("mousemove", function(e) {
      if (!dragstate.dragging) {
        return;
      }
      _this.r.clear();
      var str = path2string(quadFromOrigin(dragstate.down, {x: e.layerX, y: e.layerY}));
      _this.r.path(str).attr({stroke: "rgba(0, 0, 0, 0.5)", fill: "rgba(0, 0, 0, 0.3)"});
  });

  // progress
  this.progress = document.createElement("input");
  this.progress.type = "range";
  this.progress.style.position = "absolute";
  this.progress.style.top = rect.bottom + 1 + "px";
  this.progress.style.left = rect.left + "px";
  this.progress.style.width = this.rect.width + "px";
  this.progress.style.height= "10px";
  this.progress.min = 0;
  this.progress.max = this.video.duration;
  this.progress.step = 0.01;
  this.progress.value = 0;
  document.body.appendChild(this.progress);

  window.addEventListener("keypress", function(e) {
    // letter 'n' for next
    if (e.key == 'n' || e.keyCode == 110) {
      _this.nextFrame();
    }
  });
}

PancarteRecorder.prototype.nextFrame = function() {
  this.endFrame();
  this.video.currentTime += 1 / this.videoFps;
  this.progress.value = this.video.currentTime;
}

PancarteRecorder.prototype.resetCurrent = function() {
  this.points[this.currentTime] = [];
}

PancarteRecorder.prototype.startFrame = function() {
  console.log("startFrame");
}

PancarteRecorder.prototype.addPoint = function(x, y) {
  if (this.points[this.video.currentTime] == undefined) {
    this.points[this.video.currentTime] = [];
  }
  this.points[this.video.currentTime].push({x: x, y: y});
  if (this.points[this.video.currentTime].length > 2) {
    this.r.clear();
    var str = path2string(this.points[this.video.currentTime]);
    this.r.path(str).attr({stroke: "rgba(0, 0, 0, 0.3)", fill: "rgba(0, 0, 0, 0.1)"});
  }
}

PancarteRecorder.prototype.addQuad = function(quad) {
  this.points[this.video.currentTime] = quad;
  var str = path2string(quad);
  this.r.clear();
  this.r.path(str).attr({stroke: "rgba(0, 0, 0, 0.5)", fill: "rgba(0, 0, 0, 0.3)"});
  this.nextFrame();
}

function path2string(path) {
  var str = "M";
  str += path[0].x + "," + path[0].y + "L";
  for(var i = 0; i < path.length; i++) {
    str += Math.floor(path[i].x) + "," + Math.floor(path[i].y) + " ";
  }
  str += "Z";
  return str;
}

PancarteRecorder.prototype.endFrame = function() {
  var path = this.points[this.video.currentTime];
  // keep the last point
  if (!path) {
    this.points[this.video.currentTime] = this.points[this.video.currentTime - 1 / this.video.fps];
  }
  this.outelement.value = JSON.stringify(this.points);
}
