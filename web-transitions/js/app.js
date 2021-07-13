'use strict';

var App = (function() {

  function App(config) {
    var defaults = {
      el: 'app',
      nodes: [],
      edges: [],
      actions: [],
      bgColor: 0xe3c05f,
      nodeFillColor: 0xfce8b1,
      nodeLineColor: 0x111111,
      edgeThickness: 16,
      edgePositiveColor: 0x2d7517,
      edgeNegativeColor: 0x751717,
      edgeGap: 16,
      hoverOpacity: 0.2,
      nodeRadius: 0.06, // as a percent of min(w, h)
      animationSpeed: 2000 // in milliseconds
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  function lerpColor(hex, hexTarget, t){
    var rgb = PIXI.utils.hex2rgb(hex);
    var rgbTarget = PIXI.utils.hex2rgb(hexTarget);
    var newRGB = [1, 1, 1];
    _.each(rgb, function(c, i){
      newRGB[i] = MathUtil.lerp(c, rgbTarget[i], t);
    });
    return PIXI.utils.rgb2hex(newRGB);
  }

  App.prototype.init = function(){
    var _this = this;
    var opt = this.opt;

    this.activeAction = false;
    this.isResetting = false;

    this.loadCanvas();
    this.loadGraphics();
    this.loadActions();
    this.loadListeners();

    this.pixiApp.ticker.add((delta) => {
      _this.render(delta);
    });

  };

  App.prototype.invokeAction = function(key){
    if (!_.has(this.actions, key)) return;

    $('.action-button').prop("disabled", true);
    var $button = $('.action-button[data-action="'+key+'"]');
    $button.prop("disabled", false);
    $button.addClass("active");

    var now = Date.now();
    this.activeAction = key;
    this.actionStarted = now;
  };

  App.prototype.loadActions = function(){
    var _this = this;
    var tweenableProps = ['x', 'y', 'opacity', 'scale'];
    var nodeStates = _.map(this.nodes, function(node, i){
      var state = {
        index: node.index
      };
      _.each(tweenableProps, function(key){
        state[key] = node[key];
      });
      _this.nodes[i].startingState = _.clone(state);
      return [node.id, state];
    });
    nodeStates = _.object(nodeStates);
    this.actions = _.mapObject(this.opt.actions, function(action, key){
      var start = 0;
      action.steps = _.map(action.steps, function(step, i){
        step.start = start;
        step.end = step.start + step.duration;
        step.tweens = _.map(step.tweens, function(tween){
          tween.start = step.start;
          tween.end = tween.start + tween.duration;
          tween.valueFrom = nodeStates[tween.id][tween.prop];
          tween.nodeIndex = nodeStates[tween.id].index;
          nodeStates[tween.id][tween.prop] = tween.value;
          return tween;
        });
        start += step.duration;
        return step;
      });
      action.duration = start;
      return action;
    });
  };

  App.prototype.loadCanvas = function(){
    this.el = document.getElementById(this.opt.el);
    this.elSize = this.el.getBoundingClientRect();

    var app = new PIXI.Application({
      width: this.elSize.width,
      height: this.elSize.height,
      resizeTo: this.el,
      antialias: true,
      backgroundColor: this.opt.bgColor
    });
    this.el.appendChild(app.view);
    this.pixiApp = app;
  };

  App.prototype.loadGraphics = function(){
    var _this = this;
    var opt = this.opt;

    var app = this.pixiApp;
    var renderer = app.renderer;
    var w = renderer.width;
    var h = renderer.height;
    var nodeRadius = Math.round(Math.min(w, h) * this.opt.nodeRadius);

    var lerpAmount = 1.0 - this.opt.hoverOpacity;

    var brightenedNodeLineColor = lerpColor(opt.nodeLineColor, opt.bgColor, lerpAmount);
    var brightenedEdgePositiveColor = lerpColor(opt.edgePositiveColor, opt.bgColor, lerpAmount);
    var brightenedEdgeNegativeColor = lerpColor(opt.edgeNegativeColor, opt.bgColor, lerpAmount);

    var nodeContainer = new PIXI.Container();
    var nodes = _.map(this.opt.nodes, function(node, i){
      node.index = i;
      node.scale = 1.0;
      node.opacity = _.has(node, 'opacity') ? node.opacity : 1.0;
      node.size = node.size ? node.size : 1.0;
      node.lineColor = opt.nodeLineColor;
      node.fillColor = node.fillColor ? node.fillColor : opt.nodeFillColor;
      var brightenedNodeFillColor = lerpColor(node.fillColor, opt.bgColor, lerpAmount);
      node.baseLineColor = node.lineColor;
      node.baseFillColor = node.fillColor;
      node.hoverLineColor = brightenedNodeLineColor;
      node.hoverFillColor = brightenedNodeFillColor;
      node.graphicsX = node.x * w;
      node.graphicsY = node.y * h;
      node.graphics = new PIXI.Graphics();
      node.graphics.x = node.graphicsX;
      node.graphics.y = node.graphicsY;
      node.graphics.interactive = true;
      node.graphics.hitArea = new PIXI.Rectangle(0, 0, nodeRadius*2, nodeRadius*2);
      node.graphics.mouseout = function(e) { _this.onMouseout(); }
      node.graphics.mouseover = function(e) { _this.onMouseoverNode(i); };
      nodeContainer.addChild(node.graphics);
      return node;
    });

    var edgeContainer = new PIXI.Container();
    var edges = _.map(this.opt.edges, function(edge, i){
      var nodeFrom = _.find(nodes, function(node){ return node.id === edge.from; });
      var nodeTo = _.find(nodes, function(node){ return node.id === edge.to; });
      edge.index = i;
      edge.fromIndex = nodeFrom.index;
      edge.toIndex = nodeTo.index;
      edge.thickness = opt.edgeThickness;
      edge.opacity = 1;
      edge.color = edge.type === 'positive' ? opt.edgePositiveColor : opt.edgeNegativeColor;
      edge.baseColor = edge.color;
      edge.hoverColor = edge.type === 'positive' ? brightenedEdgePositiveColor : brightenedEdgeNegativeColor;
      edge.gap = opt.edgeGap;
      edge.triangleHeight = edge.thickness * Math.sqrt(3) / 2;
      edge.graphics = new PIXI.Graphics();
      edge.graphics.interactive = true;
      edge.graphics.hitArea = new PIXI.Rectangle(0, 0, 0, 0);
      edge.graphics.x = nodeFrom.graphicsX;
      edge.graphics.y = nodeFrom.graphicsY;
      edge.graphics.mouseover = function(e) { _this.onMouseoverEdge(i); }
      edge.graphics.mouseout = function(e) { _this.onMouseout(); }
      edgeContainer.addChild(edge.graphics);
      return edge;
    });
    this.edges = edges;

    this.nodes = _.map(nodes, function(node, i){
      node.edgesFrom = _.filter(edges, function(edge){ return edge.from === node.id; });
      node.edgesTo = _.filter(edges, function(edge){ return edge.to === node.id; });
      return node;
    });

    app.stage.addChild(edgeContainer);
    app.stage.addChild(nodeContainer);

  };

  App.prototype.loadListeners = function(){
    var _this = this;

    $('.action-button').on('click', function(e){
      var $button = $(this);
      if ($button.prop("disabled")) return;
      var actionKey = $button.attr('data-action');
      if ($button.hasClass('active')){
        _this.resetAction(actionKey);
      } else {
        _this.invokeAction(actionKey);
      }
    });
  };

  App.prototype.onMouseout = function(){
    var _this = this;

    this.nodes = _.map(this.nodes, function(node, i){
      node.fillColor = node.baseFillColor;
      node.lineColor = node.baseLineColor;
      return node;
    });

    this.edges = _.map(this.edges, function(edge, i){
      edge.color = edge.baseColor;
      return edge;
    });
  };

  App.prototype.onMouseoverEdge = function(edgeIndex){
    var _this = this;
    var opt = this.opt;

    this.nodes = _.map(this.nodes, function(node, i){
      node.fillColor = node.hoverFillColor;
      node.lineColor = node.hoverLineColor;
      return node;
    });

    this.edges = _.map(this.edges, function(edge, i){
      edge.color = i === edgeIndex ? edge.baseColor : edge.hoverColor;
      if (i === edgeIndex) {
        _this.nodes[edge.fromIndex].fillColor = _this.nodes[edge.fromIndex].baseFillColor;
        _this.nodes[edge.fromIndex].lineColor = _this.nodes[edge.fromIndex].baseLineColor;
        _this.nodes[edge.toIndex].fillColor = _this.nodes[edge.toIndex].baseFillColor;
        _this.nodes[edge.toIndex].lineColor = _this.nodes[edge.toIndex].baseLineColor;
      }
      return edge;
    });
  };

  App.prototype.onMouseoverNode = function(nodeIndex){
    var _this = this;
    var opt = this.opt;

    this.nodes = _.map(this.nodes, function(node, i){
      node.fillColor = node.hoverFillColor;
      node.lineColor = node.hoverLineColor;
      return node;
    });

    this.nodes[nodeIndex].fillColor = this.nodes[nodeIndex].baseFillColor;
    this.nodes[nodeIndex].lineColor = this.nodes[nodeIndex].baseLineColor;

    this.edges = _.map(this.edges, function(edge, i){
      edge.color = edge.fromIndex === nodeIndex || edge.toIndex === nodeIndex ? edge.baseColor : edge.hoverColor;
      var otherNodeIndex = -1;
      if (edge.fromIndex === nodeIndex) otherNodeIndex = edge.toIndex;
      else if (edge.toIndex === nodeIndex) otherNodeIndex = edge.fromIndex
      if (otherNodeIndex >= 0) {
        _this.nodes[otherNodeIndex].fillColor = _this.nodes[otherNodeIndex].baseFillColor;
        _this.nodes[otherNodeIndex].lineColor = _this.nodes[otherNodeIndex].baseLineColor;
      }
      return edge;
    });
  };

  App.prototype.render = function(delta){
    var now = Date.now();

    this.renderAction(now);
    this.renderReset(now);

    var t = (now % this.opt.animationSpeed) / this.opt.animationSpeed;

    var renderer = this.pixiApp.renderer;
    var w = renderer.width;
    var h = renderer.height;
    var nodeRadius = Math.round(Math.min(w, h) * this.opt.nodeRadius);

    // calculate node size and positions
    var nodes = _.map(this.nodes, function(node, i){
      node.graphicsX = node.x * w;
      node.graphicsY = node.y * h;
      node.radius = nodeRadius * node.size * node.scale;
      if (node.opacity < 1) {
        node.graphics.hitArea.width = 0;
        node.graphics.hitArea.height = 0;
        node.graphics.hitArea.x = 0;
        node.graphics.hitArea.y = 0;
      } else {
        node.graphics.hitArea.width = node.radius * 2;
        node.graphics.hitArea.height = node.radius * 2;
        node.graphics.hitArea.x = -node.radius;
        node.graphics.hitArea.y = -node.radius;
      }
      return node;
    });

    // draw edges
    _.each(this.edges, function(edge, i){
      var nodeFrom = nodes[edge.fromIndex];
      var nodeTo = nodes[edge.toIndex];

      if (nodeFrom.opacity < 0.1 || nodeTo.opacity < 0.1 || nodeFrom.radius <= 1 || nodeTo.radius <= 1) {
        edge.graphics.clear();
        edge.graphics.hitArea.width = 0;
        edge.graphics.hitArea.height = 0;
        return;
      }
      var distance = MathUtil.distance(nodeFrom.graphicsX, nodeFrom.graphicsY, nodeTo.graphicsX, nodeTo.graphicsY);
      var radians = MathUtil.angleBetween(nodeFrom.graphicsX, nodeFrom.graphicsY, nodeTo.graphicsX, nodeTo.graphicsY);
      var segmentWidth = edge.thickness + edge.gap;
      var segments = Math.round(distance / segmentWidth);
      var halfThickness = edge.thickness * 0.5;
      var quarterThickness = halfThickness * 0.5;

      edge.graphics.clear();
      edge.graphics.beginFill(edge.color, edge.opacity);
      _.times(segments, function(i){
        var offsetX = segmentWidth * i + t * segmentWidth;
        // draw pluses
        if (edge.type === 'positive') {
          edge.graphics.drawRect(offsetX, quarterThickness, edge.thickness, halfThickness);
          edge.graphics.drawRect(offsetX+quarterThickness, 0, halfThickness, edge.thickness);
        // draw arrows
        } else {
          var path = [
            offsetX, 0,
            offsetX, edge.thickness,
            offsetX + edge.triangleHeight, edge.thickness * 0.5
          ];
          edge.graphics.drawPolygon(path);
        }
      });
      // edge.graphics.drawRect(0, 0, distance, edge.thickness);
      edge.graphics.endFill();
      edge.graphics.x = nodeFrom.graphicsX;
      edge.graphics.y = nodeFrom.graphicsY;
      edge.graphics.hitArea.width = distance;
      edge.graphics.hitArea.height = halfThickness;
      edge.graphics.rotation = radians;
    });

    // draw nodes
    _.each(nodes, function(node, i){
      node.graphics.x = node.graphicsX;
      node.graphics.y = node.graphicsY;
      node.graphics.clear();
      if (node.opacity <= 0 || node.radius <= 0) {
        return;
      }
      node.graphics.lineStyle(2, node.lineColor, node.opacity);
      node.graphics.beginFill(node.fillColor, node.opacity);
      node.graphics.drawCircle(0, 0, node.radius);
      node.graphics.endFill();
    })

  };

  App.prototype.renderAction = function(now){
    if (this.activeAction === false) return;

    var _this = this;
    var timeSinceStart = now - this.actionStarted;
    var action = this.actions[this.activeAction];
    _.each(action.steps, function(step){
      _.each(step.tweens, function(tween){
        if (timeSinceStart > tween.start && timeSinceStart <= tween.end) {
          var t = MathUtil.norm(timeSinceStart, tween.start, tween.end);
          t = MathUtil.ease(t);
          _this.nodes[tween.nodeIndex][tween.prop] = MathUtil.lerp(tween.valueFrom, tween.value, t);
        }
      });
    });
  };

  App.prototype.renderReset = function(now){
    if (!this.isResetting) return;
    var timeSinceStart = now - this.actionStarted;
    var duration = 1000;
    var t = timeSinceStart / duration;
    if (t >= 1) {
      t = 1;
      this.isResetting = false;
      t = MathUtil.ease(t);
    }

    var _this = this;
    _.each(this.nodes, function(node, i){
      var lastState = node.lastState;
      _.each(node.startingState, function(value, key){
        _this.nodes[i][key] = MathUtil.lerp(lastState[key], value, t);
      });
    })
  };

  App.prototype.resetAction = function(key){
    if (!_.has(this.actions, key)) return;

    $('.action-button').prop("disabled", false);
    var $button = $('.action-button[data-action="'+key+'"]');
    $button.removeClass("active");

    this.nodes = _.map(this.nodes, function(node, i){
      var currentState = {};
      _.each(node.startingState, function(value, key){
        currentState[key] = node[key];
      });
      node.lastState = _.clone(currentState);
      return node;
    })

    var now = Date.now();
    this.activeAction = false;
    this.isResetting = true;
    this.actionStarted = now;
  };

  return App;

})();

var config = {
  nodes: [
    {id: 'beetle', x: 0.2, y: 0.2, label: 'Adult lady beetle'},
    {id: 'fly', x: 0.65, y: 0.1, label: 'Head-hunting phorid fly', size: 0.6},
    {id: 'larvae-wasp', x: 0.125, y: 0.5, label: 'Larvae-killer wasp', size: 0.75},
    {id: 'ant', x: 0.5, y: 0.3, label: 'Azteca ant', size: 1.2},
    {id: 'scale-wasp', x: 0.8, y: 0.33, label: 'Scale-killer wasp', size: 0.75},
    {id: 'larvae', x: 0.3, y: 0.8, label: 'Larval lady beetle'},
    {id: 'scale', x: 0.575, y: 0.55, label: 'Scale insect', size: 1.4},
    {id: 'white-fungus', x: 0.6, y: 0.875, label: 'White halo fungus'},
    {id: 'rust-fungus', x: 0.85, y: 0.8, label: 'Rust fungus'},
    {id: 'pesticide', x: 0.85, y: 0.72, label: 'Pesticide', fillColor: 0xce5f5f, size: 0.5, opacity: 0}
  ],
  edges: [
    {from: 'scale', to: 'beetle', type: 'negative'},
    {from: 'ant', to: 'fly', type: 'negative'},
    {from: 'scale', to: 'scale-wasp', type: 'negative'},
    {from: 'scale', to: 'ant', type: 'positive'},
    {from: 'beetle', to: 'larvae', type: 'positive'},
    {from: 'larvae', to: 'larvae-wasp', type: 'negative'},
    {from: 'scale', to: 'larvae', type: 'negative'},
    {from: 'scale', to: 'white-fungus', type: 'negative'},
    {from: 'rust-fungus', to: 'white-fungus', type: 'negative'},
    {from: 'scale', to: 'pesticide', type: 'negative'}
  ],
  actions: {
    pesticide: {
      steps: [
        {
          duration: 2000,
          tweens: [
            {id: 'pesticide', prop: 'opacity', value: 1, duration: 2000},
            {id: 'pesticide', prop: 'x', value: 0.75, duration: 1000},
            {id: 'pesticide', prop: 'y', value: 0.62, duration: 1000}
          ]
        },{
          duration: 4000,
          tweens: [
            {id: 'pesticide', prop: 'scale', value: 2, duration: 4000},
            {id: 'scale', prop: 'scale', value: 0, duration: 4000}
          ]
        },{
          duration: 4000,
          tweens: [
            {id: 'ant', prop: 'scale', value: 0, duration: 4000},
            {id: 'scale', prop: 'scale', value: 0, duration: 4000},
            {id: 'beetle', prop: 'scale', value: 0, duration: 4000},
            {id: 'larvae', prop: 'scale', value: 0, duration: 4000},
            {id: 'scale-wasp', prop: 'scale', value: 0, duration: 4000},
            {id: 'white-fungus', prop: 'scale', value: 0, duration: 4000},
            {id: 'scale-wasp', prop: 'scale', value: 0, duration: 4000},
            {id: 'pesticide', prop: 'scale', value: 3, duration: 4000}
          ]
        },{
          duration: 4000,
          tweens: [
            {id: 'larvae-wasp', prop: 'scale', value: 0, duration: 4000},
            {id: 'fly', prop: 'scale', value: 0, duration: 4000},
            {id: 'rust-fungus', prop: 'scale', value: 2, duration: 4000},
            {id: 'pesticide', prop: 'scale', value: 4, duration: 4000}
          ]
        }
      ]
    }
  }
}

var app = new App(config);
