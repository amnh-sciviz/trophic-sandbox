
(function() {
  window.MathUtil = {};

  MathUtil.angleBetween = function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var theta = Math.atan2(dy, dx); // range (-PI, PI]
    // theta = MathUtil.radToDeg(theta);
    return theta;
  }

  MathUtil.clamp = function(value, min, max) {
    value = Math.min(value, max);
    value = Math.max(value, min);
    return value;
  };

  MathUtil.degToRad = function (degrees) {
    return degrees * Math.PI / 180;
  };

  MathUtil.distance = function(x1, y1, x2, y2) {
    return Math.hypot(x2-x1, y2-y1);
  };

  MathUtil.ease = function(n){
    return (Math.sin((n+1.5)*Math.PI)+1.0) / 2.0;
  };

  MathUtil.easeBell = function(n){
    return (Math.sin((2.0*n+1.5)*Math.PI)+1.0) / 2.0;
  };

  MathUtil.hypot = function(a, b){
    return Math.sqrt(a*a + b*b);
  };

  MathUtil.lerp = function(a, b, percent) {
    return (1.0*b - a) * percent + a;
  };

  MathUtil.lerpBetween = function(x1, y1, x2, y2, t){
    var radians = MathUtil.angleBetween(x1, y1, x2, y2);
    var distance = MathUtil.distance(x1, y1, x2, y2) * t;
    var xt = x1 + distance * Math.cos(radians);
    var yt = y1 + distance * Math.sin(radians);
    return { x: xt, y: yt };
  };

  MathUtil.norm = function(value, a, b){
    var denom = (b - a);
    if (denom > 0 || denom < 0) {
      return (1.0 * value - a) / denom;
    } else {
      return 0;
    }
  };

  MathUtil.radToDeg = function (rad) {
    return rad * 180 / Math.PI;
  };

})();
