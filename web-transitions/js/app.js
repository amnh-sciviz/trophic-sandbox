'use strict';

var App = (function() {

  function App(config) {
    var defaults = {
      el: 'app',
      nodes: [],
      edges: [],
      states: [],
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

    this.loadCanvas();
    this.loadGraphics();
    this.loadListeners();

    this.pixiApp.ticker.add((delta) => {
      _this.render(delta);
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
    var brightenedNodeFillColor = lerpColor(opt.nodeFillColor, opt.bgColor, lerpAmount);
    var brightenedNodeLineColor = lerpColor(opt.nodeLineColor, opt.bgColor, lerpAmount);
    var brightenedEdgePositiveColor = lerpColor(opt.edgePositiveColor, opt.bgColor, lerpAmount);
    var brightenedEdgeNegativeColor = lerpColor(opt.edgeNegativeColor, opt.bgColor, lerpAmount);

    var nodeContainer = new PIXI.Container();
    var nodes = _.map(this.opt.nodes, function(node, i){
      node.index = i;
      node.scale = 1.0;
      node.opacity = 1.0;
      node.lineColor = opt.nodeLineColor;
      node.fillColor = opt.nodeFillColor;
      node.baseLineColor = opt.nodeLineColor;
      node.baseFillColor = opt.nodeFillColor;
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
      node.graphics.mouseover = function(e) { _this.onMouseoverNode(i); }
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
        _this.nodes[edge.fromIndex].fillColor = opt.nodeFillColor;
        _this.nodes[edge.fromIndex].lineColor = opt.nodeLineColor;
        _this.nodes[edge.toIndex].fillColor = opt.nodeFillColor;
        _this.nodes[edge.toIndex].lineColor = opt.nodeLineColor;
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

    this.nodes[nodeIndex].fillColor = opt.nodeFillColor;
    this.nodes[nodeIndex].lineColor = opt.nodeLineColor;

    this.edges = _.map(this.edges, function(edge, i){
      edge.color = edge.fromIndex === nodeIndex || edge.toIndex === nodeIndex ? edge.baseColor : edge.hoverColor;
      var otherNodeIndex = -1;
      if (edge.fromIndex === nodeIndex) otherNodeIndex = edge.toIndex;
      else if (edge.toIndex === nodeIndex) otherNodeIndex = edge.fromIndex
      if (otherNodeIndex >= 0) {
        _this.nodes[otherNodeIndex].fillColor = opt.nodeFillColor;
        _this.nodes[otherNodeIndex].lineColor = opt.nodeLineColor;
      }
      return edge;
    });
  };

  App.prototype.render = function(delta){
    var now = Date.now();
    var t = (now % this.opt.animationSpeed) / this.opt.animationSpeed;

    var renderer = this.pixiApp.renderer;
    var w = renderer.width;
    var h = renderer.height;
    var nodeRadius = Math.round(Math.min(w, h) * this.opt.nodeRadius);

    // calculate node size and positions
    var nodes = _.map(this.nodes, function(node, i){
      node.graphicsX = node.x * w;
      node.graphicsY = node.y * h;
      node.radius = nodeRadius * node.scale;
      node.graphics.hitArea.width = node.radius * 2;
      node.graphics.hitArea.height = node.radius * 2;
      node.graphics.hitArea.x = -node.radius;
      node.graphics.hitArea.y = -node.radius;
      return node;
    });

    // draw edges
    _.each(this.edges, function(edge, i){
      var nodeFrom = nodes[edge.fromIndex];
      var nodeTo = nodes[edge.toIndex];
      var distance = MathUtil.distance(nodeFrom.graphicsX, nodeFrom.graphicsY, nodeTo.graphicsX, nodeTo.graphicsY);
      var radians = MathUtil.angleBetween(nodeFrom.graphicsX, nodeFrom.graphicsY, nodeTo.graphicsX, nodeTo.graphicsY);

      var segmentWidth = edge.thickness + edge.gap;
      var segments = Math.round(distance / segmentWidth);
      var halfThickness = edge.thickness * 0.5;
      var quarterThickness = halfThickness * 0.5;

      edge.graphics.clear();
      edge.graphics.beginFill(edge.color, 1);
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
      node.graphics.lineStyle(2, node.lineColor, 1);
      node.graphics.beginFill(node.fillColor, 1);
      node.graphics.drawCircle(0, 0, node.radius);
      node.graphics.endFill();
    })

  };

  return App;

})();

var config = {
  nodes: [
    {id: 'beetle', x: 0.2, y: 0.2, label: 'Adult lady beetle'},
    {id: 'fly', x: 0.65, y: 0.1, label: 'Head-hunting phorid fly'},
    {id: 'larvae-wasp', x: 0.125, y: 0.5, label: 'Larvae-killer wasp'},
    {id: 'ant', x: 0.5, y: 0.3, label: 'Azteca ant'},
    {id: 'scale-wasp', x: 0.8, y: 0.33, label: 'Scale-killer wasp'},
    {id: 'larvae', x: 0.3, y: 0.8, label: 'Larval lady beetle'},
    {id: 'scale', x: 0.575, y: 0.55, label: 'Scale insect'},
    {id: 'white-fungus', x: 0.6, y: 0.875, label: 'White halo fungus'},
    {id: 'rust-fungus', x: 0.85, y: 0.8, label: 'Rust fungus'}
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
    {from: 'rust-fungus', to: 'white-fungus', type: 'negative'}
  ],
  states: []
}

var app = new App(config);
