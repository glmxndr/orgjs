/***orgdoc***
#+TITLE:     Org-Mode Javascript Parser

  Some para here !

  [fn:2] Oh, right!

  [1] Oh, right again!


  This project aims to provide[fn:2] a parser and easily customizable renderer
  for [[http://orgmode.org/][Org-Mode]] files in JavaScript.

* =Org= : the Main object

  The global context[1] is extended with only one object, named =Org=.

  This is a /sample _paragraph_/. With some formatting (see http://google.com/).
  + A *\*bold\** word
  + A tilde: ~\~~


*/
var Org = function(params){
  this.version = "0.1";
  this.apiversion = "7.6";
  this.Config  = Org.getConfig( this, params);
  this.Regexps = Org.getRegexps(this, params);
  this.Utils   = Org.getUtils(  this, params);
  this.Markup  = Org.getMarkup( this, params);
  this.Content = Org.getContent(this, params);
  this.Outline = Org.getOutline(this, params);
  this.Render  = Org.getRender( this, params);
};
/***orgdoc***
* TODO =Org.Config= : configuration


*/

Org.getConfig = function(org, params){

  var _C = {};

  _C.urlProtocols = [
    "http", 
    "https", 
    "ftp", 
    "mailto", 
    "file", 
    "id", 
    "javascript", 
    "elisp"
  ];



  return _C;

};

/***orgdoc***

** Tab width
** URL protocols

* =Org.Regexps= : the regexp bank

  The parser needs a lot of regular expressions.
  Non trivial regexps will be found in the file =org.regexps.js=, 
  and accessible under the object =Org.Regexps=.

*/

Org.getRegexps = function(org, params){
  
  var RGX = {

    /**
     * A new line declaration, either windows or unix-like
     */
    newline: /\r?\n/,

    /**
     * Captures the first line of the string
     */
    firstLine: /^(.*)/,

    /**
     * Selects anything in the given string until the next heading, or the end.
     * Example : 
     * ----
     * some content
     * 
     * * next heading
     * ----
     * would match "some content\n\n*"
     * 
     * Captures everything except the star of the following heading.
     */
    beforeNextHeading: /^([\s\S]*?)(?:\n\*|$)/,

    /**
     * Parses a heading line, capturing :
     * - the stars
     * - the TODO status
     * - the priority
     * - the heading title
     * - the tags, if any, separated by colons
     */
    headingLine: /(\**)\s*(?:([A-Z]{4})\s+)?(?:\[#([A-Z])\]\s+)?(.*?)\s*(?:\s+:([A-Za-z0-9:]+):\s*)?(?:\n|$)/,

    /**
     * How a meta information begins ( "#+META_KEY:" )
     */
    metaDeclaration: /\s*#\+[A-Z0-9_]+:/,

    /**
     * A meta information line, capturing:
     * - the meta key,
     * - the meta value
     * 
     * Example:
     * ----
     *    #+TITLE: The title
     * ----
     * captures "TITLE", "The title" 
     */ 
    metaLine: /(?:^|\s*)#\+([A-Z0-9_]+):\s*(.*)(\n|$)/m,
  
    /**
     * The property section. Captures the content of the section.
     */
    propertySection: /:PROPERTIES:\s*\n([\s\S]+?)\n\s*:END:/,
  
    /**
     * Property line. Captures the KEY and the value.
     */
    propertyLine: /^\s*:([A-Z0-9_-]+):\s*(\S[\s\S]*)\s*$/im,
  
    /**
     * Clock section when several clock lines are defined.
     */
    clockSection: /:CLOCK:\s*\n([\s\S]+?)\n?\s*:END:/,
 
    /**
     * Matches a clock line, either started only, or finished.
     * Captures:
     *  - start date (yyyy-MM-dd)
     *  - start time (hh:mm)
     *  - end date (yyyy-MM-dd)
     *  - end time (hh:mm)
     *  - duration (hh:mm)
     */
    clockLine: /CLOCK: \[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\](?:--\[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\] =>\s*(-?\d+:\d\d))?/g,

    scheduled: /SCHEDULED: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,

    deadline: /DEADLINE: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,

    _bBlk: {},
    beginBlock: function(type){
      return this._bBlk[k] || 
        (this._bBlk[k] = new RegExp("^\\s*#\\+BEGIN_" + type + "|\\s\n]", "i"));
    },

    _eBlk: {},
    endBlock: function(type){
      return this._eBlk[k] || 
        (this._eBlk[k] = new RegExp("^\\s*#\\+END_" + type + "|\\s\n]", "i"));
    }

  };

  return RGX;
  
};

/***orgdoc***
* =Org.Utils= : useful functions

  Many functionalities are used throughout the parser, mainly to process
  strings. The =Org.Utils= object contains these functions.

*/

Org.getUtils = function(org, params){
  
  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

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
    }
  }

  var RGX = org.Regexps;

  return {
    root: function(obj){
      var result = obj;
      while(result.parent){result = result.parent;}
      return result;
    },

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

    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    empty: function(o){
      // Valid only for strings and arrays
      return (!(o && o.length));
    },

    notEmpty: function(o){
      // Valid only for strings and arrays
      return !this.empty(o);
    },

    blank: function(str){
      // Valid only for strings and arrays
      return !str || str == 0;
    },

    notBlank: function(str){
      // Valid only for strings and arrays
      return !this.blank(str);
    },

    repeat: function(str, times){
      var result = [];
      for(var i=0; i<times; i++){
        result.push(str);
      }
      return result.join('');
    },
    
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
    
    map: function(arr, fn){
      var result = [];
      this.each(arr, function(val, idx){
        var mapped = fn.call(val, val, idx);
        if (mapped != null){result.push(mapped);}
      });
      return result;
    },
    
    log: function(o){
      if(console && console.log){console.log(o);}
    },
    
    firstLine: function(str){
      var match = RGX.firstLine.exec(str);
      return match ? match[0] : "";
    },
    
    lines: function(str){
      if (!str && str !== ""){return [];}
      return str.split(RGX.newline);
    },
    
    indentLevel: function(str){
      return /^\s*/.exec(str)[0].length;
    },

    randomStr: function(length){
      var str = "";
      var available = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for( var i=0; i < length; i++ )
          str += available.charAt(Math.floor(Math.random() * available.length));
      return str;
    },

    keys: function(obj){
      var result = [];
      this.each(obj, function(v, k){result.push(k);});
      return result;
    },

    joinKeys: function(str, obj){
      return this.keys(obj).join(str);
    },

    getAbsentToken: function(str, prefix){
      var token, start = prefix + "_";
      if(str.indexOf(start) === -1){return start;}
      token = start + this.randomStr(5);
      while(str.indexOf(token) !== -1){
        token = start + this.randomStr(5);
      }
      return token;
    }

  };

};

/***orgdoc***
* Markup parser

  This file contains the code for the Org-Mode wiki-style markup.

*/
Org.getMarkup = function(org, params){

  var _U = org.Utils;
  var _C = org.Config;

  var Markup = {};

///////////////////////////////////////////////////////////////////////////////
// LINKS

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
  var LinkTypeArr = _U.map(LinkType, function(v,k){LinkType[k];});

  function getLinkType(link){
    for(k in LinkTypeArr){
      if(link.url.match(LinkTypeArr[k].re)){return LinkType[k];}
    }
  }

  var Link = function(parent, raw, url, desc, token){
    this.raw = raw;
    this.parent = parent;
    this.url = url;
    this.desc = desc;
    this.token = token;
    this.type = getLinkType(this);
  };
  Markup.Link = Link;

  var FootNoteRef = function(parent, raw, name, token){
    this.raw = raw;
    this.parent = parent;
    this.name = name;
    this.token = token;
  };
  Markup.FootNoteRef = FootNoteRef;

///////////////////////////////////////////////////////////////////////////////
// TYPO
  
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
// pre          Chars allowed as prematch.  Beginning of line will be allowed too.
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
  _U.each("/*~=+_".split(""), function(t){EmphMarkers[t] = {};});

  EmphMarkers.getInline = function(token, parent){
    var constr = this[token].constr;
    return new constr(parent);
  };
  EmphMarkers.getRegexpAll = function(){
    // TODO : refactor to : 
    //    - take the real pre/post/border char sets in config
    return /(^(?:.|\n)*?)(([\/*~=+_])([^\s].*?[^\s\\]|[^\s\\])\3)/;        //*/
  };
  Markup.EmphMarkers = EmphMarkers;

  function makeInline(constr, parent, food){
    var inline = new constr(parent);
    parent.adopt(inline);
    if(food){inline.consume(food);}
    return inline;
  }

  var EmphInline = function(parent){
    this.parent = parent;
    this.children = [];
  };
  EmphInline.prototype.adopt = function(child){
    this.children.push(child);
    child.parent = this;
  };
  EmphInline.prototype.replaceTokens = function(tokens){
    if(this.children.length){
      _U.each(this.children, function(v){v.replaceTokens(tokens);});
    }
    if(this.content && this.content.length){
      var content = this.content;
      var pipedKeys =  _U.joinKeys("|", tokens);
      if(pipedKeys == 0){return;}
      var rgx = new RegExp('^((?:.|\n)*?)(' + pipedKeys + ')((?:.|\n)*)$');
      var match, pre, token, rest;
      var inline = new EmphInline(this);
      while(match = rgx.exec(content)){
        pre = match[1]; token = match[2]; rest = match[3];
        if(_U.notBlank(pre)){ makeInline(EmphRaw, inline, pre); }
        inline.adopt(tokens[token]);
        content = rest;
      }
      if(inline.children.length){
        if(_U.notBlank(rest)){ makeInline(EmphRaw, inline, rest); }
        this.content = "";
        this.adopt(inline);
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
      pre = match[1]; 
      hasEmph = match[2]; 
      token = match[3] || ""; 
      inner = match[4] || "";
      length = pre.length + inner.length + (hasEmph ? 2 : 0);
      if(length === 0){break;}
      rest = rest.substr(length);
      if(_U.notBlank(pre)){ makeInline(EmphRaw, this, pre); }
      if(hasEmph !== void(0)){ 
        makeInline(EmphMarkers[token].constr, this, inner);
      }
    }
    if(_U.notBlank(rest)){ makeInline(EmphRaw, this, rest); }
  };
  Markup.EmphInline = EmphInline;

  var EmphRaw = function(parent){
    EmphInline.call(this, parent);
    this.recurse = false;
  };
  EmphRaw.prototype = Object.create(EmphInline.prototype);
  EmphRaw.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphRaw = EmphRaw;


  var EmphItalic = function(parent){
    EmphInline.call(this, parent);
    this.recurse = true;
  };
  EmphItalic.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["/"].constr = EmphItalic;
  Markup.EmphItalic = EmphItalic;


  var EmphBold = function(parent){
    EmphInline.call(this, parent);
    this.recurse = true;
  };
  EmphBold.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["*"].constr = EmphBold;
  Markup.EmphBold = EmphBold;


  var EmphUnderline = function(parent){
    EmphInline.call(this, parent);
    this.recurse = true;
  };
  EmphUnderline.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["_"].constr = EmphUnderline;
  Markup.EmphUnderline = EmphUnderline;


  var EmphStrike = function(parent){
    EmphInline.call(this, parent);
    this.recurse = true;
  };
  EmphStrike.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["+"].constr = EmphStrike;
  Markup.EmphStrike = EmphStrike;


  var EmphCode = function(parent){
    EmphRaw.call(this, parent);
  };
  EmphCode.prototype = Object.create(EmphRaw.prototype);
  EmphMarkers["="].constr = EmphCode;
  Markup.EmphCode = EmphCode;


  var EmphVerbatim = function(parent){
    EmphRaw.call(this, parent);
  };
  EmphVerbatim.prototype = Object.create(EmphRaw.prototype);
  EmphMarkers["~"].constr = EmphVerbatim;
  Markup.EmphVerbatim = EmphVerbatim;


///////////////////////////////////////////////////////////////////////////////
// PARSE

  var _linkTokenId = 0;

  Markup.tokenize = function tokenize(parent, str){
    str = "" + (str || "");
    var initStr = str;

    var links = {};
    var linkTokenPrefix = uniqToken("LINK");  

    function uniqToken(p){return _U.getAbsentToken(initStr, p);}

///////////////////////////////////////////////////////////////////////////////
//     LINKS
    function linkToken(){return linkTokenPrefix + (++_linkTokenId);}

    function linkReplacer(urlIdx, descIdx){
      return function(){
        var t = linkToken();
        var a = arguments;
        links[t] = new Link(parent, a[0], a[urlIdx], a[descIdx], t);
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

///////////////////////////////////////////////////////////////////////////////
//     FOOTNOTES

    var refFootnoteRegex = /\[(?:(\d+)|fn:([^:]*)(?::((?:.|\s)+?))?)\]/g;
    str = str.replace(refFootnoteRegex, function(){
      var a = arguments;
      var raw = a[0], name = a[2], def = a[3];
      if(!name){name = a[1];}
      if(!name){name = "anon_" + _U.root(parent).fnNextNum;}
      var t = linkToken();
      var fn = new FootNoteRef(parent, raw, name, t);
      if(def){
        var root = _U.root(parent);
        console.log("FROM MARKUP::::");
        console.log(root);
        var inline = new EmphInline(root);
        inline.consume(def);
        root.addFootnoteDef(inline, name);
      }
      links[t] = fn;
      return t;
    });

// TODO

    var iObj = new EmphInline(parent);
    iObj.consume(str);
    iObj.replaceTokens(links);
    return iObj;
  };


  return Markup;

};
/***orgdoc***

* =Org.Content= : the content parser

  This section describes the parser for the actual content within the sections
  of the =org= file.

*/

Org.getContent = function(org, params){

  var _U  = org.Utils;
  var OM = org.Markup;
  var RGX = org.Regexps;

  // The object that will be returned, and filled throughout this function.
  var Content = {};

  var LineDef = (function(){
    var l = -1;
    return {
      "BLANK":    {id: ++l},
      "IGNORED":  {id: ++l},
      "FNDEF":    {id: ++l},
      "PARA":     {id: ++l},
      "ULITEM":   {id: ++l},
      "OLITEM":   {id: ++l},
      "DLITEM":   {id: ++l},
      "VERSE":    {id: ++l, beginEnd:1},
      "QUOTE":    {id: ++l, beginEnd:1},
      "CENTER":   {id: ++l, beginEnd:1},
      "EXAMPLE":  {id: ++l, beginEnd:1},
      "SRC":      {id: ++l, beginEnd:1},
      "HTML":     {id: ++l, beginEnd:1},
      "COMMENT":  {id: ++l, beginEnd:1}
    };
  }());

  // Defining some other arrangements of the line definitions :
  //  + Simple index : type name => number
  var LineType = {};
  _U.each(LineDef, function(v, k){LineType[k] = v.id;});
  //  + Reversed type index : number => type name
  var LineTypeArr = [];
  _U.each(LineDef, function(v, k){LineTypeArr[v.id] = k;});
  //  + List of names of the blocks in #+BEGIN_... / #+END_... form
  var BeginEndBlocks = {};
  _U.each(LineDef, function(v, k){if(v.beginEnd) BeginEndBlocks[k] = 1;});

  function getLineType(line){
    // First test on a line beginning with a letter,
    // the most common case, to avoid making all the
    // other tests before returning the default.
    if(/^\s*[a-z]/i.exec(line)){
      return LineType.PARA;
    }
    if(line == 0){
      return LineType.BLANK;
    }
    if(/^#/.exec(line)){
      return LineType.IGNORED;
    }
    // Then test all the other cases
    if(/^\s+[+*-] /.exec(line)){
      if(/ ::/.exec(line)){
        return LineType.DLITEM;
      }
      return LineType.ULITEM;
    }
    if(/^\s*\d+[.)] /.exec(line)){
      return LineType.OLITEM;
    }
    if(/^\s*\[(\d+|fn:.+?)\]/.exec(line)){
      return LineType.FNDEF;
    }

    //if(/^\s*$/.exec(line)){
    //  return LineType.BLANK;
    //}
    for(k in BeginEndBlocks){
      if(RGX.beginBlock(k).exec(line)){
        return LineType[k];
      }
    }
    return LineType.PARA;
  }

  function getLineIndent(line){
    line = line || "";
    var indent = /^\s*/.exec(line)[0].length;
    return indent;
  }

  function getNewBlock(line, parent){
    var type = getLineType(line, line);
    var constr = LineDef[LineTypeArr[type]].constr || LineDef.PARA.constr;
    return new constr(parent, line);
  }

  ////////////////////////////////////////////////////////////////////////////////
  //  CONTAINERBLOCK
  var ContainerBlock = function(parent){
    this.parent = parent;
    this.isContainer = true;
    this.children = [];
  };
  ContainerBlock.prototype.finalize = function(){};

  ////////////////////////////////////////////////////////////////////////////////
  //  ROOTBLOCK
  var RootBlock = function(parent){
    ContainerBlock.call(this, parent);
  };
  Content.RootBlock = RootBlock;
  RootBlock.prototype = Object.create(ContainerBlock.prototype);

  RootBlock.prototype.accept  = function(line){return true;};
  RootBlock.prototype.consume = function(line){
    var block = getNewBlock(line, this);
    this.children.push(block);
    return block.consume(line);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  CONTENTBLOCK
  var ContentBlock = function(parent){
    this.parent = parent;
    this.isContent = true;
    this.lines = [];
  };
  ContentBlock.prototype.finalize = function(){};

  ////////////////////////////////////////////////////////////////////////////////
  //  CONTENTMARKUPBLOCK
  var ContentMarkupBlock = function(parent){
    ContentBlock.call(this, parent);
    this.hasMarkup = true;
    this.children = [];
  };
  ContentMarkupBlock.prototype.finalize = function(){
    var content = this.lines.join("\n");
    var inline = OM.tokenize(this, content);
    this.children.push(inline);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  PARABLOCK
  var ParaBlock = function(parent){
    ContentMarkupBlock.call(this, parent);
    this.indent = parent.indent || 0;
  };
  LineDef.PARA.constr = Content.ParaBlock = ParaBlock;
  ParaBlock.prototype = Object.create(ContentMarkupBlock.prototype);
  ParaBlock.prototype.accept = function(line){
    var indent;
    var type = getLineType(line);
    if(type === LineType.BLANK){
      if(this.ended){return true;}
      this.ended = true; return true;
    }
    if(type !== LineType.PARA){return false;}
    if(this.ended){return false;}

    if(this.indent === 0){return true;}
    indent = getLineIndent(line);
    if(indent <= this.indent){
      return false;    
    }
    return true;
  };

  ParaBlock.prototype.consume = function(line){
    var type = getLineType(line);
    if(type !== LineType.IGNORED){
      this.lines.push(line);
    }
    return this;
  };


  ////////////////////////////////////////////////////////////////////////////////
  //  FNDEFBLOCK
  var FndefBlock = function(parent){
    ContentMarkupBlock.call(this, parent);
    this.indent = parent.indent || 0;
    this.firstline = true;
  };
  LineDef.FNDEF.constr = Content.FndefBlock = FndefBlock;
  FndefBlock.prototype = Object.create(ContentMarkupBlock.prototype);

  FndefBlock.prototype.accept = function(line){
    var indent;
    var type = getLineType(line);
    if(type === LineType.FNDEF){
      if(this.ended){return false;}
      return true;
    }
    if(type === LineType.BLANK){
      if(this.ended){ return true; }
      this.ended = true; return true;
    }
    if(this.ended){ return false; }
    return true;
  };

  FndefBlock.prototype.consume = function(line){
    var type = getLineType(line);
    if(this.firstline){
      this.name = /^\s*\[(.*?)\]/.exec(line)[1].replace(/^fn:/, '');
      this.firstline = false;
    }
    if(type !== LineType.IGNORED){
      this.lines.push(line);
    }
    return this;
  };

  FndefBlock.prototype.finalize = function(line){
    var root = _U.root(this);
    var content = this.lines.join("\n");
    content = content.replace(/^(\s*)\[.*?\]/, "$1");
    var inline = OM.tokenize(this, content);
    root.addFootnoteDef(inline, this.name);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  BEGINENDBLOCK
  var BeginEndBlock = function(parent, line, type){
    ContentBlock.call(this, parent);
    this.indent = getLineIndent(line);
    this.ended = false;
    this.beginre = RGX.beginBlock(type);
    this.endre   = RGX.endBlock(type);
  };
  BeginEndBlock.prototype = Object.create(ContentBlock.prototype);
  BeginEndBlock.prototype.accept      = function(line){return !this.ended;};
  BeginEndBlock.prototype.treatBegin  = function(line){};
  BeginEndBlock.prototype.consume     = function(line){
    if(this.beginre.exec(line)){ this.treatBegin(line); }
    else if(this.endre.exec(line)){ this.ended = true; }
    else { 
      if(this.verbatim){
        this.lines.push(line);
      } else {
        var type = getLineType(line);
        if(type !== LineType.IGNORED){
          this.lines.push(line);
        }
      }  
    }
    return this;
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  VERSEBLOCK
  var VerseBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "VERSE");
  };
  LineDef.VERSE.constr = Content.VerseBlock = VerseBlock;
  VerseBlock.prototype = Object.create(BeginEndBlock.prototype);
  VerseBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  QUOTEBLOCK
  var QuoteBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "QUOTE");
  };
  LineDef.QUOTE.constr = Content.QuoteBlock = QuoteBlock;
  QuoteBlock.prototype = Object.create(BeginEndBlock.prototype);
  QuoteBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  CENTERBLOCK
  var CenterBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "CENTER");
  };
  LineDef.CENTER.constr = Content.CenterBlock = CenterBlock;
  CenterBlock.prototype = Object.create(BeginEndBlock.prototype);
  CenterBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  EXAMPLEBLOCK
  var ExampleBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "EXAMPLE");
    this.verbatim = true;
  };
  LineDef.EXAMPLE.constr = Content.ExampleBlock = ExampleBlock;
  ExampleBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  SRCBLOCK
  var SrcBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "SRC");
    this.verbatim = true;
    var match = /BEGIN_SRC\s+([a-z-]+)(?:\s*|$)/i.exec(line);
    this.language = match ? match[1] : null;
  };
  LineDef.SRC.constr = Content.SrcBlock = SrcBlock;
  SrcBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  HTMLBLOCK
  var HtmlBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "HTML");
    this.verbatim = true;
  };
  LineDef.HTML.constr = Content.HtmlBlock = HtmlBlock;
  HtmlBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  COMMENTBLOCK
  var CommentBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "COMMENT");
    this.verbatim = true;
  };
  LineDef.COMMENT.constr = Content.CommentBlock = CommentBlock;
  CommentBlock.prototype = Object.create(BeginEndBlock.prototype);


  ////////////////////////////////////////////////////////////////////////////////
  //  ULISTBLOCK
  var UlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = getLineIndent(line);
  };
  LineDef.ULITEM.constr = Content.UlistBlock = UlistBlock;
  UlistBlock.prototype = Object.create(ContainerBlock.prototype);

  UlistBlock.prototype.accept  = function(line){
    return getLineType(line) === LineType.ULITEM &&
      getLineIndent(line) === this.indent;
  };

  UlistBlock.prototype.consume = function(line){
    var item = new UlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  OLISTBLOCK
  var OlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = getLineIndent(line);
    var match = /^\s*\d+[.)]\s+\[@(\d+)\]/.exec(line);
    this.start = match ? +(match[1]) : 1;
  };
  LineDef.OLITEM.constr = Content.OlistBlock = OlistBlock;
  OlistBlock.prototype = Object.create(ContainerBlock.prototype);

  OlistBlock.prototype.accept  = function(line){
    return getLineType(line) === LineType.OLITEM &&
      getLineIndent(line) === this.indent;
  };

  OlistBlock.prototype.consume = function(line){
    var item = new OlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  DLISTBLOCK
  var DlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = getLineIndent(line);
  };
  LineDef.DLITEM.constr = Content.DlistBlock = DlistBlock;
  DlistBlock.prototype = Object.create(ContainerBlock.prototype);

  DlistBlock.prototype.accept  = function(line){
    return getLineType(line) === LineType.DLITEM &&
      getLineIndent(line) === this.indent;
  };

  DlistBlock.prototype.consume = function(line){
    var item = new DlistItemBlock(this, line);
    this.children.push(item);
    return item.consume(line);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  LISTITEMBLOCK
  var ListItemBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = parent.indent;
  };
  ListItemBlock.prototype = Object.create(ContainerBlock.prototype);

  ListItemBlock.prototype.accept  = function(line){
    var isMoreIndented = getLineIndent(line) > this.indent;
    return isMoreIndented;
  };

  ListItemBlock.prototype.consume = function(line){
    var block;
    if(this.children.length === 0){
      line = this.preprocess(line);
    }
    block = getNewBlock(line, this);
    this.children.push(block);
    return block.consume(line);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  ULISTITEMBLOCK
  var UlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent, line);
  };
  Content.UlistItemBlock = UlistItemBlock;

  UlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  UlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*)[+*-] /, "$1  ");
  };


  ////////////////////////////////////////////////////////////////////////////////
  //  OLISTITEMBLOCK
  var OlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent, line);
    var match = /^\s*(\d+)[.)] /.exec(line);
    this.number = match ? +(match[1]) : 1;
  };
  Content.OlistItemBlock = OlistItemBlock;

  OlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  OlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s+)\d+[.)](?:\s+\[@\d+\])? /, "$1  ");
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  DLISTITEMBLOCK
  var DlistItemBlock = function(parent, line){
    ListItemBlock.call(this, parent,line);
    var title = /^\s*[+*-] (.*) ::/.exec(line)[1]
    this.titleInline = OM.tokenize(this, title);
  };
  Content.DlistItemBlock = DlistItemBlock;

  DlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  DlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*)[+*-]\s+.*? ::/, "$1  ");
  };

  ////////////////////////////////////////////////////////////////////////////////
  //       PARSECONTENT
  Content.parse = function(parent, lines){
    var root = new RootBlock(parent);
    var current = root;
    var line = lines.shift();
    // Ignore first blank lines...
    while(line !== undefined && getLineType(line) === LineType.BLANK){
      line = lines.shift();
    }
    while(line !== undefined){
      while(current){
        if(current.accept(line)){
          current = current.consume(line);
          break;
        } else {
          current.finalize();
          current = current.parent;
        }
      }
      line = lines.shift();
    };
    if(current){current.finalize();}
    return root;
  };

  return Content;

};

/***orgdoc***

* =Org.Outline= : the outline/headlines parser

  This section describes the outline parser.

*/

Org.getOutline = function(org, params){

  var RGX = org.Regexps;
  var OC = org.Content;
  var _U = org.Utils;

  /////////////////////////////////////////////////////////////////////////////
  // NODE : corresponds to a line starting with stars "*** ..."
  
  var Node = function(whole, params){
    params = params || {};
    this.docid = params.docid;
    this.parent = params.parent;
    this.children = params.children || [];
    
    this.whole = whole;
    this.parser = new NodeParser(this.whole);
    this.heading = this.parser.getHeading();
    this.level = params.level || (this.heading.getStars() || "").length;
    
    this.properties = this.parser.getProperties();
    this.meta = this.parser.getMeta();
    this.content = this.parser.getContent();
    
  };

  Node.prototype = {
    parseContent: function(){
      var lines = _U.lines(this.content);
      this.contentNode = OC.parse(this, lines);
    },

    siblings: function(){
      return this.parent 
              ? this.parent.children
              : [];
    },

    // Computes the ID of this node
    id: function(){
      if (!this.parent){
        return this.docid 
                ? this.docid
                : "doc#" + (Node.tocnum++) + "/";
      }
      return this.parent.id() + "" + this.siblings().indexOf(this) + "/";
    }, 

    addFootnoteDef: function(inline, name){
      if(this.fnByName === void(0)){
        this.fnByName = {};
        this.fnNameByNum = [];
        this.fnNextNum = 1;
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
  };

  /**
   * Counting the documents generated in this page.
   * Helps to generate an ID for the nodes 
   * when no docid is given in the root node.
   */
  Node.tocnum = 0;
  
  /////////////////////////////////////////////////////////////////////////////
  // PARSING
  
  /**
   * Headline embeds the parsing of a heading line.
   */
  var Headline = function(txt){
    this.repr = _U.trim(txt);
    this.match = RGX.headingLine.exec(this.repr) || [];
  };

  Headline.prototype = {
    getStars: function(){
      return this.match[1];
    },
    getTodo: function(){
      return this.match[2];
    },
    getPriority: function(){
      return this.match[3];
    },
    getTitle: function(){
      return this.match[4] || "";
    },
    getTags: function(){
      var tags = this.match[5];
      return tags ? tags.split(":") : [];
    }
  };
  
  /**
   * Parsing a whole section
   */
  var NodeParser = function(txt){
    this.content = txt;
  };

  NodeParser.prototype = {
    /**
     * Returns the heading object for this node
     */
    getHeading: function(){
      if(this.heading){return this.heading;}
      var firstLine = _U.firstLine(this.content);
      this.heading = new Headline(firstLine);
      return this.heading;
    },

    /**
     * Returns the map of headers (defined by "#+META: ..." line definitions)
     */
    getMeta: function(){
      if(this.meta){return this.meta;}
      var content = this.content;
      if(this.level > 0){content = content.replace(RGX.headingLine, "\n");}
      var meta = this.parseHeaders(content);
      this.meta = meta;
      return this.meta;
    },

    /**
     * Returns the properties as defined in the :PROPERTIES: field
     */
    getProperties: function(){
      if(this.props){return this.props;}
      var content = this.content;
      content = content.replace(RGX.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      content = content.split(subHeadingStars)[0];
      var props = this.props = {};
      var propMatch = RGX.propertySection.exec(content);
      if(!propMatch){return this.props;}
      var propLines = _U.lines(propMatch[1]);
      _U.each(propLines, function(line, idx){
        var match = RGX.propertyLine.exec(line);
        if(!match){return 1;} // continue
        // Properties may be defined on several lines ; concatenate the values if needed
        props[match[1]] = props[match[1]] ? props[match[1]] + " " + match[2] : match[2];
      });
      this.props = props;
      return this.props;
    },

    /**
     * Returns the whole content without the heading nor the subitems
     */
    getItem: function(){
      if(this.item){return this.item;}
      var content = this.content;
      content = content.replace(RGX.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      //_U.log(subHeadingStars);
      content = content.split(subHeadingStars)[0];
      this.item = content;
      return content;
    }, 

    /**
     * Returns the content only : no heading, no properties, no subitems, no clock, etc.
     */
    getContent: function(){
      if(this.text){return this.text;}
      var content = this.getItem();
      content = this.removeHeaders(content);
      content = content.replace(RGX.propertySection, "");
      content = content.replace(RGX.scheduled, "");
      content = content.replace(RGX.deadline, "");
      content = content.replace(RGX.clockSection, "");
      content = content.replace(RGX.clockLine, "");
      this.text = content;
      return content;
    },

    /**
     * Extracts all the ""#+HEADER: Content" lines
     * at the beginning of the given text, and returns a map
     * of HEADER => Content
     */
    parseHeaders: function(txt){
      var result = {};
      var lines = txt.split(RGX.newline);
      _U.each(lines, function(line, idx){
        if(_U.trim(line).length == 0){return true;}
        if(!line.match(RGX.metaDeclaration)){return false;} // we went ahead the headers : break the loop
        var match = RGX.metaLine.exec(line);
        if (match){
          result[match[1]] = match[2];
        }
        return true;
      });
      // _U.log(result);
      return result;
    },
    /**
     * Returns the given text without the "#+HEADER: Content" lines at the beginning
     */
    removeHeaders: function(txt){
      var result = "";
      var lines = txt.split(RGX.newline);
      var header = true;
      _U.each(lines, function(line, idx){
        if(header && _U.trim(line).length == 0){return;}
        if(header && line.match(RGX.metaDeclaration)){return;}
        header = false;
        result += "\n" + line;
      });
      return result;
    }
  };
  
  /**
   * General purpose parser.
   */
  var Parser = function(txt){
    this.txt = txt;
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
          return idx == 0 ? "\n" + t : "*" + t;
        }
      );
    },

    /**
     * Creates a list of all the org-node contents
     */
    nodeList: function(text){
      return _U.map( this.nodeTextList(text) ,
        function(t, idx){ return new Node(t); }
      );
    },

    buildTree: function(){
      var nodes = this.nodeList(this.txt);
      var root = nodes[0];
      var length = nodes.length;
      var done, i, j, level;
      for(i = 1; i < length ; i++){
        level = nodes[i].level;
        done = false;
        j = i;
        while(!done){
          j = j - 1;
          if(j < 0){break;}
          if(nodes[j].level < level){
            nodes[i].parent = nodes[j];
            nodes[j].children.push(nodes[i]);
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

  return {
    Node:       Node,
    Headline:   Headline,
    Parser:     Parser,
    NodeParser: NodeParser,
    parse:      function(txt){
      var parser = new Parser(txt);
      return parser.buildTree();
    }
  };

};

/***orgdoc***
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
Org.getRender = function(org, params){

  var OC = org.Content;
  var OM = org.Markup;
  var OO = org.Outline;
  var _U = org.Utils;

/***orgdoc***
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

  function escapeHtml(str){
    str = "" + str;
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/'/g, "&apos;");
    str = str.replace(/"/g, "&quot;");
    return str;
  }

  function unBackslash(str){
    str = "" + str;
    str = str.replace(/\\\\/g, "<br/>");
    str = str.replace(/\\ /g, "&nbsp;");
    str = str.replace(/\\(.)/g, "$1");
    str = str.replace(/\s--\s/g, " &#151; ");
    return str;
  }

  function htmlize(str){
    return unBackslash(escapeHtml(str));
  }

/***orgdoc***
*** renderMarkup                                                   :function:
     + Purpose :: this function converts the wiki-style markup of
                  Org-Mode into HTML.
     + Arguments ::
       + =str= :: any value, converted into a string at the beginning
                  of the function.
*/

  function renderMarkup(str){
    str = "" + str;
    str = escapeHtml(str);
    str = str.replace(/\/([^\s/][^/]*?[^\s/]|[^/])\//g, "<em>$1</em>");
    str = str.replace(/_([^\s_][^_]*?[^\s_]|[^_])_/g,   "<u>$1</u>");
    str = str.replace(/=([^\s=][^=]*?[^\s=]|[^=])=/g,   "<code>$1</code>");
    str = str.replace(/~([^\s~][^~]*?[^\s~]|[^~])~/g,   "<samp>$1</samp>");
    str = str.replace(/\*([^*\s][^*]*?[^*\s]|[^*])\*/g, "<strong>$1</strong>");
    str = str.replace(/\+([^\s+][^+]*?[^\s+]|[^+])\+/g, "<s>$1</s>");
    str = str.replace(/\\\\/g, "<br/>");
    str = str.replace(/\\ /g, "&nbsp;");
    str = str.replace(/\s--\s/g, " &#151; ");
    return str;
  }

/***orgdoc***

*** renderChildren                                                 :function:
     + Purpose :: provides a utility function to render all the
                  children of a =Node= or a =Block=.
     + Arguments :: none
     + Usage :: must be called with =.call(obj)= to provide the value
                for =this=. =this= must have an enumerable =children=
                property.

*/

  function renderChildren(){
    var i, out = "";
    for(i in this.children){
      if(this.children[i].render){
       out += this.children[i].render();
      }
    }
    return out;
  }



  OM.EmphInline.prototype.render = function(){
    return renderChildren.call(this);
  };
  OM.EmphRaw.prototype.render = function(){
    if(this.children.length){
      return renderChildren.call(this);
    }
    return "<span class='org-inline-raw'>" + 
            htmlize(this.content) + "</span>";
  };
  OM.EmphCode.prototype.render = function(){
    return "<code class='org-inline-code'>" + 
            htmlize(this.content) + "</code>";
  };
  OM.EmphVerbatim.prototype.render = function(){
    return "<samp class='org-inline-samp'>" + 
            htmlize(this.content) + "</samp>";
  };
  OM.EmphItalic.prototype.render = function(){
    return "<em class='org-inline-italic'>" + 
            renderChildren.call(this) + "</em>";
  };
  OM.EmphBold.prototype.render = function(){
    return "<strong class='org-inline-bold'>" + 
            renderChildren.call(this) + "</strong>";
  };
  OM.EmphUnderline.prototype.render = function(){
    return "<u class='org-inline-underline'>" + 
            renderChildren.call(this) + "</u>";
  };
  OM.EmphStrike.prototype.render = function(){
    return "<del class='org-inline-strike'>" + 
            renderChildren.call(this) + "</del>";
  };
  OM.Link.prototype.render = function(){
    return "<a class='org-inline-link' href='" + this.url + "'>" + 
            htmlize(this.desc) + "</a>";
  };
  OM.FootNoteRef.prototype.render = function(){
    var root = _U.root(this);
    console.log(root);
    console.log(this);
    console.log(root.fnByName[this.name]);
    var num = root.fnByName[this.name].num;
    return "<a name='fnref_" + this.name + "'/>" + 
            "<a class='org-inline-fnref' href='#fndef_" + this.name + "'><sup>" + 
            num + "</sup></a>";
  };



/***orgdoc***

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

  OC.RootBlock.prototype.render = function(){
    var out = "<div class='org_content'>\n";
    out += renderChildren.call(this);
    out += "</div>\n";
    return out;
  };

/***orgdoc***

*** Rendering =UlistBlock=
     =UlistBlock=s are rendered with a simple =ul= tag.

*/

  OC.UlistBlock.prototype.render = function(){
    var out = "<ul>\n";
    out += renderChildren.call(this);
    out += "</ul>\n";
    return out;
  };

/***orgdoc***

*** Rendering =OlistBlock=
     =OlistBlock=s are rendered with a simple =ol= tag.

     If the block has a =start= property different from =1=, it is
     inserted in the =start= attribute of the tag.

*/

  OC.OlistBlock.prototype.render = function(){
    var s = this.start;
    var out = "<ol" + (s === 1 ? ">\n" : " start='" + escapeHtml(s) + "'>\n");
    out += renderChildren.call(this);
    out += "</ol>\n";
    return out;
  };

/***orgdoc***

*** Rendering =DlistBlock=
     =DlistBlock=s are rendered with a =dl= tag.

     =DlistItemBlock=s will have to use =dt=/=dd= structure
     accordingly.

*/

  OC.DlistBlock.prototype.render = function(){
    var out = "<dl>\n";
    out += renderChildren.call(this);
    out += "</dl>\n";
    return out;
  };

/***orgdoc***

*** Rendering =UlistItemBlock= and =OlistItemBlocks=
     =UlistItemBlock=s and =0listItemBlocks= are rendered with a
     #simple =li= tag.

*/

  OC.UlistItemBlock.prototype.render =
  OC.OlistItemBlock.prototype.render = function(){
    var out = "<li>\n";
    out += renderChildren.call(this);
    out += "</li>\n";
    return out;
  };

/***orgdoc***

*** Rendering =DlistItemBlock=
     =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

     The content of the =dt= is the =title= attribute of the block.

     The content of the =dd= is the rendering of this block's children.

*/

  OC.DlistItemBlock.prototype.render = function(){
    var out = "<dt>" + this.titleInline.render() + "</dt>\n<dd>\n";
    out += renderChildren.call(this);
    out += "</dd>\n";
    return out;
  };

/***orgdoc***

*** Rendering =ParaBlock=
     =ParaBlock=s are rendered with a =p= tag.

     The content of the tag is the concatenation of this block's
     =this.lines=, passed to the =renderMarkup= function.

*/

  OC.ParaBlock.prototype.render = function(){
    return "<p>\n" + renderChildren.call(this); + "</p>\n";
  };

/***orgdoc***

*** Rendering =VerseBlock=
     =VerseBlock=s are rendered with a =p= tag, with class
     =verse=.

     All spaces are converted to unbreakable spaces.

     All new lines are replaced by a =br= tag.

*/

  OC.VerseBlock.prototype.render = function(){
    var out = "<p class='verse'>\n" + renderChildren.call(this); + "</p>\n";
    out = out.replace(/ /g, "&nbsp;");
    return out;
  };

/***orgdoc***

*** Rendering =QuoteBlock=
     =QuoteBlock=s are rendered with a =blockquote= tag.

     If the quote contains an author declaration (after a double dash),
     this declaration is put on a new line.

*/

  OC.QuoteBlock.prototype.render = function(){
    var out = "<blockquote>\n" + renderChildren.call(this); + "</blockquote>\n";
    return out;
  };

/***orgdoc***

*** Rendering =CenterBlock=
     =CenterBlock=s are rendered with a simple =center= tag.

*/

  OC.CenterBlock.prototype.render = function(){
    return "<center>\n" + renderChildren.call(this); + "</center>\n";
  };

/***orgdoc***

*** Rendering =ExampleBlock=
     =ExampleBlock=s are rendered with a simple =pre= tag.

     The content is not processed with the =renderMarkup= function, only
     with the =escapeHtml= function.

*/

  OC.ExampleBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = escapeHtml(content);
    var out = "<pre>\n" + markup + "</pre>\n";
    return out;
  };

/***orgdoc***


*** Rendering =SrcBlock=
     =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
     The =code= tag may have a class attribute if the language of the
     block is known. In case there is, the class would take the language 
     identifier.

     The content is not processed with the =renderMarkup= function, only
     with the =escapeHtml= function.

*/

  OC.SrcBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = escapeHtml(content);
    var l = this.language;
    var out = "<pre class='src'><code" +
              ( l ? " class='" + l + "'>":">") + 
              "\n" + markup + "</code></pre>\n";
    return out;
  };

/***orgdoc***

*** Rendering =HtmlBlock=
     =HtmlBlock=s are rendered by simply outputting the HTML content
     verbatim, with no modification whatsoever.

*/

  OC.HtmlBlock.prototype.render = function(){
    var out = this.lines.join("\n") + "\n";
    return out;
  };

/***orgdoc***

*** Rendering =CommentBlock=
     =CommentBlock=s are ignored.

*/

  OC.FndefBlock.prototype.render = 
  OC.CommentBlock.prototype.render = function(){
    return "";
  };

/***orgdoc***

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

  OO.Node.prototype.render = function(){
    var headline = this.level === 0 ? this.meta["TITLE"] : this.heading.getTitle();
    var headInline = OM.tokenize(this, headline).render();

    var html = "<section id='%ID%' class='orgnode level-%LEVEL%'>";
    html = html.replace(/%ID%/, this.id());
    html = html.replace(/%LEVEL%/, this.level);

    var title = "<div class='title'>%HEADLINE%%TAGS%</div>";
    title = title.replace(/%HEADLINE%/, headInline);
    var tags = "";
    _U.each(this.heading.getTags(), function(tag, idx){
      if(tag.length){
        tags += " <span class='tag'>" + tag + "</span>";
      }
    });
    title = title.replace(/%TAGS%/, tags);

    html += title;

    var contentHtml = this.contentNode.render();
    html += contentHtml;

    var childrenHtml = renderChildren.call(this);
    html += childrenHtml;

    if(_U.notEmpty(this.fnNameByNum)){
      var root = this;
      html += "<section class='org-footnotes'><title>Notes</title>";
      _U.each(root.fnNameByNum, function(name, idx){
        if(!name){return;}
        var fn = root.fnByName[name];
        var inline = fn.inline;
        var num = fn.num;
        html += "<p class='org-footnote'><a name='fndef_" + name + "'/>" + 
            "<a class='org-inline-fnref' href='#fnref_" + name + "'><sup>" + 
            num + "</sup></a>&nbsp;:&nbsp;<span id='fndef_" + name+ "'>" + 
            inline.render() + "</span></p>";
      });
      html += "</section>";
    }

    html += "</section>";
    return html;
  };


/***orgdoc***
** Conclusion

    This is the end of the function creating the default renderer.

*/

};

/***orgdoc***
* TODO =Org.API= : API

*/