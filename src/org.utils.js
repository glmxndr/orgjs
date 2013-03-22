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

  var _R = org.Regexps;
  /*orgdoc
  ** =Utils= object to be returnedn aliased as =_U=.
  */
  var _U = {

    // Mimics the M-q function in Emacs (fill-paragraph)
    fillParagraph: function(str, length){
      var words = str.split(/\s/g);
      var lines = [];
      var curline = "";
      var curword = words.shift();
      while(curword){
        var testline = (_U.notBlank(curline) ? curline + " " : "") + curword;
        if(testline.length <= length){
          curline = testline;
        } else {
          lines.push(curline);
          curline = curword;
        }
        curword = words.shift();
      }
      if(_U.notBlank(curline)){lines.push(curline);}
      return lines.join("\n");
    },

    // Indents the content (each line gets prepended an indentation)
    indent: function(str, length, prefix){
      var indent = _U.repeat(" ", length);
      prefix = prefix || indent;
      var first = true;
      var lines = _U.lines(str);
      var indented = _U.map(lines, function(l){
        if(first){
          first = false;
          return prefix + l; 
        } else {
          return indent + l;
        }
      });
      return indented.join("\n");
    },

    /*orgdoc
         + =extend()= is a function to be attached to prototypes, for example, to allow easy
           addition of features.
           #+BEGIN_EXAMPLE
             var Type = function(){};
             Type.prototype.extend = _U.extend;
             Type.prototype.extend({
               some: function(){},
               neet: function(){}
             });
           #+END_EXAMPLE
    */
    extend: function(){
      var key, idx, obj;
      for(idx in arguments){
        obj = arguments[idx];
        for(key in obj){
          if(obj.hasOwnProperty(key)){ this[key] = obj[key]; }
        }
      }
    },

    /*orgdoc
         + =merge()= resembles =extend()= but allows to merge several objects into a brand new one.
           #+BEGIN_EXAMPLE
             var one   = {a:1, b:1};
             var two   = {a:2, c:3};
             var three = _U.merge(one, two);

             assertEquals(2, three.a);
             assertEquals(1, three.b);
             assertEquals(3, three.c);
           #+END_EXAMPLE
    */
    merge: function(){
      var result = {};
      var key, idx, obj;
      for(idx in arguments){
        obj = arguments[idx];
        for(key in obj){
          if(obj.hasOwnProperty(key)){ result[key] = obj[key]; }
        }
      }
      return result;
    },

    /*orgdoc
         + =array(o)= makes an "official" Array out of an array-like object (like function =arguments=)
    */
    array: function(o){
      return Array.prototype.slice.call(o);
    },

    /*orgdoc
         + =range()= returns an array of numbers, built depending on the arguments
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
          + =trim(str)= : trimming a string, always returning a string (never return null or unusable output)
    */
    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    /*orgdoc
         + =unquote(str)= : if the input is inserted in quotes (='=) or double quotes (="=), remove them ; return
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
         + =empty(o)= tells if a given string or array is empty
           (more exactly, tells if the length property of the argument is falsy)
    */
    empty: function(o){
      // Valid only for strings and arrays
      return (!(o && o.length));
    },

    /*orgdoc
         + =notEmpty(o)= is the inverse of =empty=
    */
    notEmpty: function(o){
      // Valid only for strings and arrays
      return !this.empty(o);
    },

    /*orgdoc
         + =blank(str)= tells if the given string has only blank characters
    */
    blank: function(str){
      // Valid only for strings and arrays
      return !str || str == 0;
    },

    /*orgdoc
         + =notBlank(str)= is the inverse of =blank=
    */
    notBlank: function(str){
      // Valid only for strings and arrays
      return !this.blank(str);
    },

    /*orgdoc
         + =repeat(str, times)= repeats the given string n times
    */
    repeat: function(str, times){
      var result = [];
      for(var i=0; i<times; i++){
        result.push(str);
      }
      return result.join('');
    },

    /*orgdoc
         + =each(arr, fn)=applies a function for each element of the given array or object
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
         + =map(arr, fn)=applies the given function for each element of the given array or
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
         + =filter(arr, fn)= applies the given function for each element of the given array or
           object, and returns the array of filtered results
    */
    filter: function(arr, fn){
      var result = [];
      this.each(arr, function(val, idx){
        var mapped = fn.call(val, val, idx);
        if (mapped){result.push(val);}
      });
      return result;
    },

    /*orgdoc
         + =log(obj)= logs the given argument (relies on =console.log=, does nothing if
           not present)
    */
    log: function(o){
      if(console && console.log){console.log(o);}
    },

    /*orgdoc
         + =firstLine(str)= returns the first line of the given string
    */
    firstLine: function(str){
      var match = _R.firstLine.exec(str);
      return match ? match[0] : "";
    },

    /*orgdoc
         + =lines(str)= splits the given string in lines, returns the array of lines
           without the trailing line feed
    */
    lines: function(str){
      if (!str && str !== ""){return [];}
      return str.split(_R.newline);
    },

    /*orgdoc
         + =randomStr(length, chars)= returns a random string of given length
    */
    randomStr: function(length, chars){
      var str = "";
      var available = chars || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for( var i=0; i < length; i++ )
          str += available.charAt(Math.floor(Math.random() * available.length));
      return str;
    },

    /*orgdoc
         + =keys(obj)= returns an array of the keys of the given object
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
         + =getAbsentToken(str, prefix)= returns a random token not present in the given string
    */
    getAbsentToken: function(str, prefix){
      prefix = prefix || "";
      var token, start = prefix;
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
             + =parent(path)= gets the parent of the given path
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
             + =concat= concatenates path pieces into a valid path
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
         + =get()= gets the content from a given location :
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
         + =_U.noop()= is (slightly) shorter to write than =function(){}= ...
    */
    noop: function(){},

    /*orgdoc
         + =incrementor()= provides an incrementor function, starting from 0 or the given argument
    */
    incrementor: function(i){
      var idx = i || 0;
      return function(){return ++idx;};
    },

    /*orgdoc
         + =id()= returns a unique identifier
    */
    id: function(){
      return _U.incr();
    },

    /*orgdoc
         + =bind()= mimics the =Function.bind=
    */
    bind: function(fn, obj){
      return function(){
        fn.apply(fn, arguments);
      };
    },

    pad: function(num, length, char){
      char = char || "0";
      length = length || 2;
      var str = "" + num;
      while(str.length < length){
        str = "0" + str;
      }
      return str;
    }

  };

    /*orgdoc
         + =incr= is the default incrementor
    */
  _U.incr = _U.incrementor();


  /*orgdoc
  *** =_U.TreeNode= is the basic type for the items in the tree of the parsed documents
        
        Access the parent with the =.parent= property.

        Access the children with the =.children= property.
  */
  var TreeNode = function(parent, params){
    var p          = params || {};
    this.nodeType  = p.nodeType || "unknown";
    this.id        = _U.id();
    this.parent    = parent || null;
    this._leaf     = p.leaf || false;
    this.children  = p.leaf ? null : [];
  };
  /*orgdoc
  **** Helper functions to manipulate / navigate through the tree.
  */
  TreeNode.prototype = {

    /*orgdoc
         + =ancestors()= provides the array of the ancestors of the current node, closest first
    */
    ancestors: function(){
      var result = [];
      var parent = this.parent;
      while(parent !== null){
        result.push(parent);
        parent = parent.parent;
      }
      return result;
    },
    
    /*orgdoc
         + =root()= provides the root of the tree (last of ancestors)
    */
    root: function(){
      var result = [];
      var parent = this.parent;
      while(parent !== null){
        result.push(parent);
        if(!parent.parent){return parent;}
        parent = parent.parent;
      }
      return parent;
    },

    /*orgdoc
         + =leaf()= tells if the node has children or not
    */
    leaf: function(){return this._leaf;},
    
    /*orgdoc
         + =siblings()= provides all the siblings (this node excluded)
    */
    siblings: function(){
      var all = this.siblingsAll(),
          id = this.id;
      return _U.filter(all, function(v){return v.id !== id;});
    },
    
    /*orgdoc
         + =siblingsAll()= provides all the siblings (this node included)
    */
    siblingsAll: function(){
      return this.parent ? this.parent.children : [this];
    },

    /*orgdoc
         + =prev()= provides the previous item, or null
    */
    prev: function(){
      var idx, candidate, prev = null;
      var siblings = this.siblingsAll();
      if(siblings.length == 1){return null;}
      for(idx in siblings){
        candidate = siblings[idx];
        if(candidate.id === this.id){
          return prev;
        }
        prev = candidate;
      }
      return null;
    },
    
    /*orgdoc
         + =prevAll()= provides all the previous items
               (in the same order as siblings, closest last)
    */
    prevAll: function(){
      var idx, candidate, result = [];
      var siblings = this.siblingsAll();
      if(siblings.length == 1){return null;}
      for(idx in siblings){
        candidate = siblings[idx];
        if(candidate.id === this.id){
          return result;
        } else {
          result.push(candidate);
        }
      }
      return result;
    },
    
    /*orgdoc
         + =next()= provides the next item, or null
    */
    next: function(){
      var idx, candidate, ok = false;
      var siblings = this.siblingsAll();
      if(siblings.length == 1){return null;}
      for(idx in siblings){
        if(ok){return siblings[idx];}
        else {
          candidate = siblings[idx];
          if(candidate.id === this.id){
           ok = true;
          }
        }
      }
      return null;
    },
    
    /*orgdoc
         + =lastAll()= provides all the next items
               (in the same order as siblings, closest first)
    */
    nextAll: function(){
      var idx, candidate, ok = false, result = [];
      var siblings = this.siblingsAll();
      if(siblings.length == 1){return null;}
      for(idx in siblings){
        if(ok){result.push(siblings[idx]);}
        else {
          candidate = siblings[idx];
          if(candidate.id === this.id){
           ok = true;
          }
        }
      }
      return result;
    },

    /*orgdoc
         + =append()= adds a new child at the end of the children array
    */
    append: function(child){
      this.children.push(child);
      child.parent = this;
    },

    /*orgdoc
         + =prepend()= adds a new child at the beginning of the children array
    */
    prepend: function(child){
      this.children.unshift(child);
      child.parent = this;
    },

    replace: function(child, nodearr){
      var position = this.children.indexOf(child);
      var siblings = this.children;
      var result = [];
      result = result.concat(siblings.slice(0, position), nodearr, siblings.slice(position + 1));
      this.children = result;
    }

  };

  _U.TreeNode = TreeNode;

  /*orgdoc
  *** =_U.Timestamp= : wrapper around Javascript =Date=
      This object allows to parse and format dates. Only the parameters actually
      provided by the =Org= timestamps are parsed/formatted for now, and only as
      numbers (no locale management for textual output of weekdays or months).
  **** TODO Add configuration entry to deal with textual repr. of weekdays and months
  **** TODO Add text-formatting options for weekdays and months
  **** Wrapper around date
       This object is a wrapper around the Javascript =Date= object. Access the =Date=
       instance through the =date= property.
  */
  var Timestamp = function(str){
    this.parse(str);
    this.date = this.date || new Date();
  };
  /*orgdoc
  **** Proprieties
        + =date= :: the corresponding Javascript date
        + =year= :: the year
        + =month= :: the month (1-12)
        + =day= :: the day (1-31)
        + =hour= :: the hour (0-23)
        + =minute= :: the minute (0-59)
  **** Prototype functions
  */
  Timestamp.prototype = {
    /*orgdoc
    ***** =parse()=
           Parses a timestamp at the =Org= format (for instance ~2010-01-30 12:34~).
           This function is called by the constructor.
    */
    parse: function(str){
      this.raw = str;
      var regexp          = /^(\d{4}-\d{2}-\d{2})(?: [a-z.]+)?(?: (\d{2}:\d{2}))?$/;
      var match           = regexp.exec(str); if(!match){return;}
      var datestr         = match[1].split('-');
      this.year           = datestr[0];
      this.month          = datestr[1];
      this.day            = datestr[2];
      var timestr         = (match[2] || "00:00").split(":");
      this.hour           = timestr[0];
      this.minute         = timestr[1];
      this.date           = new Date(this.year, this.month - 1, this.day, this.hour, this.minute);
    },
    /*orgdoc
    ***** =format()=
      Formats the timestamp in the Unix-date fashion. Only a few flags are supported.
    */
    format: function(str){
      var d = this;
      str = str.replace(/%([HkIlMSYymde])/g, function(){
        var a = arguments;
        var c = a[1];
        switch(c){
          /*orgdoc
            + ~%H~ : the 2-digit hour (00-23)
          */
          case 'H': return "" + _U.pad(d.hour);
          /*orgdoc
            + ~%k~ : the hour (0-23)
          */
          case 'k': return "" + d.hour;
          /*orgdoc
            + ~%I~ : the 2-digit hour (01-12)
          */
          case 'I': return "" + _U.pad((d.hour % 12) + 1);
          /*orgdoc
            + ~%l~ : the hour (1-12)
          */
          case 'l': return "" + ((d.hour % 12) + 1);
          /*orgdoc
            + ~%M~ : the 2-digit minutes (00-59)
          */
          case 'M': return "" + _U.pad(d.minute);
          /*orgdoc
            + ~%S~ : the 2-digit seconds (00-59)
          */
          case 'S': return "" + _U.pad(d.second);
          /*orgdoc
            + ~%y~ : the 2-digit year
          */
          case 'y': return "" + _U.pad(d.year % 100, 2);
          /*orgdoc
            + ~%Y~ : the 4-digit year
          */
          case 'Y': return "" + d.year;
          /*orgdoc
            + ~%m~ : the 2-digit month (01-12)
          */
          case 'm': return "" + _U.pad(d.month);
          /*orgdoc
            + ~%d~ : the 2-digit day (01-31)
          */
          case 'd': return "" + _U.pad(d.day);
          /*orgdoc
            + ~%e~ : the day (1-31)
          */
          case 'e': return "" + d.day;
        }
      });
      return str;
    }
  };

  _U.Timestamp = Timestamp;


  return _U;

};

/*orgdoc+/
   #+END_SRC
/---orgdoc*/