/***orgdoc***
#+TITLE:     Org-Mode Javascript Parser

This project aims to provide a parser and easily customizable renderer
for [[http://orgmode.org/][Org-Mode]] files in JavaScript.

* =Org= : the Main object

  The global context is extended with only one object, named =Org=.

*/
var Org = {
  version: "0.1",   
  apiversion: "7.6"
};
/***orgdoc***

* =Org.Regexps= : the regexp bank

  The parser needs a lot of regular expressions.
  Non trivial regexps will be found in the file =org.regexps.js=, 
  and accessible under the object =Org.Regexps=.

*/

Org.Regexps = (function(Org){
  
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
        (this._bBlk[k] = new RegExp("^\\s*#\\+BEGIN_" + type + "|\\s\n]"));
    },

    _eBlk: {},
    endBlock: function(type){
      return this._eBlk[k] || 
        (this._eBlk[k] = new RegExp("^\\s*#\\+END_" + type + "|\\s\n]"));
    }

  };

  return RGX;
  
}(Org));

/***orgdoc***
* =Org.Utils= : useful functions

  Many functionalities are used throughout the parser, mainly to process
  strings. The =Org.Utils= object contains these functions.

*/

Org.Utils = (function(Org){
  
  var RGX = Org.Regexps;

  return {
    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    repeat: function(str, times){
      var result = "";
      for(var i=0; i<times; i++){
        result += str;
      }
      return result;
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
    }
  };

}(Org));

/***orgdoc***

* =Org.Outline= : the outline/headlines parser

  This section describes the outline parser.

*/

Org.Outline = (function(Org, undefined){

  var RGX = Org.Regexps;
  var _U = Org.Utils;

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
      //console.log(content);
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
      var length = nodes.length;
      var done, j, level;
      for(var i = 1; i < length ; i++){
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
      return nodes[0];
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

}(Org));

/***orgdoc***

* =Org.Content= : the content parser

  This section describes the parser for the actual content within the sections
  of the =org= file.

*/

Org.Content = (function(Org){

  var _U  = Org.Utils;
  var RGX = Org.Regexps;

  // The object that will be returned, and filled throughout this function.
  var Content = {};

  var LineDef = (function(){
    var l = -1;
    return {
      "BLANK":    {id: ++l},
      "PARA":     {id: ++l},
      "ULITEM":   {id: ++l},
      "OLITEM":   {id: ++l},
      "DLITEM":   {id: ++l},
      "VERSE":    {id: ++l, beginEnd:1},
      "QUOTE":    {id: ++l, beginEnd:1},
      "CENTER":   {id: ++l, beginEnd:1},
      "EXAMPLE":  {id: ++l, beginEnd:1}
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
    // Then test all the other cases
    if(/^\s+[+*-] /.exec(line)){
      if(/ :: /.exec(line)){
        return LineType.DLITEM;
      }
      return LineType.ULITEM;
    }
    if(/^\s*\d+[.)] /.exec(line)){
      return LineType.OLITEM;
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

  ////////////////////////////////////////////////////////////////////////////////
  //  ROOTBLOCK
  var RootBlock = function(){
    ContainerBlock.call(this, null);
  };
  Content.RootBlock = RootBlock;

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

  ////////////////////////////////////////////////////////////////////////////////
  //  PARABLOCK
  var ParaBlock = function(parent){
    ContentBlock.call(this, parent);
    this.indent = parent.indent || 0;
  };
  LineDef.PARA.constr = Content.ParaBlock = ParaBlock;

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
    this.lines.push(line);
    return this;
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

  BeginEndBlock.prototype.accept      = function(line){return !this.ended;};
  BeginEndBlock.prototype.treatBegin  = function(line){};
  BeginEndBlock.prototype.consume     = function(line){
    if(this.beginre.exec(line)){ this.treatBegin(line); }
    else if(this.endre.exec(line)){ this.ended = true; }
    else { this.lines.push(line); }
    return this;
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  VERSEBLOCK
  var VerseBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "VERSE");
  };
  LineDef.VERSE.constr = Content.VerseBlock = VerseBlock;
  VerseBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  QUOTEBLOCK
  var QuoteBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "QUOTE");
  };
  LineDef.QUOTE.constr = Content.QuoteBlock = QuoteBlock;
  QuoteBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  CENTERBLOCK
  var CenterBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "CENTER");
  };
  LineDef.CENTER.constr = Content.CenterBlock = CenterBlock;
  CenterBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  EXAMPLEBLOCK
  var ExampleBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "EXAMPLE");
  };
  LineDef.EXAMPLE.constr = Content.ExampleBlock = ExampleBlock;
  ExampleBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  ULISTBLOCK
  var UlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = getLineIndent(line);
  };
  LineDef.ULITEM.constr = Content.UlistBlock = UlistBlock;

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
    this.title = /^\s*[+*-] (.*) :: /.exec(line)[1];
  };
  Content.DlistItemBlock = DlistItemBlock;

  DlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
  DlistItemBlock.prototype.preprocess = function(line){
    return line.replace(/^(\s*)[+*-]\s+.*? :: /, "$1  ");
  };

  ////////////////////////////////////////////////////////////////////////////////
  //       PARSECONTENT
  Content.parse = function(lines){
    var root = new RootBlock();
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
          current = current.parent;
        }
      }
      line = lines.shift();
    };
    return root;
  };

  return Content;

}(Org));

/***orgdoc***
* Default Rendering
  :PROPERTIES:
  :author: G.A.
  :file: org.render.js
  :END:

  This section provides a default HTML renderer for the parsed tree.

  It is intended to provide an example of how to attach rendering
  functions to the =Outline.Node='s and the different
  =Content.Block='s prototypes.

** Initialisations
    Working in the context of the =Org= object. We will need, as
    usual, some shortcuts to the =Utils=, and to =Org.Content= and
    =Org.Outline=.

*/
(function(Org){

  var OC = Org.Content;
  var OO = Org.Outline;
  var _U = Org.Utils;

/***orgdoc***
** Utility functions
*** escapeHtml(str)                                                :function:
     + Purpose :: The =escapeHtml= function escapes the forbidden
                  characters in HTML/XML: =&=, =>=, =<=, ='= and ="=,
                  which are all translated to their corresponding
                  entity.
     + Arguments :: =str=
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

/***orgdoc***
*** renderMarkup                                                   :function:
     + Purpose :: this function converts the wiki-style markup of
                  Org-Mode into HTML.
     + Arguments :: =str=
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
    var out = "<dt>" + renderMarkup(this.title) + "</dt>\n<dd>\n";
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
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<p>\n" + markup + "</p>\n";
    return out;
  };

/***orgdoc***

*** Rendering =VerseBlock=
     =VerseBlock=s are rendered with a =p= tag, with class
     =verse=.

     All spaces are converted to unbreakable spaces.

     All new lines are replaced by a =br= tag.

*/

  OC.VerseBlock.prototype.render = function(){
    var content = this.lines.join("\\\\\n") + "\n";
    var markup = renderMarkup(content);
    markup = markup.replace(/ /g, "&nbsp;");
    var out = "<p class='verse'>\n" + markup + "</p>\n";
    return out;
  };

/***orgdoc***

*** Rendering =QuoteBlock=
     =QuoteBlock=s are rendered with a =blockquote= tag.

     If the quote contains an author declaration (after a double dash),
     this declaration is put on a new line.

*/

  OC.QuoteBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    content = content.replace(/\s(--\s)/g, "\\\\\n\\ \\ \\  $1");
    var markup = renderMarkup(content);
    var out = "<blockquote>\n" + markup + "</blockquote>\n";
    return out;
  };

/***orgdoc***

*** Rendering =CenterBlock=
     =CenterBlock=s are rendered with a simple =center= tag.

*/

  OC.CenterBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<center>\n" +
              markup + "</center>\n";
    return out;
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

    var html = "<section id='%ID%' class='orgnode level-%LEVEL%'>" +
        "%TITLE%\n" +
        "%CONTENT%\n" +
        "%CHILDREN%" +
      "</section>";
    html = html.replace(/%ID%/, this.id());
    html = html.replace(/%LEVEL%/, this.level);

    var title = "<div class='title'>%HEADLINE%%TAGS%</div>";
    title = title.replace(/%HEADLINE%/, renderMarkup(headline));
    var tags = "";
    _U.each(this.heading.getTags(), function(tag, idx){
      if(tag.length){
        tags += " <span class='tag'>" + tag + "</span>";
      }
    });
    title = title.replace(/%TAGS%/, tags);

    html = html.replace(/%TITLE%/, title);

    var contentTxt = this.parser.getContent();
    var lines = _U.lines(contentTxt);
    this.contentNode = Org.Content.parse(lines);
    var contentHtml = this.contentNode.render();
    html = html.replace(/%CONTENT%/, contentHtml);

    var childrenHtml = renderChildren.call(this);
    html = html.replace(/%CHILDREN%/, childrenHtml);
    return html;
  };


/***orgdoc***
** Conclusion

    This is the end of the function creating the default renderer.

*/

}(Org));
