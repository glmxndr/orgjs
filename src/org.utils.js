/*orgdoc
* =Org.Utils= : useful functions

  Many functionalities are used throughout the parser, mainly to process
  strings. The =Org.Utils= object contains these functions.
*/

Org.getUtils = function(org, params){

  /*orgdoc
  ** Testing for presence of Node =fs= module
  */
  var _require = function(){return null;};
  if(typeof require === "function"){
    _require = require;
  }
  var fs = _require("fs");

  /*orgdoc
  ** Built-in object modifications
     We try to remain as light as possible, only adding functionalities
     that may already be present in certain versions of Javascript.

  *** =Object.create= implementation if not present
  */
  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  /*orgdoc
  *** =Array.prototype.indexOf= implementation if not present
  */
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
      "use strict";
      if (this === void 0 || this === null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = 0;
      if (arguments.length > 0) {
        n = Number(arguments[1]);
        if (n !== n) { // shortcut for verifying if it's NaN
          n = 0;
        } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
          return -1;
      }
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };
  }

  /*orgdoc
  ** =Utils= object to be returned
  */
  var _R = org.Regexps;

  var _U = {
    /*orgdoc
         + =root= goes up the chain of =parent= properties, until no finding any parent.
    */
    root: function(obj){
      var result = obj;
      while(result.parent){result = result.parent;}
      return result;
    },

    /*orgdoc
         + =range= returns an array of numbers, built depending on the arguments
           - 1 argument : 0 to the argument, incrementing if positive, decrementing if negative
           - 2 arguments : =arg[0]= to =arg[1]=, incrementing or decrementing,
           - 3 arguments:  =arg[0]= to =arg[1]=, incrementing by =arg[3]=
    */
    range: function(){
      var from, to, step, args = arguments, result = [], i;
      switch(args.length){
        case 0: return result;
        case 1: from = 0;       to = args[0]; step = to > from ? 1 : -1; break;
        case 2: from = args[0]; to = args[1]; step = to > from ? 1 : -1; break;
        case 3: from = args[0]; to = args[1]; step = args[2];            break;
      }
      if(step === 0){return result;}
      for(i = from; step > 0 ? i < to : i > to ; i += step){
        result.push(i);
      }
      return result;
    },

    /*orgdoc
          + trimming a string, always returning a string (never return null or unusable output)
    */
    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    /*orgdoc
         + if the input is inserted in quotes (='=) or double quotes (="=), remove them ; return
           input if enclosing quotes not found.
    */
    unquote: function(str){
      str = str || "";
      var result = /^(['"])(.*)\1$/.exec(str);
      if(result){
        return result[2];
      }
      return str;
    },

    /*orgdoc
         + tells if a given string or array is empty
           (more exactly, tells if the length property of the argument is falsy)
    */
    empty: function(o){
      // Valid only for strings and arrays
      return (!(o && o.length));
    },

    /*orgdoc
         + inverse of =empty=
    */
    notEmpty: function(o){
      // Valid only for strings and arrays
      return !this.empty(o);
    },

    /*orgdoc
         + tells if the given string has only blank characters
    */
    blank: function(str){
      // Valid only for strings and arrays
      return !str || str == 0;
    },

    /*orgdoc
         + inverse of =blank=
    */
    notBlank: function(str){
      // Valid only for strings and arrays
      return !this.blank(str);
    },

    /*orgdoc
         + repeats the given string n times
    */
    repeat: function(str, times){
      var result = [];
      for(var i=0; i<times; i++){
        result.push(str);
      }
      return result.join('');
    },

    /*orgdoc
         + applies a function for each element of the given array or object
    */
    each: function(arr, fn){
      var name, length = arr.length, i = 0, isObj = length === undefined;
      if ( isObj ) {
        for ( name in arr ) {
          if ( fn.call( arr[ name ], arr[ name ], name ) === false ) {break;}
        }
      } else {
        if(!length){return;}
        for ( var value = arr[0];
          i < length && fn.call( value, value, i ) !== false;
          value = arr[++i] ) {}
      }
    },

    /*orgdoc
         + applies the given function for each element of the given array or
           object, and returns the array of results
    */
    map: function(arr, fn){
      var result = [];
      this.each(arr, function(val, idx){
        var mapped = fn.call(val, val, idx);
        if (mapped !== null){result.push(mapped);}
      });
      return result;
    },

    /*orgdoc
         + logs the given argument (relies on =console.log=, does nothing if
           not present)
    */
    log: function(o){
      if(console && console.log){console.log(o);}
    },

    /*orgdoc
         + returns the first line of the given string
    */
    firstLine: function(str){
      var match = _R.firstLine.exec(str);
      return match ? match[0] : "";
    },

    /*orgdoc
         + splits the given string in lines, returns the array of lines
           without the trailing line feed
    */
    lines: function(str){
      if (!str && str !== ""){return [];}
      return str.split(_R.newline);
    },

    /*orgdoc
         + returns a random string of given length
    */
    randomStr: function(length, chars){
      var str = "";
      var available = chars || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for( var i=0; i < length; i++ )
          str += available.charAt(Math.floor(Math.random() * available.length));
      return str;
    },

    /*orgdoc
         + returns an array of the keys of the given object
    */
    keys: function(obj){
      var result = [];
      this.each(obj, function(v, k){result.push(k);});
      return result;
    },

    /*orgdoc
         + returns the keys of the given object joined with the given delimiter
    */
    joinKeys: function(obj, delim){
      return this.keys(obj).join(delim);
    },

    /*orgdoc
         + returns a random token not present in the given string
    */
    getAbsentToken: function(str, prefix){
      prefix = prefix || "";
      var token, start = prefix + "_";
      if(str.indexOf(start) === -1){return start;}
      token = start + this.randomStr(5);
      while(str.indexOf(token) !== -1){
        token = start + this.randomStr(5);
      }
      return token;
    },
    
    /*orgdoc
         + URI-style path utilities
    */
    path: {

      /*orgdoc
             + gets the parent of the given path
      */
      parent: function(path){
        path = _U.trim("" + path);
        var split = path.split(/\//);
        if(_U.blank(split.pop())){
          split.pop();
        }
        return split.join("/") + "/";
      },

      /*orgdoc
             + concatenates path pieces into a valid path
               (normalizing path separators)
      */
      concat: function(){
        var idx;
        var args = Array.prototype.slice.call(arguments);
        var max = args.length;
        var result = args.join("/").replace(/\/+/g, "/");
        return result;
      }
    },

    /*orgdoc
         + gets the content from a given location :
           + through AJAX if jQuery is detected,
           + through node.js filesystem if node.js is detected,
           + returning null if nothing found
    */
    get: function(location){
      var result = null;
      if(jQuery){
        // If we're in the browser, org.js requires jQuery...
        // Maybe to refactor to using XHR / ActiveX ourselves
        jQuery.ajax({
          async: false,
          url: location,
          dataType: 'text',
          success: function(data){
            result = data;
          }
        });
      } else if(fs) {
        // Else pretend we're in node.js...
        result = fs.readFileSync(location);
      }
      return result;
    },

    /*orgdoc
         + =_U.noop= is (slightly) shorter to write than =function(){}= ...
    */
    noop: function(){}

  };

  return _U;

};
