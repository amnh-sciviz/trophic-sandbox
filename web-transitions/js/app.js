'use strict';

var App = (function() {

  function App(config) {
    var defaults = {

    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  App.prototype.init = function(){
    var _this = this;

    this.loadCanvas();
    this.loadListeners();
  };

  App.prototype.loadCanvas = function(){
    this.el = document.getElementById('app');
    this.elSize = this.el.getBoundingClientRect();

    var app = new PIXI.Application({
      width: this.elSize.width,
      height: this.elSize.height,
      resizeTo: this.el,
      antialias: true,
      backgroundColor: 0xe3c05f
    });
    this.el.appendChild(app.view);
    this.pixiApp = app;
  };

  App.prototype.loadListeners = function(){
    var _this = this;

  };

  App.prototype.render = function(){
    var _this = this;

  };

  return App;

})();

var app = new App({});
