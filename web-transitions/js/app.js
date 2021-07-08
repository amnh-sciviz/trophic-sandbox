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
      animationSpeed: 1000 // in milliseconds
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  App.prototype.init = function(){
    var _this = this;

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

    var nodeContainer = new PIXI.Container();
    var nodes = _.map(this.opt.nodes, function(node, i){
      node.index = i;
      node.scale = 1.0;
      node.lineColor = opt.nodeLineColor;
      node.fillColor = opt.nodeFillColor;
      node.graphicsX = node.x * w;
      node.graphicsY = node.y * h;
      node.graphics = new PIXI.Graphics();
      node.graphics.x = node.graphicsX;
      node.graphics.y = node.graphicsY;
      nodeContainer.addChild(node.graphics);
      return node;
    });

    var edgeContainer = new PIXI.Container();
    var edges = _.map(this.opt.edges, function(edge, i){
      var nodeFrom = _.find(nodes, function(node){ return node.id === edge.from; });
      var nodeTo = _.find(nodes, function(node){ return node.id === edge.to; });
      edge.fromIndex = nodeFrom.index;
      edge.toIndex = nodeTo.index;
      edge.thickness = opt.edgeThickness;
      edge.color = edge.type === 'positive' ? opt.edgePositiveColor : opt.edgeNegativeColor;
      edge.gap = opt.edgeGap;
      edge.triangleHeight = edge.thickness * Math.sqrt(3) / 2;
      edge.graphics = new PIXI.Graphics();
      edge.graphics.x = nodeFrom.graphicsX;
      edge.graphics.y = nodeFrom.graphicsY;
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

  App.prototype.render = function(delta){
    var now = Date.now();
    var t = (now % this.opt.animationSpeed) / this.opt.animationSpeed;

    var renderer = this.pixiApp.renderer;
    var w = renderer.width;
    var h = renderer.height;
    var nodeRadius = Math.round(Math.min(w, h) * 0.075);

    // calculate node size and positions
    var nodes = _.map(this.nodes, function(node, i){
      node.graphicsX = node.x * w;
      node.graphicsY = node.y * h;
      node.radius = nodeRadius * node.scale;
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
