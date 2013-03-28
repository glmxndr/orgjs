/*orgdoc
#+TITLE:     Org-Mode Javascript Parser

This project aims to provide a parser and easily customizable renderer
for [[http://orgmode.org/][Org-Mode]] files in JavaScript.

* =Org= : the Main object

  The global context is extended with only one object, named =Org=.

*/
var Org = function(params){
  this.version    = "0.1";
  this.apiversion = "7.6";
  this.Config     = Org.getConfig(this, params);
  this.Regexps    = Org.getRegexps(this, params);
  this.Utils      = Org.getUtils(this, params);
  this.Markup     = Org.getMarkup(this, params);
  this.Content    = Org.getContent(this, params);
  this.Outline    = Org.getOutline(this, params);
  this.Parser     = Org.getParser(this, params);
  this.Renderers  = Org.getRenderers(this, params);
};

/*orgdoc

* =OrgPath=
  An XPath-like language to select items in the =Org= document tree.

  This allows to provide a selection mechanism to apply templates to nodes
  at rendering time.

** Path examples 
   Just to give a feeling of the selecting language, here are a few examples:

   + =*= :: any item whatsoever
   + =node=, =node{*}= :: any node, an any level
   + =n{*}=, =n= :: any node, 'n' being shortcut for 'node'
   + =n3=, =n{3}= :: any node of level 3
   + =n{1-3}=, =n3[level~1-3]= :: any node of level 1 to 3
   + =n3:tag= :: any node of level 3 with a tag "tag" (possibly implied by parents)
   + =n3!tag= :: any node of level 3 with a tag "tag" defined at this node
   + =n3[position\=2]= :: any second node of level 3 within its parent
   + =n3[2]=  :: any second node of level 3 within its parent
   + =n3[todo\=DONE]= :: any node of level 3 with a "DONE" todo-marker
   + =n3/src1=, =n3/src{1}=, =n3/src[level~1-3]= :: any =BEGIN_SRC= item right under a node of level 3
   + =n3/src= :: any =BEGIN_SRC= item within the content a node of level 3
   + =n3//src= :: any =BEGIN_SRC= item anywhere under a node of level 3
   + =src= :: any =BEGIN_SRC= item anywhere
   + =src[lang\=js]= :: any =BEGIN_SRC= item anywhere whith language set as 'js'
   + =src>p= :: first paragraph following a =BEGIN_SRC= item
   + =src>>p= :: any paragraph following a =BEGIN_SRC= item
   + =src<p= :: first paragraph preceding a =BEGIN_SRC= item
   + =src<<p= :: any paragraph preceding a =BEGIN_SRC= item
   + =src/..= :: parent of a =BEGIN_SRC= item

*/
Org.Path = (function(){

  var OrgPath = function(str){
    this.parse(str);
  };
  OrgPath.prototype.accept = function(){
    
  };

  OrgPath.prototype.parse = function(str){
    
    var levels = str.split(/(?=\/\/?)/);
    

  };
  

return OrgPath;

}());

/*orgdoc
* TODO =Org.Config= : configuration
*/

Org.getConfig = function(org, params){

  params = params || {};

  var _C = {};

  /*orgdoc
  ** URL protocols
  */
  _C.urlProtocols = params.urlProtocols || [
    "http",
    "https",
    "ftp",
    "mailto",
    "file",
    "id",
    "javascript",
    "elisp"
  ];

  _C.todoMarkers = params.todoMarkers || [
    "TODO",
    "DONE"
  ];

  /*orgdoc

  ** Tab width
      Specifies how much single spaces for each tabulation character. 4 by default.
  */
  _C.tabWidth = params.tabWidth || 4;

  return _C;

};
/*orgdoc
* =Org.Regexps= : the regexp bank

  The parser needs a lot of regular expressions.
  Non trivial regexps will be found in the file =org.regexps.js=,
  and accessible under the object =Org.Regexps=.
*/

(function() {

  Org.getRegexps = function(org, params) {
    var _C, _R;
    _C = org.Config;
    _R = {
      /*orgdoc
       + A new line declaration, either windows or unix-like
      */
      newline: /\r?\n/,
      /*orgdoc
       + Captures the first line of the string
      */
      firstLine: /^(.*)/,
      /*orgdoc
       + Selects anything in the given string until the next heading, or the end.
         Example :
         #+BEGIN_EXAMPLE
         some content
         * next heading
         #+END_EXAMPLE
         would match "some content\n\n*"
                Captures everything except the star of the following heading.
      */
      beforeNextHeading: /^([\s\S]*?)(?:\n\*|$)/,
      /*orgdoc
       + Parses a heading line, capturing :
         - the stars
         - the TODO status
         - the priority
         - the heading title
         - the tags, if any, separated by colons
      */
      headingLine: (function() {
        var str = "(\\**)%s*";
        str += "(?:(%TODO)%s+)?";
        str += "(?:\\[\\#([A-Z])\\]%s+)?";
        str += "(.*?)%s*";
        str += "(?:%s+:([A-Za-z0-9:]+):%s*)?";
        str += "(?:\n|$)";

        str = str.replace(/%TODO/, _C.todoMarkers.join('|'));
        str = str.replace(/%s/g, '[ \\t]');
        return RegExp(str);
      })(),
      /*orgdoc
       + How a meta information begins ( =#\+META_KEY:= )
      */
      metaDeclaration: /\s*#\+[A-Z0-9_]+:/,
      /*orgdoc
       + A meta information line, capturing:
         - the meta key,
         - the meta value
         Example:
         #+BEGIN_EXAMPLE
            #+TITLE: The title
         #+END_EXAMPLE
         captures: "TITLE", "The title"
      */
      metaLine: /(?:^|\s*)#\+([A-Z0-9_]+):\s*(.*)(\n|$)/m,
      /*orgdoc
       + The property section. Captures the content of the section.
      */
      propertySection: /:PROPERTIES:\s*\n([\s\S]+?)\n\s*:END:/,
      /*orgdoc
       + Property line. Captures the KEY and the value.
      */
      propertyLine: /^\s*:([A-Z0-9_-]+):\s*(\S[\s\S]*)\s*$/i,
      /*orgdoc
       + Clock section when several clock lines are defined.
      */
      clockSection: /:CLOCK:\s*\n([\s\S]+?)\n?\s*:END:/,
      /*orgdoc
       + Matches a clock line, either started only, or finished.
         Captures:
          - start date (yyyy-MM-dd)
          - start time (hh:mm)
          - end date (yyyy-MM-dd)
          - end time (hh:mm)
          - duration (hh:mm)
      */
      clockLine: /CLOCK: \[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\](?:--\[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\] =>\s*(-?\d+:\d\d))?/g,
      /*orgdoc
        + Scheduled
      */
      scheduled: /SCHEDULED: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,
      /*orgdoc
        + Deadline
      */
      deadline: /DEADLINE: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,
      /*orgdoc
        + The different kinds of lines encountered when parsing the content
      */
      lineTypes: {
        blank: /^\s*$/,
        letter: /^\s*[a-z]/i,
        ignored: /^#(?:[^+]|$)/,
        ulitem: /^(?:\s*[+-]|\s+\*)\s+/,
        dlitem: /^(?:\s*[+-]|\s+\*)\s+(.*?)\s*::/,
        olitem: /^\s*\d+[.)] /,
        fndef: /^\s*\[(\d+|fn:.+?)\]/,
        sexample: /^\s*: /,
        _bBlk: {},
        beginBlock: function(type) {
          return this._bBlk[type] || (this._bBlk[type] = new RegExp("^\\s*#\\+BEGIN_" + type + "(\\s|$)", "i"));
        },
        _eBlk: {},
        endBlock: function(type) {
          return this._eBlk[type] || (this._eBlk[type] = new RegExp("^\\s*#\\+END_" + type + "(\\s|$)", "i"));
        }
      }
    };
    return _R;
  };

}).call(this);
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

    // Last item of an aray
    last: function(arr){
      return (arr && arr.length) 
        ? arr[arr.length - 1] 
        : null;
    },

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
      // Get the global object as globl.
      var globl = null;
      !function(){globl = this;}();
      // Detect jQuery or Zepto.
      var $lib = globl.jQuery || globl.Zepto;
      if($lib){
        // If we're in the browser, org.js requires jQuery...
        // Maybe to refactor to using XHR / ActiveX ourselves
        $lib.ajax({
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
/---orgdoc
* Markup parser

  This file describes the =OrgMode= wiki-style markup parsing.

  The parsing strategy differs in some ways from the original =Org=:
  + emphasis markup (bold, italic, underline, strike-through) are recursive,
    and can be embedded one in  (they can also contain code/verbatim inline items)
  + the delimiting characters for the emphasis/code/verbatim markup are
    not configurable as they are in the =OrgMode= implementation
  + subscript and superscript are mandatorily used with curly braces
*/
Org.getMarkup = function(org, params){

  var _U = org.Utils;
  var _C = org.Config;

  var Markup = {};

  /*orgdoc
  ** Link management
  *** Link type definitions
  */
  var LinkDefs = (function(){
    var l = 0;
    return {
      HTTP:     {id:++l, re:/^https?:/},
      FTP:      {id:++l, re:/^ftp:/},
      FILE:     {id:++l, re:/^(?:file:|\.{1,2}\/)/},
      MAIL:     {id:++l, re:/^mailto:/},
      ID:       {id:++l, re:/^#/},
      PROTOCOL: {id:++l, re:/:/},
      SEARCH:   {id:++l, re:/.*/}
    };
  }());

  var LinkType={};  _U.map(LinkDefs, function(v,k){LinkType[k] = v.id;});
  var LinkTypeArr = _U.map(LinkType, function(v,k){return LinkDefs[k];});

  function getLinkType(link){
    var k;
    for(k in LinkTypeArr){
      if(link.url.match(LinkTypeArr[k].re)){return LinkType[k];}
    }
  }

  /*orgdoc
  *** =Link= object
  */
  var Link = function(parent, raw, url, desc, token){
    _U.TreeNode.call(this, parent, {"nodeType": "Link", leaf: true});
    this.raw = raw;
    this.url = url;
    this.desc = Markup.parse(this, desc);
    this.token = token;
    this.type = getLinkType(this);
  };
  Link.prototype = Object.create(_U.TreeNode.prototype);
  Link.prototype.replaceTokens = function(){};
  Markup.Link = Link;

  /*orgdoc
  ** Footnote references
     Footnotes have definitions as blocks in the =Content= section. This section
     deals only with footnote references from within the markup.
  */
  var FootNoteRef = function(parent, raw, name, token){
    _U.TreeNode.call(this, parent, {"nodeType": "FootNoteRef", leaf: true});
    this.raw = raw;
    this.name = name;
    this.token = token;
  };
  FootNoteRef.prototype = Object.create(_U.TreeNode.prototype);
  FootNoteRef.prototype.replaceTokens = function(){};
  Markup.FootNoteRef = FootNoteRef;

  /*orgdoc
  ** Sub/sup markup
  */
  var SubInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "SubInline"});
    this.content = raw;
    this.token = token;
  };
  SubInline.prototype = Object.create(_U.TreeNode.prototype);
  SubInline.prototype.replaceTokens = function(){};
  Markup.SubInline = SubInline;

  var SupInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "SupInline"});
    this.content = raw;
    this.token = token;
  };
  SupInline.prototype = Object.create(_U.TreeNode.prototype);
  SupInline.prototype.replaceTokens = function(){};
  Markup.SupInline = SupInline;

  /*orgdoc
  ** Timestamp markup
  */
  var TimestampInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "TimestampInline"});
    this.content = raw;
    this.token = token;
  };
  TimestampInline.prototype = Object.create(_U.TreeNode.prototype);
  TimestampInline.prototype.replaceTokens = function(){};
  Markup.TimestampInline = TimestampInline;

  /*orgdoc
  ** Typographic markup
  *** =EmphMarkers= : emphasis marker abstract object
  */
  //   + Allowed pre:      " \t('\"{"
  //   + Allowed post:     "- \t.,:!?;'\")}\\"
  //   + Forbidden border: " \t\r\n,\"'"
  //   + Allowed body:     "."
  // (defcustom org-emphasis-regexp-components
  //   '(" \t('\"{" "- \t.,:!?;'\")}\\" " \t\r\n,\"'" "." 1)
  //   "Components used to build the regular expression for emphasis.
  // This is a list with five entries.  Terminology:  In an emphasis string
  // like \" *strong word* \", we call the initial space PREMATCH, the final
  // space POSTMATCH, the stars MARKERS, \"s\" and \"d\" are BORDER characters
  // and \"trong wor\" is the body.  The different components in this variable
  // specify what is allowed/forbidden in each part:
  // pre          Chars allowed as prematch.  Beginning of line will be allowed
  //              too.
  // post         Chars allowed as postmatch.  End of line will be allowed too.
  // border       The chars *forbidden* as border characters.
  // body-regexp  A regexp like \".\" to match a body character.  Don't use
  //              non-shy groups here, and don't allow newline here.
  // newline      The maximum number of newlines allowed in an emphasis exp.
  // Use customize to modify this, or restart Emacs after changing it."
  //   :group 'org-appearance
  //   :set 'org-set-emph-re
  //   :type '(list
  //     (sexp    :tag "Allowed chars in pre      ")
  //     (sexp    :tag "Allowed chars in post     ")
  //     (sexp    :tag "Forbidden chars in border ")
  //     (sexp    :tag "Regexp for body           ")
  //     (integer :tag "number of newlines allowed")
  //     (option (boolean :tag "Please ignore this button"))))

  var EmphMarkers = {};
  _U.each("/*+_".split(""), function(t){EmphMarkers[t] = {};});

  EmphMarkers.getInline = function(token, parent){
    var constr = this[token].constr;
    return new constr(parent);
  };
  EmphMarkers.getRegexpAll = function(){
    return (/(^[\s\S]*?)(([\/*+_])([^\s][\s\S]*?[^\s\\]|[^\s\\])\3)/);
  };
  Markup.EmphMarkers = EmphMarkers;


  /*orgdoc
  ** Inline nodes containing either inline nodes or raw textual content
  *** =makeInline=            :function:
       + Purpose :: Creates an inline node object
       + Arguments ::
         + =constr= :: constructor for the object to build ;
                       should build an object with a =consume()= property
         + =parent= :: parent of the node to build
         + =inner= :: textual content the new inline node has to parse as
                     subnodes
  */
  function makeInline(constr, parent, inner){
    var inline = new constr(parent);
    if(inner){inline.consume(inner);}
    return inline;
  }

  /*orgdoc
  *** =EmphInline= : abstract high-level inline node
  */
  var EmphInline = function(parent, nodeType){
    nodeType = nodeType || "EmphInline";
    _U.TreeNode.call(this, parent, {"nodeType": nodeType});
  };

  EmphInline.prototype = Object.create(_U.TreeNode.prototype);
  
  EmphInline.prototype.replaceTokens = function(tokens){
    if(this.children && this.children.length){
      _U.each(this.children, function(v){
        v.replaceTokens(tokens);
      });
    }
    if(this.content && this.content.length){
      var content = this.content;
      var pipedKeys =  _U.joinKeys(tokens, "|");
      if(_U.blank(pipedKeys)){return;}
      var rgx = new RegExp('^((?:.|\n)*?)(' + pipedKeys + ')((?:.|\n)*)$');
      var match, pre, token, rest;
      match = rgx.exec(content);
      var created = [];
      while(match){
        pre = match[1]; token = match[2]; rest = match[3];
        if(_U.notBlank(pre)){ created.push(makeInline(EmphRaw, this.parent, pre)); }
        var tokinline = tokens[token];
        tokinline.parent = this.parent;
        created.push(tokinline);
        content = rest;
        match = rgx.exec(content);
      }
      if(_U.notBlank(rest)){
        if(_U.notBlank(rest)){ created.push(makeInline(EmphRaw, this.parent, rest)); }
      }
      if(created.length){
        this.parent.replace(this, created);
      }
    }
  };
  
  EmphInline.prototype.consume = function(content){
    var regexp = EmphMarkers.getRegexpAll();
    var match;
    var rest = content;
    var pre, hasEmph, type, inner, length;
    var raw, sub;
    while((_U.trim(rest).length > 0) && (match = regexp.exec(rest))){
      pre     = match[1];
      hasEmph = match[2];
      token   = match[3] || "";
      inner   = match[4] || "";
      length  = pre.length + inner.length + (hasEmph ? 2 : 0);
      if(length === 0){break;}
      rest    = rest.substr(length);
      this.append(makeInline(EmphRaw, this, pre)); 
      if(hasEmph !== void 0){
        this.append(makeInline(EmphMarkers[token].constr, this, inner));
      }
    }
    if(_U.notBlank(rest)){ this.append(makeInline(EmphRaw, this, rest)); }
  };
  Markup.EmphInline = EmphInline;

  /*orgdoc
  *** End-point node types
      Basic inline types containing raw text content.
      Can not contain anything else than text content.
  **** =EmphRaw= : basic text
  */
  var EmphRaw = function(parent, nodeType){
    nodeType = nodeType || "EmphRaw";
    EmphInline.call(this, parent, nodeType);
    this.children = null;
    this.recurse = false;
  };
  EmphRaw.prototype = Object.create(EmphInline.prototype);
  EmphRaw.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphRaw = EmphRaw;

  /*orgdoc
  *** Recursing nodes
      These nodes contain other sub nodes (either =EmphRaw=,
      other =EmphInline= subtypes, =Link=s, etc.).
  **** =EmphItalic= : recursing node
  */
  var EmphItalic = function(parent){
    EmphInline.call(this, parent, "EmphItalic");
    this.recurse = true;
  };
  EmphItalic.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["/"].constr = EmphItalic;
  Markup.EmphItalic = EmphItalic;

  /*orgdoc
  **** =EmphBold= : recursing node
  */
  var EmphBold = function(parent){
    EmphInline.call(this, parent, "EmphBold");
    this.recurse = true;
  };
  EmphBold.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["*"].constr = EmphBold;
  Markup.EmphBold = EmphBold;

  /*orgdoc
  **** =EmphUnderline= : recursing node
  */
  var EmphUnderline = function(parent){
    EmphInline.call(this, parent, "EmphUnderline");
    this.recurse = true;
  };
  EmphUnderline.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["_"].constr = EmphUnderline;
  Markup.EmphUnderline = EmphUnderline;

  /*orgdoc
  **** =EmphStrike= : recursing node
  */
  var EmphStrike = function(parent){
    EmphInline.call(this, parent, "EmphStrike");
    this.recurse = true;
  };
  EmphStrike.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["+"].constr = EmphStrike;
  Markup.EmphStrike = EmphStrike;

  /*orgdoc
  **** =LaTeXInline= : non-recursing node
  */
  var LaTeXInline = function(parent){
    EmphRaw.call(this, parent, "LaTeXInline");
    this.children = null;
  };
  LaTeXInline.prototype = Object.create(EmphRaw.prototype);
  LaTeXInline.prototype.replaceTokens = _U.noop;
  LaTeXInline.prototype.consume = function(content){
    this.content = content;
  };
  Markup.LaTeXInline = LaTeXInline;


  /*orgdoc
  **** =EmphCode= : code example
  */
  var EmphCode = function(parent){
    EmphRaw.call(this, parent, "EmphCode");
    this.children = null;
  };
  EmphCode.prototype = Object.create(EmphRaw.prototype);
  EmphCode.prototype.replaceTokens = _U.noop;
  EmphCode.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphCode = EmphCode;

  /*orgdoc
  **** =EmphVerbatim= : unedited content
  */
  var EmphVerbatim = function(parent){
    EmphRaw.call(this, parent, "EmphVerbatim");
    this.children = null;
  };
  EmphVerbatim.prototype = Object.create(EmphRaw.prototype);
  EmphVerbatim.prototype.replaceTokens = _U.noop;
  EmphVerbatim.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphVerbatim = EmphVerbatim;

  /*orgdoc
  *** Parsing the paragraph content
  */
  Markup.parse = function parse(parent, str){
    str = "" + (str || "");
    var initStr = str;

    /*orgdoc
    **** Replacing code/verbatim parts with unique tokens
         Before dealing with emphasis markup, we replace the code/verbatim parts
         with textual tokens which will be replaced in the end by their
         corresponding tree item. These tokens are stored in the =tokens=
         local variable.
    */
    var tokens = {};
    function uniqToken(p){return _U.getAbsentToken(initStr, p);}

    /*orgdoc
    ***** Replacing \LaTeX inline markup
          These inline items are possibly:
          + enclosed in dollar signs (~\$~)
          + enclosed in backslash-parens (~\\(...\\)~)
          + enclosed in backslash-brackets (~\\[...\\]~)
    */
    var latexTokenPrefix = uniqToken("LATEX");

    function latexToken(){return latexTokenPrefix + _U.incr();}

    function latexReplacer(){
      var t     = latexToken();
      var a     = arguments;
      var latex = new LaTeXInline(parent);
      latex.consume(a[2]);
      tokens[t] = latex;
      return a[1] + t;
    }

    var latexParenRegex   = /(^|[^\\])\\\(([\s\S]*?)\\\)/gm;
    str = str.replace(latexParenRegex, latexReplacer);
    var latexBracketRegex = /(^|[^\\])\\\[([\s\S]*?)\\\]/gm;
    str = str.replace(latexBracketRegex, latexReplacer);
    var latexDollarRegex  = /(^|[^\\])\$([\s\S]*?)\$/gm;
    str = str.replace(latexDollarRegex, latexReplacer);


    /*orgdoc
    ***** Replacing code/verbatim markup
          These inline items are possibly:
          + for code :: enclosed in ~\=~ signs
          + for verbatim :: enclosed in ~\~~ signs
    */
    var codeTokenPrefix = uniqToken("CODE");

    function codeToken(){return codeTokenPrefix + _U.incr();}

    function codeReplacer(){
      var t       = codeToken();
      var a       = arguments;
      var delim   = a[3];
      var constr  = (a[3] === "=") ? EmphCode : EmphVerbatim;
      var code    = new constr(parent);
      // We replace all the escaped delimiters by themselves
      var content = a[4].replace(new RegExp("\\\\" + delim, "g"), delim);
      code.consume(content);
      tokens[t]   = code;
      return a[1] + t;
    }

    var codeRegexp = /(^|[^\\])(([=~])([^\s\\]|[^\s].*?[^\s\\])\3)/gm;
    str = str.replace(codeRegexp, codeReplacer);


    /*orgdoc
    ***** Replacing timestamp markup
          These items are possibly:
          + activated :: ~<yyyy-MM-dd (weekday.)? (hh:mm)?>~
          + deactivated :: ~[yyyy-MM-dd (weekday.)? (hh:mm)?]~
    */
    var timestampTokenPrefix = uniqToken("TIMESTAMP");

    function timestampToken(){return timestampTokenPrefix + _U.incr();}

    function timestampReplacer(activated){
      return function(){
        var t            = timestampToken();
        var a            = arguments;
        var timestamp    = new _U.Timestamp(a[1]);
        var inline       = new TimestampInline(parent, a[1], t);
        inline.activated = activated;
        inline.timestamp = timestamp;
        inline.date      = timestamp.date;
        tokens[t]        = inline;
        return t;
      };
    }

    var timestampRegexAngle  = /<(\d{4}-\d{2}-\d{2}(?: [a-z.]+)?(?: \d{2}:\d{2})?)>/gim;
    str = str.replace(timestampRegexAngle, timestampReplacer(true));
    var timestampRegexSquare = /\[(\d{4}-\d{2}-\d{2}(?: [a-z.]+)?(?: \d{2}:\d{2})?)\]/gim;
    str = str.replace(timestampRegexSquare, timestampReplacer(false));

    /*orgdoc
    ***** Replacing sub/sup markup
          These items are possibly:
          + for sub :: defined by underscore and cury braces (~\_{...}~)
          + for sup :: defined by caret and cury braces (~\^{...}~)
          This behaviour should evolve to deal with the possiblity to skip the
          curly braces. For now, since it may conflict with the underscore
          markup, this part is left for later. Consider the org-option
          ~#+OPTIONS: ^:{}~ to be mandatory.
    */
    var subsupTokenPrefix = uniqToken("SUBSUP");

    function subsupToken(){return subsupTokenPrefix + _U.incr();}

    function subsupReplacer(){
      var t      = subsupToken();
      var a      = arguments;
      var constr = (a[2] === "_") ? SubInline : SupInline;
      tokens[t]  = new constr(parent, a[3], t);
      return a[1] + t;
    }

    var subsupRegexBrace = /([^\s\\])(_|\^)\{([^\}]+?)\}/gm;
    str = str.replace(subsupRegexBrace, subsupReplacer);
    // Repeat the treatment, since a sub followed by a sup are not treated in
    // the previous line...
    str = str.replace(subsupRegexBrace, subsupReplacer);

    /*orgdoc
    ***** Replacing links
    */
    var linkTokenPrefix = uniqToken("LINK");

    function linkToken(){return linkTokenPrefix + _U.incr();}

    function linkReplacer(urlIdx, descIdx){
      return function(){
        var t = linkToken();
        var a = arguments;
        tokens[t] = new Link(parent, a[0], a[urlIdx], a[descIdx], t);
        return t;
      };
    }

    // Whole links with URL and description : [[url:...][Desc of the link]]
    var descLinkRegex = /\[\[((?:.|\s)*?)\]\[((?:.|\s)*?)\]\]/gm;
    str = str.replace(descLinkRegex, linkReplacer(1, 2));

    // Single links with URL only : [[url:...]]
    var singleLinkRegex = /\[\[((?:.|\s)*?)\]\]/gm;
    str = str.replace(descLinkRegex, linkReplacer(1, 1));

    // Treating bare URLs, or URLs without a description attached.
    var urlRegex = new RegExp("(?:" +
                      _C.urlProtocols.join("|") +
                      '):[^\\s),;]+', "gi");
    str = str.replace(urlRegex, linkReplacer(0, 0));

    /*orgdoc
    ***** Replacing footnote definitions
    */
    var refFootnoteRegex = /\[(?:(\d+)|fn:([^:]*)(?::((?:.|\s)+?))?)\]/g;
    str = str.replace(refFootnoteRegex, function(){
      var a    = arguments;
      var raw  = a[0];
      var name = a[2];
      var def  = a[3];
      if(!name){name = a[1];}
      if(!name){name = "anon_" + parent.root().fnNextNum;}
      var t  = linkToken();
      var fn = new FootNoteRef(parent, raw, name, t);
      if(def){
        var root   = parent.root();
        var inline = new EmphInline(root);
        inline.consume(def);
        root.addFootnoteDef(inline, name);
      }
      tokens[t] = fn;
      return t;
    });

    /*orgdoc
    ***** Processing emphasis markup (*bold*, /italic/, etc.)
    */
    var iObj = new EmphInline(parent);
    iObj.consume(str);

    /*orgdoc
    ***** Reinjecting saved tokens
    */
    iObj.replaceTokens(tokens);
    return iObj;
  };


  return Markup;

};
/*orgdoc
* =Org.Content= : the content parser
  This section describes the parser for the actual content within the sections
  of the =org= file.
*/
Org.getContent = function(org, params){
  var _U  = org.Utils;
  var _C  = org.Config;
  var OM = org.Markup;
  var _R = org.Regexps;
  var RLT = _R.lineTypes;

  /*orgdoc
    =Content= is the object returned by this function.
  */
  var Content = {};

  /*orgdoc
  ** Types of lines
    =LineDef= is the object containing line definitions. All lines of the =Org= file
    will be treated sequencially, and their type will determine what to do with it.
    Line types are given an =id= property: a number identifying them.
  */
  var LineDefTestOrder = [
    "BLANK",
    "IGNORED",
    "DLITEM",
    "ULITEM",
    "OLITEM",
    "FNDEF",
    "SEXAMPLE",
    "VERSE",
    "QUOTE",
    "CENTER",
    "EXAMPLE",
    "SRC",
    "HTML",
    "COMMENT"
  ];
  Content.LineDefTestOrder = LineDefTestOrder;
  var LineDef = {
    "BLANK":    {id:"BLANK", rgx: RLT.blank}
  };
  Content.LineDef = LineDef;


  /*orgdoc
    + Function which determines the type from the given line. A minimal caching system is
      provided, since the function will be called several times for the same line, so
      we keep the result of the last call for a given input.
      The function will only compare the line with regexps.
  */
  var lineTypeCache = {line: "", type: LineDef.BLANK.id};
  function getLineType(line){
    // Caching result...
    if(lineTypeCache.line === line){return lineTypeCache.type;}
    lineTypeCache.line = line;
    function cache(type){
      lineTypeCache.type = type;
      return type;
    }
    // First test on a line beginning with a letter,
    // the most common case, to avoid making all the
    // other tests before returning the default.
    if(RLT.letter.exec(line)){
      return cache(LineDef.PARA.id);
    }
    for(var idx in LineDefTestOrder){
      var name = LineDefTestOrder[idx];
      var type = LineDef[name];
      if(type.rgx.exec(line)){
        return cache(name);
      }
    }
    // By default, return PARA if all failed
    return cache(LineDef.PARA.id);
  }


  /*orgdoc
    + Function which determines the level of indentation of a line.
  */
  function getLineIndent(line){
    line = line || "";
    var indent = /^\s*/.exec(line)[0];
    var spaces4tabs = _U.repeat(" ", _C.tabWidth);
    indent = indent.replace(/\t/g, spaces4tabs);
    return indent.length;
  }


  /*orgdoc
  ** Blocks
  */
  function getNewBlock(line, type, parent){
    var constr = LineDef[type].constr || LineDef.PARA.constr;
    return new constr(parent, line);
  }


  /*orgdoc
  *** Container block
      This kind of block is abstract: many other blocks inherit from it, and it will not be used as is.
      It provides functionality for blocks which contain other sub-blocks.
      It contains an array of =children=, containing the children blocks.
  */
  var ContainerBlock = function(parent, nodeType){
    _U.TreeNode.call(this, parent, {"nodeType": nodeType});
    this.parent = parent;
    this.isContainer = true;
  };
  ContainerBlock.prototype = Object.create(_U.TreeNode.prototype);
  ContainerBlock.prototype.finalize = function(){};


  /*orgdoc
  *** Root block
      This block represents the root content under a headline of the document.
      It is the highest container directly under the headline node.
  */
  var RootBlock = function(parent){
    ContainerBlock.call(this, parent, "RootBlock");
  };
  Content.RootBlock = RootBlock;
  RootBlock.prototype = Object.create(ContainerBlock.prototype);
  RootBlock.prototype.accept  = function(line, type){return true;};
  RootBlock.prototype.consume = function(line, type){
    var newtype = getLineType(line);
    var block = getNewBlock(line, newtype, this);
    this.children.push(block);
    return block.consume(line, newtype);
  };


  /*orgdoc
  *** Generic content block
  */
  var ContentBlock = function(parent, nodeType){
    _U.TreeNode.call(this, parent, {"nodeType": nodeType});
    this.isContent = true;
    this.lines = [];
  };
  ContentBlock.prototype = Object.create(_U.TreeNode.prototype);
  ContentBlock.prototype.finalize = function(){};

  /*orgdoc
  *** Generic content with markup block
  */
  var ContentMarkupBlock = function(parent, nodeType){
    ContentBlock.call(this, parent, nodeType);
    this.hasMarkup = true;
  };
  ContentMarkupBlock.prototype = Object.create(ContentBlock.prototype);
  ContentMarkupBlock.prototype.finalize = function(){
    var content = this.lines.join("\n");
    var inline = OM.parse(this, content);
    this.children.push(inline);
  };



  function addBlockType(o){
    var name = o.name;
    var constr = o.constr;

    if(o.proto.parent){
      constr.prototype = o.proto.parent;
      delete o.proto.parent;
    }
    _U.extend(constr.prototype, o.proto);

    Content[name] = o.constr;

    if(o.linedef){
      LineDef[o.linedef.id] = o.linedef;
      LineDef[o.linedef.id].constr = constr;
    }
  }

  /*orgdoc
  *** Paragraph block
  */

  var ParaBlock = function(parent){
    ContentMarkupBlock.call(this, parent, "ParaBlock");
    this.indent = parent.indent || 0;
  };
  LineDef.PARA = {
    id:     "PARA",
    rgx:    RLT.letter,
    constr: ParaBlock
  };
  Content.ParaBlock = ParaBlock;
  ParaBlock.prototype = Object.create(ContentMarkupBlock.prototype);
  ParaBlock.prototype.accept = function(line, type){
    var indent;
    if(type === LineDef.BLANK.id){
      if(this.ended){return true;}
      this.ended = true; return true;
    }
    if(type !== LineDef.PARA.id){return false;}
    if(this.ended){return false;}
    if(this.indent === 0){return true;}
    indent = getLineIndent(line);
    if(indent <= this.indent){
      return false;
    }
    return true;
  };
  ParaBlock.prototype.consume = function(line, type){
    if(type !== LineDef.IGNORED.id){
      this.lines.push(line);
    }
    return this;
  };

  /*orgdoc
  *** Simple example blocks
      These are blocks with lines prepended with a colon:
      : : This is a simple example.
      : : <- here are the colons...
  */
  var SimpleExampleBlock = function (parent) {
    ContentBlock.call(this, parent, "SimpleExampleBlock");
    this.indent = parent.indent || 0;
  }
  LineDef.SEXAMPLE = {
    id:     "SEXAMPLE",
    rgx:    RLT.sexample,
    constr: SimpleExampleBlock
  };
  Content.SimpleExampleBlock = SimpleExampleBlock;
  SimpleExampleBlock.prototype = Object.create(ContentBlock.prototype);
  SimpleExampleBlock.prototype.accept  = function(line, type){
    if(type === LineDef.BLANK.id){
      if(this.ended){return true;}
      this.ended = true; return true;
    }
    if(type !== LineDef.SEXAMPLE.id){return false;}
    if(this.ended){return false;}
    if(this.indent === 0){return true;}
    indent = getLineIndent(line);
    if(indent <= this.indent){
      return false;
    }
    return true;
  };
  SimpleExampleBlock.prototype.consume = function(line, type){
    if(type !== LineDef.IGNORED.id){
      this.lines.push(line.replace(/^\s*: /, ''));
    }
    return this;
  };

  /*orgdoc
  *** Ignored line (starting with a hash)
  */
  var IgnoredLine = function(parent){
    ContentMarkupBlock.call(this, parent, "IgnoredLine");
    this.indent = parent.indent || 0;
    this.firstline = true;
  };
  LineDef.IGNORED = {
    id:     "IGNORED",
    rgx:    RLT.ignored,
    constr: IgnoredLine
  };
  Content.IgnoredLine = IgnoredLine;
  IgnoredLine.prototype = Object.create(ContentBlock.prototype);
  IgnoredLine.prototype.accept = function(line, type){
    if(this.firstLine){
      this.firstLine = false;
      return true;
    }
    if(type === LineDef.BLANK.id){
      return true;
    }
    return false;
  };
  IgnoredLine.prototype.consume = function(line, type){
    if(type !== LineDef.BLANK.id){
      this.content = line.replace(/^\s*#\s+/, "");
    }
    return this;
  };


  /*orgdoc
  *** Footnote definition block
  */
  var FndefBlock = function(parent){
    ContentMarkupBlock.call(this, parent, "FndefBlock");
    this.indent = parent.indent || 0;
    this.firstline = true;
  };
  LineDef.FNDEF = {
    id:     "FNDEF",
    rgx:    RLT.fndef,
    constr: FndefBlock
  };
  Content.FndefBlock = FndefBlock;
  FndefBlock.prototype = Object.create(ContentMarkupBlock.prototype);
  FndefBlock.prototype.accept = function(line, type){
    var indent;
    if(type === LineDef.FNDEF.id){
      if(this.ended){return false;}
      return true;
    }
    if(type === LineDef.BLANK.id){
      if(this.ended){ return true; }
      this.ended = true; return true;
    }
    if(this.ended){ return false; }
    return true;
  };
  FndefBlock.prototype.consume = function(line, type){
    if(this.firstline){
      this.name = /^\s*\[(.*?)\]/.exec(line)[1].replace(/^fn:/, '');
      this.firstline = false;
    }
    if(type !== LineDef.IGNORED.id){
      this.lines.push(line);
    }
    return this;
  };
  FndefBlock.prototype.finalize = function(line){
    var root = this.root();
    var content = this.lines.join("\n");
    content = content.replace(/^(\s*)\[.*?\]/, "$1");
    var inline = OM.parse(this, content);
    root.addFootnoteDef(inline, this.name);
  };


  /*orgdoc
  *** Generic Begin/End block
  */
  var BeginEndBlock = function(parent, line, type, nodeType){
    ContentBlock.call(this, parent, nodeType);
    this.indent = getLineIndent(line);
    this.ended = false;
    this.beginre = RLT.beginBlock(type);
    this.endre   = RLT.endBlock(type);
  };
  BeginEndBlock.prototype = Object.create(ContentBlock.prototype);
  BeginEndBlock.prototype.accept      = function(){return !this.ended;};
  BeginEndBlock.prototype.treatBegin  = function(){};
  BeginEndBlock.prototype.consume     = function(line, type){
    if(this.beginre.exec(line)){ this.treatBegin(line); }
    else if(this.endre.exec(line)){ this.ended = true; }
    else {
      if(this.verbatim){
        this.lines.push(line);
      } else {
        if(type !== LineDef.IGNORED.id){
          this.lines.push(line);
        }
      }
    }
    return this;
  };

  /*orgdoc
  *** Quote block
  */
  var QuoteBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "QUOTE", "QuoteBlock");
  };
  LineDef.QUOTE = {
    id:       "QUOTE",
    beginEnd: 1,
    rgx:      RLT.beginBlock("QUOTE"),
    constr:   QuoteBlock
  };
  Content.QuoteBlock = QuoteBlock;
  QuoteBlock.prototype = Object.create(BeginEndBlock.prototype);
  QuoteBlock.prototype.finalize = function () {
    var lastLine = this.lines.pop();
    var m;
    if(lastLine && (m = lastLine.match(/^\s*--\s+(.*)\s*$/))) {
      this.signature = OM.parse(this, m[1]);
    } else {
      this.lines.push(lastLine);
    }
    var content = this.lines.join("\n");
    var inline = OM.parse(this, content);
    this.children.push(inline);
  };

  /*orgdoc
  *** Verse block
  */
  var VerseBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "VERSE", "VerseBlock");
  };
  LineDef.VERSE = {
    id:       "VERSE",
    beginEnd: 1,
    rgx:      RLT.beginBlock("VERSE"),
    constr:   VerseBlock
  };
  Content.VerseBlock = VerseBlock;
  VerseBlock.prototype = Object.create(BeginEndBlock.prototype);
  VerseBlock.prototype.finalize = QuoteBlock.prototype.finalize;

  /*orgdoc
  *** Centered-text block
  */
  var CenterBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "CENTER", "CenterBlock");
  };
  LineDef.CENTER = {
    id:       "CENTER",
    beginEnd: 1,
    rgx:      RLT.beginBlock("CENTER"),
    constr:   CenterBlock
  };
  Content.CenterBlock = CenterBlock;
  CenterBlock.prototype = Object.create(BeginEndBlock.prototype);
  CenterBlock.prototype.finalize = ContentMarkupBlock.prototype.finalize;


  /*orgdoc
  *** Example block
  */
  var ExampleBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "EXAMPLE", "ExampleBlock");
    this.verbatim = true;
  };
  LineDef.EXAMPLE = {
    id:       "EXAMPLE",
    beginEnd: 1,
    rgx:      RLT.beginBlock("EXAMPLE"),
    constr:   ExampleBlock
  };
  Content.ExampleBlock = ExampleBlock;
  ExampleBlock.prototype = Object.create(BeginEndBlock.prototype);


  /*orgdoc
  *** Source code block
  */
  var SrcBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "SRC", "SrcBlock");
    this.verbatim = true;
    var match = /BEGIN_SRC\s+([a-z\-]+)(?:\s*|$)/i.exec(line);
    this.language = match ? match[1] : null;
  };
  LineDef.SRC = {
    id:       "SRC",
    beginEnd: 1,
    rgx:      RLT.beginBlock("SRC"),
    constr:   SrcBlock
  };
  Content.SrcBlock = SrcBlock;
  SrcBlock.prototype = Object.create(BeginEndBlock.prototype);


  /*orgdoc
  *** HTML block
  */
  var HtmlBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "HTML", "HtmlBlock");
    this.verbatim = true;
  };
  LineDef.HTML = {
    id:       "HTML",
    beginEnd: 1,
    rgx:      RLT.beginBlock("HTML"),
    constr:   HtmlBlock
  };
  Content.HtmlBlock = HtmlBlock;
  HtmlBlock.prototype = Object.create(BeginEndBlock.prototype);


  /*orgdoc
  *** Comment block
  */
  var CommentBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "COMMENT", "CommentBlock");
    this.verbatim = true;
  };
  LineDef.COMMENT = {
    id:       "COMMENT",
    beginEnd: 1,
    rgx:      RLT.beginBlock("COMMENT"),
    constr:   CommentBlock
  };
  Content.CommentBlock = CommentBlock;
  CommentBlock.prototype = Object.create(BeginEndBlock.prototype);


  /*orgdoc
  *** Generic List Item block
  */
  var ListItemBlock = function(parent, line, nodeType){
    ContainerBlock.call(this, parent, nodeType);
    this.indent = parent.indent;
  };
  ListItemBlock.prototype = Object.create(ContainerBlock.prototype);
  ListItemBlock.prototype.accept  = function(line, type){
    var isMoreIndented = getLineIndent(line) > this.indent;
    return isMoreIndented;
  };
  ListItemBlock.prototype.consume = function(line, type){
    var block;
    if(this.children.length === 0){
      line = this.preprocess(line);
    }
    var newtype = getLineType(line);
    block = getNewBlock(line, newtype, this);
    this.children.push(block);
    return block.consume(line, newtype);
  };


  /*orgdoc
  *** Unordered List block
      A new list block is created when we encounter a list item line.
      The logic would be that a list item be created instead, but the list item
      needs a list block container. So that's actually a list block that the
      line triggers, and the block is in charge to create a first list item child,
      and to consume all the other items.
  */
  var UlistBlock = function(parent, line){
    ContainerBlock.call(this, parent, "UlistBlock");
    this.indent = getLineIndent(line);
  };
  LineDef.ULITEM = {
    id:     "ULITEM",
    rgx:    RLT.ulitem,
    constr: UlistBlock
  };
  Content.UlistBlock = UlistBlock;
  UlistBlock.prototype = Object.create(ContainerBlock.prototype);
  UlistBlock.prototype.accept  = function(line, type){
    return type === LineDef.ULITEM.id &&
      getLineIndent(line) === this.indent;
  };
  UlistBlock.prototype.consume = function(line, type){
    var item = new UlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line, type);
  };


  /*orgdoc
  *** Unoredered List Item block
  */
  var UlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent, line, "UlistItemBlock");
  };
  Content.UlistItemBlock = UlistItemBlock;
  UlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  UlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*)[+*\-] /, "$1  ");
  };


  /*orgdoc
  *** Ordered List block
  */
  var OlistBlock = function(parent, line){
    ContainerBlock.call(this, parent, "OlistBlock");
    this.indent = getLineIndent(line);
    var match = /^\s*\d+[.)]\s+\[@(\d+)\]/.exec(line);
    this.start = match ? +(match[1]) : 1;
  };
  LineDef.OLITEM = {
    id:     "OLITEM",
    rgx:    RLT.olitem,
    constr: OlistBlock
  };
  Content.OlistBlock = OlistBlock;
  OlistBlock.prototype = Object.create(ContainerBlock.prototype);
  OlistBlock.prototype.accept  = function(line, type){
    return type === LineDef.OLITEM.id &&
      getLineIndent(line) === this.indent;
  };
  OlistBlock.prototype.consume = function(line, type){
    var item = new OlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line, type);
  };


  /*orgdoc
  *** Ordered list item block
  */
  var OlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent, line, "OlistItemBlock");
    var match = /^\s*(\d+)[.)] /.exec(line);
    this.number = match ? +(match[1]) : 1;
  };
  Content.OlistItemBlock = OlistItemBlock;
  OlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  OlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*)\d+[.)](?:\s+\[@\d+\])? /, "$1  ");
  };


  /*orgdoc
  *** Definition List block
  */
  var DlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.nodeType = "DlistBlock";
    this.indent = getLineIndent(line);
  };
  LineDef.DLITEM = {
    id:     "DLITEM",
    rgx:    RLT.dlitem,
    constr: DlistBlock
  };
  Content.DlistBlock = DlistBlock;
  DlistBlock.prototype = Object.create(ContainerBlock.prototype);
  DlistBlock.prototype.accept  = function(line, type){
    return type === LineDef.DLITEM.id &&
      getLineIndent(line) === this.indent;
  };
  DlistBlock.prototype.consume = function(line, type){
    var item = new DlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line, type);
  };


  /*orgdoc
  *** DlistItem block
  */
  var DlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent, line, "DlistItemBlock");
    var title = (RLT.dlitem).exec(line)[1];
    this.titleInline = OM.parse(this, title);
  };
  Content.DlistItemBlock = DlistItemBlock;
  DlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  DlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*).*?::/, "$1  ");
  };


  /*orgdoc
  ** Parsing the content
  */
  Content.parse = function(parent, lines){
    var root = new RootBlock(parent);
    var current = root;
    var line = lines.shift();
    // Ignore first blank lines...
    var type;
    while(line !== undefined && (type = getLineType(line)) === LineDef.BLANK.id){
      line = lines.shift();
    }
    while(line !== undefined){
      type = getLineType(line);
      while(current){
        if(current.accept(line, type)){
          current = current.consume(line, type);
          break;
        } else {
          current.finalize();
          current = current.parent;
        }
      }
      line = lines.shift();
    }
    if(current){current.finalize();}
    return root;
  };
  return Content;
};
/*orgdoc

* =Org.Outline= : the outline/headlines parser

  This section describes the outline parser.
*/

Org.getOutline = function(org, params){

  var _P = params;
  var _R = org.Regexps;
  var OC = org.Content;
  var OM = org.Markup;
  var _U = org.Utils;

  /*orgdoc
  ** =Node=
     Objects representing the headlines and their associated content
     (including sub-nodes)
  */
  var Node = function(whole, params){
    params          = params || {};
    
    _U.TreeNode.call(this, params.parent, {"nodeType": "Node"});

    this.docid      = params.docid;
    
    this.whole      = whole;
    this.parser     = new NodeParser(this, this.whole);
    this.heading    = this.parser.getHeading();
    this.level      = params.level || (this.heading.getStars() || "").length;
    
    this.properties = this.parser.getProperties();
    this.meta       = this.parser.getMeta();
    this.content    = this.parser.getContent();

  };

  /*orgdoc
  *** =Node.tocnum=
     Counting the documents generated in this page.
     Helps to generate an ID for the nodes
     when no docid is given in the root node.
  */
  Node.tocnum = 0;

  /*orgdoc
  *** =Node.prototype=
  */
  Node.prototype = _U.merge(_U.TreeNode.prototype, {
    /*orgdoc
         + =parseContent()=
    */
    parseContent: function(){
      var lines = _U.lines(this.content);
      var child = OC.parse(this, lines);
      this.prepend(child);
    },

    /*orgdoc
         + =repr()= provides a representation of the node's path
    */
    repr: function(){
      if (!this.parent){
        return this.docid || "doc#" + (Node.tocnum++) + "/";
      }
      return this.parent.repr() + "" + this.siblingsAll().indexOf(this) + "/";
    },

    /*orgdoc
         + =addFootnoteDef=
    */
    addFootnoteDef: function(inline, name){
      if(this.fnByName === void(0)){
        this.fnByName    = {};
        this.fnNameByNum = [];
        this.fnNextNum   = 1;
      }
      if(!name){name = "" + this.fnNextNum;}
      if(this.fnByName[name]){
        this.fnByName[name].inline = inline;
        return this.fnNextNum;
      }
      else {
        this.fnByName[name] = {"inline": inline, "num": this.fnNextNum, "name": name};
        this.fnNameByNum[this.fnNextNum] = name;
        this.fnNextNum = this.fnNextNum + 1;
        return this.fnNextNum - 1;
      }
    }
  });


  /*orgdoc
  ** Parsing nodes
  *** =Headline= 
      Headline embeds the parsing of a heading line (without the subcontent).
   */
  var Headline = function(node, txt){
    this.parent = node;
    this.nodeType = "Headline";
    this.repr = _U.trim(txt);
    this.match = _R.headingLine.exec(this.repr) || [];
    this.titleNode = OM.parse(this, this.getTitle());
  };

  Headline.prototype = {
    getStars: function(){
      return this.match[1] || "";
    },
    getTodo: function(){
      return this.match[2] || "";
    },
    getPriority: function(){
      return this.match[3] || "";
    },
    getTitle: function(){
      return this.match[4] || "";
    },
    getTags: function(){
      var tags = this.match[5];
      return tags ? tags.split(":") : [];
    }
  };

  /*orgdoc
  ** =NodeParser=
     Parsing a whole section
   */
  var NodeParser = function(node, txt){
    this.node = node;
    this.content = txt;
  };

  NodeParser.prototype = {
    /*orgdoc
       + Returns the heading object for this node
     */
    getHeading: function(){
      if(this.heading){return this.heading;}
      var firstLine = _U.firstLine(this.content);
      this.heading  = new Headline(this.node, firstLine);
      return this.heading;
    },

    /*orgdoc
       + Returns the map of headers (defined by "#+META: ..." line definitions)
     */
    getMeta: function(){
      if(this.meta){return this.meta;}
      var content = this.content;
      if(this.level > 0){content = content.replace(_R.headingLine, "\n");}
      var meta = this.parseHeaders(content);
      this.meta = meta;
      return this.meta;
    },

    /*orgdoc
       + Returns the properties as defined in the :PROPERTIES: field
     */
    getProperties: function(){
      if(this.props){return this.props;}
      var content = this.content;
      content = content.replace(_R.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      content = content.split(subHeadingStars)[0];
      var props = this.props = {};
      var propMatch = _R.propertySection.exec(content);
      if(!propMatch){return this.props;}
      var propLines = _U.lines(propMatch[1]);
      _U.each(propLines, function(line, idx){
        var match = _R.propertyLine.exec(line);
        if(!match){return 1;} // continue
        // Properties may be defined on several lines ; concatenate the values if needed
        props[match[1]] = props[match[1]] ? props[match[1]] + " " + match[2] : match[2];
      });
      this.props = props;
      return this.props;
    },

    /*orgdoc
       + Returns the whole content without the heading nor the subitems
     */
    getItem: function(){
      if(this.item){return this.item;}
      var content = this.content;
      content = content.replace(_R.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      //_U.log(subHeadingStars);
      content = content.split(subHeadingStars)[0];
      this.item = content;
      return content;
    },

    /*orgdoc
       + Returns the content only : no heading, no properties, no subitems, no clock, etc.
     */
    getContent: function(){
      if(this.text){return this.text;}
      var content = this.getItem();
      content = this.removeHeaders(content);
      content = content.replace(_R.propertySection, "");
      content = content.replace(_R.scheduled, "");
      content = content.replace(_R.deadline, "");
      content = content.replace(_R.clockSection, "");
      content = content.replace(_R.clockLine, "");
      this.text = content;
      return content;
    },

    /*orgdoc
       + Extracts all the ""#+HEADER: Content" lines
     * at the beginning of the given text, and returns a map
     * of HEADER => Content
     */
    parseHeaders: function(txt){
      var result = {};
      var lines = txt.split(_R.newline);
      _U.each(lines, function(line, idx){
        if(_U.blank(line)){return true;}
        if(!line.match(_R.metaDeclaration)){return false;} // we went ahead the headers : break the loop
        var match = _R.metaLine.exec(line);
        if (match){
          if(result[match[1]]){
            result[match[1]] = result[match[1]] + "\n" + match[2];
          } else {
            result[match[1]] = match[2];
          }
        }
        return true;
      });
      return result;
    },

    /*orgdoc
       + Returns the given text without the "#+HEADER: Content" lines at the beginning
     */
    removeHeaders: function(txt){
      var result = "";
      var lines  = txt.split(_R.newline);
      var header = true;
      _U.each(lines, function(line, idx){
        if(header && _U.blank(line)){return;}
        if(header && line.match(_R.metaDeclaration)){return;}
        header = false;
        result += "\n" + line;
      });
      return result;
    }
  };

  /*orgdoc
  ** The returned object
  */
  var Outline = {
    Node:       Node,
    Headline:   Headline,
    NodeParser: NodeParser
  };

  return Outline;

};
/*orgdoc

* =Org.Parser= : the general parser

  This section describes the general =Org= document parser.
*/

Org.getParser = function(org, params){

  var _P = params;
  var _R = org.Regexps;
  var OC = org.Content;
  var _U = org.Utils;
  var OO = org.Outline;

  /*orgdoc
  ** =Parser= : the object to be returned by =Org.getParser=
     The parser creates a tree of =Org= =Node=s. It includes
     the referenced external files and generates a tree of nodes,
     each of them recursively parsed with the =Content= parser.
  */
  var Parser = function(txt, location){
    this.txt = txt;
    this.location = location || "";
    this.includes = true;
  };
  Parser.prototype = {
    /**
     * Creates a list of all the org-node contents
     */
    nodeTextList: function(text){
      var content = text;
      return _U.map(
        content.split(/^\*/m),
        function(t, idx){
          return idx === 0 ? "\n" + t : "*" + t;
        }
      );
    },

    /**
     * Creates a list of all the org-node contents
     */
    nodeList: function(text){
      return _U.map( this.nodeTextList(text) ,
        function(t, idx){ return new OO.Node(t); }
      );
    },

    followIncludes: function(txt){
      var rgx = /^[\t ]*#\+INCLUDE:[^\n]+$/mg;
      var basepath = _U.path.parent(this.location);
      var replacefn = function(m){
        var inc = new Include(m, basepath);
        return inc.render();
      };
      return txt.replace(rgx, replacefn);
    },

    buildTree: function(){
      var txt = this.txt;
      if(this.includes){
        txt = this.followIncludes(txt);
      }
      var nodes  = this.nodeList(txt);
      var root   = nodes[0];
      var length = nodes.length;
      var done, i, j, level;
      for(i = 1; i < length ; i++){
        level = nodes[i].level;
        done  = false;
        j     = i;
        while(!done){
          j = j - 1;
          if(j < 0){break;}
          if(nodes[j].level < level){
            nodes[j].append(nodes[i]);
            done = true;
          }
        }
      }
      for(i = 0; i < length ; i++){
        nodes[i].parseContent();
      }
      return root;
    }
  };

  Parser.parse = function(txt, location){
    var parser = new Parser(txt, location);
    return parser.buildTree();
  };

  /*orgdoc
  ** Including external files
     This section deals with the =#\+INCLUDE:= tags, which allow to load another
     =Org= file into the current file.

     There are basically two strategies to include a file: 
     - ~HTTP GET~ :: if we detect that
       we're in a browser with jQuery, we use that to get the content from the
       included file with a GET request to the server, using the path in the include
       tag as a relative path to the current file being processed.
     - File system read :: if we detect that we're in Node.js (presence 
       of the 'fs' module), we read the file having a relative path to the current
       =Org= file given in the include tag.
     This behaviour is not coded here, though, it relies on the behaviour of the
     =_U.get()= function.

  *** =Include= object
  */
  var Include = function(line, basepath){
    this.basepath = basepath;
    this.line     = line;
    this.beginend = false;
    this.prefix   = "";
    this.prefix1  = "";
    this.limitMin = 0;
    this.limitMax = Infinity;
    this.parse(line, basepath);
  };

  /*orgdoc
  *** Parsing the include lines
  */
  Include.prototype.parse = function(line, basepath){
    var match = /#\+INCLUDE:\s+"([^"]+)"(?:\s+(example|quote|src))?/m.exec(line) || [];

    this.indent   = /^\s*/.exec(line)[0] || "";
    this.relPath  = match[1] || "";
    this.location = _U.path.concat(basepath, this.relPath);
    this.beginend = match[2];
    
    if(this.beginend === "src"){
      this.srcType = (/\ssrc\s+([^:\s]+)/.exec(line) || [])[1];
    }

    match = line.match(/:prefix\s+"([^"]+)"/);
    if(match){this.prefix   = match[1];}
    match = line.match(/:prefix1\s+"([^"]+)"/);
    if(match){this.prefix1  = match[1];}
    match = line.match(/:minlevel\s+("?)(\d+)\1/);
    if(match){this.minlevel = match[2];}
    match = line.match(/:lines\s+"(\d*-\d*)"/);
    if(match){
      this.limit = match[1];
      if(this.limit.match(/^\d*-\d*$/)){
        limitNum = this.limit.match(/^\d+/);
        if(limitNum){
          this.limitMin = +(limitNum[0]) - 1;
        }
        limitNum = this.limit.match(/\d+$/);
        if(limitNum){
          this.limitMax = +(limitNum[0]);
        }
      }
    }
  };

  /*orgdoc
  *** Rendering the included content
  */
  Include.prototype.render = function(){
    /*orgdoc
        + Loading the content from the location
    */
    var content = _U.get(this.location);

    /*orgdoc
        + Modifying the headlines levels (if =:minlevel= has been set)
    */
    if(this.minlevel && !this.beginend){
      var minfound = 1000;
      var headlineRgx = /^\*+(?=\s)/mg;
      var foundstars = content.match(headlineRgx);
      _U.each(foundstars, function(v){
        minfound = Math.min(minfound, v.length);
      });
      if(this.minlevel > minfound){
        var starsToAppend = _U.repeat("*", this.minlevel - minfound);
        content = content.replace(headlineRgx, function(m){
          return starsToAppend + m;
        });
      }
    }

    /*orgdoc
        + Generating the included content from the fetched lines
    */
    var lines = content.split(/\n/);
    var result = "";
    var indent = this.indent;
    var first = true;
    var _this = this;
    _U.each(lines, function(v, idx){
      if(idx < _this.limitMin || idx > _this.limitMax + 1){return;}
      result += (_this.beginend ? indent : "") +
                (first ? (_this.prefix1 ? _this.prefix1 : _this.prefix) : _this.prefix) +
                v +
                "\n";
      if(first){first = false;}
    });

    /*orgdoc
        + Enclosing in a =BEGIN/END= block if needed
    */
    if(this.beginend === "src"){
      var begin = indent + "#+BEGIN_SRC ";
      if(this.srcType){begin += this.srcType + " ";}
      begin += "\n";
      result = begin + result + indent+ "#+END_SRC\n";
    } else if(this.beginend === "example"){
      result = indent + "#+BEGIN_EXAMPLE \n" + result + indent + "#+END_EXAMPLE\n";
    } else if(this.beginend === "quote"){
      result = indent + "#+BEGIN_QUOTE \n" + result + indent + "#+END_QUOTE\n";
    }

    return result;
  };


  return Parser;

};
/*orgdoc
* Default Rendering

  This section provides a default HTML renderer for the parsed tree.

  It is intended to provide an example of how to attach rendering
  functions to the =Outline.Node='s and the different
  =Content.Block='s prototypes.

** Initialisations
    Working in the context of the =Org= object. We will need, as
    usual, some shortcuts to the =Utils=, and to =Org.Content= and
    =Org.Outline=.
*/

Org.getRenderers = function(org){
  var OC = org.Content;
  var OM = org.Markup;
  var OO = org.Outline;
  var _U = org.Utils;

  var DefaultRenderer = {
    /*orgdoc
    *** =renderChildren=                                               :function:
         + Purpose :: provides a utility function to render all the
                      children of a =Node= or a =Block=.
         + Arguments :: node, renderer
         + Usage :: must be called with =.call(obj)= to provide the value
                    for =this=. =this= must have an enumerable =children=
                    property.
    */
    renderChildren: function(n, r){
      var i, out = "";
      var arr = n.children;
      if((typeof arr) === "function"){
        arr = arr();
      }
      _U.each(arr, function(v){
        out += r.render(v, r);
      });
      return out;
    },

    /*orgdoc
    *** =render=                                               :function:
         + Purpose :: provides a utility function to renders a node with the given
                      renderer
         + Arguments :: node, renderer
    */
    render: function(n, r){
      r = r || this;
      var type = n.nodeType;
      var renderFn = r[type];
      var indent = n.ancestors().length;
      if(!renderFn){
        _U.log("Not found render fn:");
        _U.log(n);
        renderFn = _U.noop;
      }
      return renderFn(n, r);
    }
  };


  var StructRenderer = function(){
    return {
      escapeHtml: function(str){
        str = "" + str;
        str = str.replace(/&/g, "&amp;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/'/g, "&apos;");
        str = str.replace(/"/g, "&quot;");
        return str;
      },

      renderChildren: function(n, r){
        var i, out = "";
        var arr = n.children;
        if((typeof arr) === "function"){
          arr = arr();
        }
        _U.each(arr, function(v){
          out += r.render(v, r);
        });
        return out;
      },

      render: function(n, r){
        r = r || this;
        var type = n.nodeType;
        var renderFn = r[type];
        var indent = n.ancestors().length;
        var tag = "div";
        if(n.nodeType.match(/^Emph|Inline$/)){tag = "span";}
        if(n.nodeType.match(/^Node$/)){tag = "section";}
        return "<" + tag + " class='org-struct " + n.nodeType + "'>" + n.nodeType +
          (n.content ? " " + r.escapeHtml(n.content) : "") +
          (n.children ? " " + r.renderChildren(n,r) : "") +
          "</" + tag + ">";
      }
    };
  };

  var DefaultOrgRenderer = function(){
    var surroundContent = function (b, e) {
      if (e === void 0) { e = b; }
      return function(n, r){ return b + n.content + e; };
    };
    var surroundChildren = function (b, e) {
      if (e === void 0) { e = b; }
      return function(n, r){ return b + r.renderChildren(n, r) + e; };
    };

    var renderer = {
      /*orgdoc
      ** Rendering inline items
      *** =IgnoredLine=
      */
      IgnoredLine: surroundContent("\n# ", ""),

      /*orgdoc
      *** =EmphInline=
          Should not be used, EmphInline is abstract...
      */
      EmphInline: function(n, r){
        if(n.children.length){
          return r.renderChildren(n, r);
        }
        return "";
      },
      
      /*orgdoc
      *** =EmphRaw=
      */
      EmphRaw: function(n, r){
        if(n.children && n.children.length){
          return r.renderChildren(n, r);
        }
        return n.content;
      },

      /*orgdoc
      *** =EmphCode=
      */
      EmphCode: surroundContent('='),
      
      /*orgdoc
      *** =EmphVerbatim=
      */
      EmphVerbatim: surroundContent('~'),

      /*orgdoc
      *** =EmphItalic=
      */
      EmphItalic: surroundChildren('/'),

      /*orgdoc
      *** =EmphBold=
      */
      EmphBold: surroundChildren('*'),

      /*orgdoc
      *** =EmphUnderline=
      */
      EmphUnderline: surroundChildren('_'),

      /*orgdoc
      *** =EmphStrike=
      */
      EmphStrike: surroundChildren('+'),
      
      /*orgdoc
      *** =LaTeXInline=
      */
      LaTeXInline: surroundContent('$'),

      /*orgdoc
      *** =Link=
      */
      Link: function(n, r){
        return "[[" + r.render(n.desc) + "][" + n.url + "]]";
      },

      /*orgdoc
      *** =FootNoteRef=
      */
      FootNoteRef: function(n, r){
        var root = n.root();
        var footnote = root.fnByName[n.name];
        var num = 0;
        if(footnote){num = footnote.num;}
        return "[fn:" + n.name + "]";
      },

      /*orgdoc
      *** =SubInline=
      */
      SubInline: surroundContent('_{', '}'),

      /*orgdoc
      *** =SupInline=
      */
      SupInline: surroundContent('^{', '}'),

      /*orgdoc
      *** =TimestampInline=
      */
      TimestampInline: function(n, r){
        var ts     = n.timestamp;
        return "<<" + ts.format("%y-%m-%d %H:%M") + ">>";
      },

      /*orgdoc
      ** Rendering blocks
         This sections contains the code for the different types of
         instanciable blocks defined in

         We will attach a, until now undefined, =render= property to these
         block prototypes. None of these function take any argument, all
         the information they need being in the block object they will act
         upon through the =this= value.

         The container blocks (those whose constructor calls the
         =ContainerBlock= constructor) all use the =renderChildren=
         function.

         The content blocks (those whose constructor calls the
         =ContentBlock= constructor) should use their =this.lines=
         array.

      *** Rendering =RootBlock=
           =RootBlock=s are rendered with a =div= tag, with class
           =org_content=.
      */
      RootBlock: surroundChildren(''),

      /*orgdoc
      *** Rendering =UlistBlock=
           =UlistBlock=s are rendered with a simple =ul= tag.
      */
      UlistBlock: surroundChildren(''),

      /*orgdoc
      *** Rendering =OlistBlock=
           =OlistBlock=s are rendered with a simple =ol= tag.

           If the block has a =start= property different from =1=, it is
           inserted in the =start= attribute of the tag.
      */
      OlistBlock: surroundChildren(''),

      /*orgdoc
      *** Rendering =DlistBlock=
           =DlistBlock=s are rendered with a =dl= tag.

           =DlistItemBlock=s will have to use =dt=/=dd= structure
           accordingly.
      */
      DlistBlock: surroundChildren(''),

      /*orgdoc
      *** Rendering =UlistItemBlock= and =OlistItemBlocks=
           =UlistItemBlock=s and =0listItemBlocks= are rendered with a
           #simple =li= tag.
      */
      UlistItemBlock: function(n, r){
        var out = "\n + ";
        out += r.renderChildren(n, r);
        return out;
      },

      OlistItemBlock: function(n, r){
        var out = "\n " + n.number + ") ";
        out += r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =DlistItemBlock=
           =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

           The content of the =dt= is the =title= attribute of the block.

           The content of the =dd= is the rendering of this block's children.
      */
      DlistItemBlock: function(n, r){
        var out = "\n  + " + r.render(n.titleInline, r) + " :: ";
        out += r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =ParaBlock=
           =ParaBlock=s are rendered with a =p= tag.

           The content of the tag is the concatenation of this block's
           =this.lines=, passed to the =renderMarkup= function.
      */
      ParaBlock: function(n, r){
        var indent = n.ancestors().length;
        var content = r.renderChildren(n, r);
        content = _U.fillParagraph(content, 70);
        content = _U.indent(content, indent);
        return content + "\n";
      },

      /*orgdoc
      *** Rendering =VerseBlock=
           =VerseBlock=s are rendered with a =p= tag, with class
           =verse=.

           All spaces are converted to unbreakable spaces.

           All new lines are replaced by a =br= tag.
      */
      VerseBlock: function(n, r){
        var out = "\n#+BEGIN_VERSE\n" + r.renderChildren(n, r) + "\n#+END_VERSE\n";
        return out;
      },

      /*orgdoc
      *** Rendering =QuoteBlock=
           =QuoteBlock=s are rendered with a =blockquote= tag.

           If the quote contains an author declaration (after a double dash),
           this declaration is put on a new line.
      */
      QuoteBlock: function(n, r){
        var out = "\n#+BEGIN_QUOTE\n" + r.renderChildren(n, r) + "\n#+END_QUOTE\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CenterBlock=
           =CenterBlock=s are rendered with a simple =center= tag.
      */
      CenterBlock: function(n, r){
        var out = "\n#+BEGIN_CENTER\n" + r.renderChildren(n, r) + "\n#+END_CENTER\n";
      },

      /*orgdoc
      *** Rendering =ExampleBlock=
           =ExampleBlock=s are rendered with a simple =pre= tag.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_EXAMPLE\n" + content + "\n#+END_EXAMPLE\n";
        return out;
      },

      SimpleExampleBlock: function(n, r){
        var lines = _U.map(n.lines, function (l) {return ': ' + l;});
        var content = lines.join("\n") + "\n";
        var out = content;
        return out;
      },

      /*orgdoc
      *** Rendering =SrcBlock=
           =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
           The =code= tag may have a class attribute if the language of the
           block is known. In case there is, the class would take the language
           identifier.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      SrcBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_SRC\n" + content + "\n#+END_SRC\n";
        return out;
      },

      /*orgdoc
      *** Rendering =HtmlBlock=
           =HtmlBlock=s are rendered by simply outputting the HTML content
           verbatim, with no modification whatsoever.
      */
      HtmlBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_HTML\n" + content + "\n#+END_HTML\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CommentBlock=
           =CommentBlock=s are ignored.
      */
      FndefBlock: function(n, r){
        return "[fn:" + n.name + "] " + n.lines.join("\n");
      },

      CommentBlock : function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_COMMENT\n" + content + "\n#+END_COMMENT\n";
        return out;
      },


      /*orgdoc
      ** Rendering headlines

          Here we render headlines, represented by =Outline.Node= objects.

          A =section= tag is used, with class orgnode, and a level.
          The =id= attribute is the computed id corresponding to a unique TOC
          identifier.

          The title is in a =div.title= element. Each tag is represented at the
          end of this element by a =span.tag= element.

          The content of the node (the RootBlock associated to this headline)
          is rendered.

          Then the subheadlines are rendered using the =renderChildren= function.
      */
      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headtpl = "\n%STARS% %TODO%%PRIOR%%TITLE% %TAGS%";

        var stars = _U.repeat('*', n.level);
        headtpl = headtpl.replace(/%STARS%/, stars);

        var todo = n.heading.getTodo();
        headtpl = headtpl.replace(/%TODO%/, todo?todo + " ":"");

        if( n.heading.getPriority()){
          var prior = "[#" + n.heading.getPriority() + "] ";
          headtpl = headtpl.replace(/%PRIOR%/, prior);
        }
        else {
          headtpl = headtpl.replace(/%PRIOR%/, "");
        }
        
        var title = n.heading.getTitle();
        headtpl = headtpl.replace(/%TITLE%/, title);

        if(n.heading.getTags().length > 0){
          var tags = ":";
          _U.each(n.heading.getTags(), function(tag, idx){
            if(tag.length){
              tags += tag + ":";
            }
          });
          headtpl = headtpl.replace(/%TAGS%/, tags);
        } else {
          headtpl = headtpl.replace(/%TAGS%/, "");
        }

        return headtpl + r.renderChildren(n, r) + "\n";
      }
    };
    return _U.merge(renderer, DefaultRenderer);
  };

  var DefaultJsObjRenderer = function () {

    var typedContent = function (t) {
      return function(n, r){ return { "type":t, "content": n.content }; };
    };
    var typedChildren = function (t) {
      return function(n, r){ return { "type":t, "children": r.yield(n) }; };
    };

    return {

      yield: function (n) {
        var i, out = [];
        for(i in n.children){
          out.push(this.render(n.children[i]));
        }
        return out;
      },

      render: function(n){
        var type = n.nodeType;
        var renderFn = this[type];
        if(!renderFn){
          _U.log("Not found render fn:");
          _U.log(n);
          renderFn = _U.noop;
        }
        return renderFn(n, this);
      },

      EmphInline: typedChildren('inline'),

      EmphRaw: function(n, r){
        if(n.children.length){
          return r.EmphInline(n,r);
        }
        return {
          "type":"raw", 
          "content": n.content
        };
      },

      EmphCode: typedContent('code'),
      EmphVerbatim: typedContent('verbatim'),
      EmphItalic: typedChildren('italic'),
      EmphBold: typedChildren('bold'),
      EmphUnderline: typedChildren('underline'),
      EmphStrike: typedChildren('strike'),

      Link: function(n, r){
        return {
          "type":"link",
          "content": r.render(n.desc),
          "url": n.url
        };
      },

      FootNoteRef: function(n, r){
        var root = _U.root(n);
        var num = (root.fnByName[n.name] || {}).num;
        return {
          "type": "fnref",  
          "name": n.name,
          "num": num
        };
      },

      RootBlock: typedChildren('block'),
      UlistBlock: typedChildren('ulist'),

      OlistBlock: function(n, r){
        return {
          "type":"olist", 
          "start": n.start,
          "children": r.yield(n)
        };
      },

      DlistBlock: typedChildren('dlist'),
      UlistItemBlock: typedChildren('uitem'),
      OlistItemBlock: typedChildren('oitem'),

      DlistItemBlock: function(n, r){
        return {
          "type":"ditem", 
          "title": r.render(n.titleInline),
          "children": r.yield(n)
        };
      },

      ParaBlock: typedChildren('para'),
      VerseBlock: typedChildren('verse'),
      QuoteBlock: typedChildren('quote'),
      CenterBlock: typedChildren('center'),
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n");
        return {
          "type":"example", 
          "content": content
        };
      },
      SimpleExampleBlock: function(n, r){
        var content = n.lines.join("\n");
        return {
          "type":"example", 
          "content": content
        };
      },

      SrcBlock: function(n, r){
        var l = n.language || null;
        var content = n.lines.join("\n");
        return {
          "type":"source",
          "language" : l,
          "content": content
        };
      },

      HtmlBlock: function(n, r){
        var content = n.lines.join("\n");
        return {
          "type":"html", 
          "content": content
        };
      },

      FndefBlock: function(n, r){
        return "";
      },

      CommentBlock : function(n, r){
        return "";
      },

      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headInline = r.render(OM.tokenize(n, headline));

        var children = [];
        children.push(r.render(n.contentNode));
        children = children.concat(r.yield(n));
        var result = {
          "type": "node",
          "id": n.id(),
          "level": n.level,
          "headline": headInline,
          "tags": n.heading.getTags(),
          "children": children
        };

        if(_U.notEmpty(n.fnNameByNum)){
          var fns = [];
          var root = n;
          _U.each(root.fnNameByNum, function(name, idx){
            if(!name){return;}
            var fn = root.fnByName[name];
            fns.push({
              "name": name,
              "inline": r.render(fn.inline),
              "num": fn.num
            });
          });
          result.footnotes = fns;
        }
        
        return result;
      }
    };
  };

  var DefaultHTMLRenderer = function(){
    var renderer = {
      /*orgdoc
      ** Utility functions
      *** escapeHtml(str)                                                :function:
           + Purpose :: The =escapeHtml= function escapes the forbidden
                        characters in HTML/XML: =&=, =>=, =<=, ='= and ="=,
                        which are all translated to their corresponding
                        entity.
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      escapeHtml: function(str){
        str = "" + str;
        str = str.replace(/&/g, "&amp;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/'/g, "&apos;");
        str = str.replace(/"/g, "&quot;");
        return str;
      },

      /*orgdoc
      *** =unBackslash(str)=                                                :function:
           + Purpose :: Utility to unescape the characters of the given raw content
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      unBackslash: function(str){
        str = "" + str;
        str = str.replace(/\\\\\n/g, "<br/>");
        str = str.replace(/\\ /g, "&nbsp;");
        str = str.replace(/\\(.)/g, "$1");
        str = str.replace(/\s--\s/g, " &#151; ");
        return str;
      },

      /*orgdoc
      *** =htmlize(str, renderer)=                                                :function:
           + Purpose :: Unbackslash after having escaped HTML
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      htmlize: function(str, r){
        return r.unBackslash(r.escapeHtml(str));
      },

      /*orgdoc
      ** Rendering inline items
      *** =IgnoredLine=
      */
      IgnoredLine: function(n, r){
        return "<!-- " + r.htmlize(n.content, r) + " -->";
      },

      /*orgdoc
      *** =EmphInline=
          Should not be used, EmphInline is abstract...
      */
      EmphInline: function(n, r){
        return r.renderChildren(n, r);
      },

      /*orgdoc
      *** =EmphRaw=
      */
      EmphRaw: function(n, r){
        return "<span>" +
                r.htmlize(n.content, r) + "</span>";
      },

      /*orgdoc
      *** =EmphCode=
      */
      EmphCode: function(n, r){
        return "<code class='prettyprint'>" +
                r.escapeHtml(n.content, r) + "</code>";
      },
      
      /*orgdoc
      *** =EmphVerbatim=
      */
      EmphVerbatim: function(n, r){
        return "<samp>" +
                r.htmlize(n.content, r) + "</samp>";
      },

      /*orgdoc
      *** =EmphItalic=
      */
      EmphItalic: function(n, r){
        return "<em>" +
                r.renderChildren(n, r) + "</em>";
      },

      /*orgdoc
      *** =EmphBold=
      */
      EmphBold: function(n, r){
        return "<strong>" +
                r.renderChildren(n, r) + "</strong>";
      },

      /*orgdoc
      *** =EmphUnderline=
      */
      EmphUnderline: function(n, r){
        return "<u>" +
                r.renderChildren(n, r) + "</u>";
      },

      /*orgdoc
      *** =EmphStrike=
      */
      EmphStrike: function(n, r){
        return "<del>" +
                r.renderChildren(n, r) + "</del>";
      },
      
      /*orgdoc
      *** =LaTeXInline=
      */
      LaTeXInline: function(n, r){
        return "<span class='math'>" +
                r.escapeHtml(n.content, r) + "</span>";
      },

      /*orgdoc
      *** =Link=
      */
      Link: function(n, r){
        return "<a class='link' href='" + n.url + "'>" +
                r.render(n.desc) + "</a>";
      },

      /*orgdoc
      *** =FootNoteRef=
      */
      FootNoteRef: function(n, r){
        var root = n.root();
        var footnote = root.fnByName[n.name];
        var num = 0;
        if(footnote){num = footnote.num;}
        return "<a name='fnref_" + n.name + "'/>" +
                "<a class='fnref' href='#fndef_" + n.name + "'><sup>" +
                num + "</sup></a>";
      },

      /*orgdoc
      *** =SubInline=
      */
      SubInline: function(n, r){
        return "<sub>" +
                r.htmlize(n.content, r) + "</sub>";
      },

      /*orgdoc
      *** =SupInline=
      */
      SupInline: function(n, r){
        return "<sup>" +
                r.htmlize(n.content, r) + "</sup>";
      },

      /*orgdoc
      *** =TimestampInline=
      */
      TimestampInline: function(n, r){
        var ts     = n.timestamp;
        return "<span class='timestamp'>" +
                ts.format("%y/%m/%d %H:%M") + "</span>";
      },

      /*orgdoc
      ** Rendering blocks
         This sections contains the code for the different types of
         instanciable blocks defined in

         We will attach a, until now undefined, =render= property to these
         block prototypes. None of these function take any argument, all
         the information they need being in the block object they will act
         upon through the =this= value.

         The container blocks (those whose constructor calls the
         =ContainerBlock= constructor) all use the =renderChildren=
         function.

         The content blocks (those whose constructor calls the
         =ContentBlock= constructor) should use their =this.lines=
         array.

      *** Rendering =RootBlock=
           =RootBlock=s are rendered with a =div= tag, with class
           =org_content=.
      */
      RootBlock: function(n, r){
        var out = "<div class='content'>\n";
        out += r.renderChildren(n, r);
        out += "</div>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =UlistBlock=
           =UlistBlock=s are rendered with a simple =ul= tag.
      */
      UlistBlock: function(n, r){
        var out = "<ul>\n";
        out += r.renderChildren(n, r);
        out += "</ul>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =OlistBlock=
           =OlistBlock=s are rendered with a simple =ol= tag.

           If the block has a =start= property different from =1=, it is
           inserted in the =start= attribute of the tag.
      */
      OlistBlock: function(n, r){
        var s = n.start;
        var out = "<ol" + (s === 1 ? ">\n" : " start='" + r.escapeHtml(s) + "'>\n");
        out += r.renderChildren(n, r);
        out += "</ol>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =DlistBlock=
           =DlistBlock=s are rendered with a =dl= tag.

           =DlistItemBlock=s will have to use =dt=/=dd= structure
           accordingly.
      */
      DlistBlock: function(n, r){
        var out = "<dl>\n";
        out += r.renderChildren(n, r);
        out += "</dl>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =UlistItemBlock= and =OlistItemBlocks=
           =UlistItemBlock=s and =0listItemBlocks= are rendered with a
           #simple =li= tag.
      */
      UlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n, r);
        out += "</li>\n";
        return out;
      },

      OlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n, r);
        out += "</li>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =DlistItemBlock=
           =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

           The content of the =dt= is the =title= attribute of the block.

           The content of the =dd= is the rendering of this block's children.
      */
      DlistItemBlock: function(n, r){
        var out = "<dt>" + r.render(n.titleInline, r) + "</dt>\n<dd>\n";
        out += r.renderChildren(n, r);
        out += "</dd>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =ParaBlock=
           =ParaBlock=s are rendered with a =p= tag.

           The content of the tag is the concatenation of this block's
           =this.lines=, passed to the =renderMarkup= function.
      */
      ParaBlock: function(n, r){
        return "<p>\n" + r.renderChildren(n, r) + "</p>\n";
      },

      /*orgdoc
      *** Rendering =VerseBlock=
           =VerseBlock=s are rendered with a =p= tag, with class
           =verse=.

           All spaces are converted to unbreakable spaces.

           All new lines are replaced by a =br= tag.
      */
      VerseBlock: function(n, r){
        var s = "";
        if (n.signature) {
          var s = "<figcaption>" + r.render(n.signature) + "</figcaption>";
        }
        var out = "<figure class='verse'><pre class='verse'>\n" + r.renderChildren(n, r) + "</pre>" + s + "</figure>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =QuoteBlock=
           =QuoteBlock=s are rendered with a =blockquote= tag.

           If the quote contains an author declaration (after a double dash),
           this declaration is put on a new line.
      */
      QuoteBlock: function(n, r){
        var s = "";
        if (n.signature) {
          var s = "<figcaption>" + r.render(n.signature) + "</figcaption>";
        }
        var out = "<figure class='quote'><blockquote>\n" + r.renderChildren(n, r) + "</blockquote>" + s + "</figure>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CenterBlock=
           =CenterBlock=s are rendered with a simple =center= tag.
      */
      CenterBlock: function(n, r){
        return "<center>\n" + r.renderChildren(n, r) + "</center>\n";
      },

      /*orgdoc
      *** Rendering =ExampleBlock=
           =ExampleBlock=s are rendered with a simple =pre= tag.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var out = "<pre>\n" + markup + "</pre>\n";
        return out;
      },
      SimpleExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var out = "<pre>\n" + markup + "</pre>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =SrcBlock=
           =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
           The =code= tag may have a class attribute if the language of the
           block is known. In case there is, the class would take the language
           identifier.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      SrcBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var l = n.language;
        var out = "<pre class='src prettyprint" +
                  ( l ? " lang-" + l : "") + "'>" +
                  markup + "</pre>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =HtmlBlock=
           =HtmlBlock=s are rendered by simply outputting the HTML content
           verbatim, with no modification whatsoever.
      */
      HtmlBlock: function(n, r){
        var out = n.lines.join("\n") + "\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CommentBlock=
           =CommentBlock=s are ignored.
      */
      FndefBlock: function(n, r){
        return "";
      },

      CommentBlock : function(n, r){
        return "";
      },


      /*orgdoc
      ** Rendering headlines

          Here we render headlines, represented by =Outline.Node= objects.

          A =section= tag is used, with class orgnode, and a level.
          The =id= attribute is the computed id corresponding to a unique TOC
          identifier.

          The title is in a =div.title= element. Each tag is represented at the
          end of this element by a =span.tag= element.

          The content of the node (the RootBlock associated to this headline)
          is rendered.

          Then the subheadlines are rendered using the =renderChildren= function.
      */
      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headInline = r.render(n.heading.titleNode, r);
        var todo = n.heading.getTodo();

        var html = "<section id='%REPR%' class='orgnode level-%LEVEL%'>";
        html = html.replace(/%REPR%/g, n.repr());
        html = html.replace(/%LEVEL%/g, n.level);
        var lvl = n.level + 1;
        var title;
        if (lvl <= 6) {
          var tag = 'h' + lvl;
          title = "<%H%>%TODO%%HEADLINE%%TAGS%</%H%>".replace(/%H%/g, tag);
        } else {
          title = "<div class='heading lvl" + lvl + "'>%TODO%%HEADLINE%%TAGS%</div>";
        }
        title = title.replace(/%HEADLINE%/g, headInline);
        var tags = "";
        _U.each(n.heading.getTags(), function(tag, idx){
          if(tag.length){
            tags += " <span class='tag'>" + tag + "</span>";
          }
        });
        title = title.replace(/%TODO%/g, todo ? " <span class='todo'>" + todo + "</span> " : "");
        title = title.replace(/%TAGS%/g, tags);

        html += title;

        var childrenHtml = r.renderChildren(n, r);
        html += childrenHtml;

        if(_U.notEmpty(n.fnNameByNum)){
          var root = n;
          html += "<section class='footnotes'><title>Notes</title>";
          _U.each(root.fnNameByNum, function(name, idx){
            if(!name){return;}
            var fn = root.fnByName[name];
            var inline = fn.inline;
            var num = fn.num;
            html += "<p class='footnote'><a name='fndef_" + name + "'/>" +
                "<a class='fnref' href='#fnref_" + name + "'><sup>" +
                num + "</sup></a>&nbsp;:&nbsp;<span id='fndef_" + name+ "'>" +
                r.render(inline) + "</span></p>";
          });
          html += "</section>";
        }

        html += "</section>";
        return html;
      }
    };
    return _U.merge(renderer, DefaultRenderer);
  };

  return {
    html: DefaultHTMLRenderer,
    org:  DefaultOrgRenderer,
    struct: StructRenderer,
    json: DefaultJsObjRenderer
  };
};

/*orgdoc
* TODO =Org.API= : API

*/