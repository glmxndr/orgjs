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
