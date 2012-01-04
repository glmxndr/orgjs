/*orgdoc+++/

* =Org.Content= : the content parser

  This section describes the parser for the actual content within the sections
  of the =org= file.

#+BEGIN_SRC js
/-orgdoc*/

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
    if(_U.blank(line)){
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
    var k;
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
    this.nodeType = "ContainerBlock";
    this.isContainer = true;
    this.children = [];
  };
  ContainerBlock.prototype.finalize = function(){};

  ////////////////////////////////////////////////////////////////////////////////
  //  ROOTBLOCK
  var RootBlock = function(parent){
    ContainerBlock.call(this, parent);
    this.nodeType = "RootBlock";
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
    this.nodeType = "ContentBlock";
    this.isContent = true;
    this.lines = [];
  };
  ContentBlock.prototype.finalize = function(){};

  ////////////////////////////////////////////////////////////////////////////////
  //  CONTENTMARKUPBLOCK
  var ContentMarkupBlock = function(parent){
    ContentBlock.call(this, parent);
    this.nodeType = "ContentMarkupBlock";
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
    this.nodeType = "ParaBlock";
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
    this.nodeType = "FndefBlock";
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
    this.nodeType = "BeginEndBlock";
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
    this.nodeType = "VerseBlock";
  };
  LineDef.VERSE.constr = Content.VerseBlock = VerseBlock;
  VerseBlock.prototype = Object.create(BeginEndBlock.prototype);
  VerseBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  QUOTEBLOCK
  var QuoteBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "QUOTE");
    this.nodeType = "QuoteBlock";
  };
  LineDef.QUOTE.constr = Content.QuoteBlock = QuoteBlock;
  QuoteBlock.prototype = Object.create(BeginEndBlock.prototype);
  QuoteBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  CENTERBLOCK
  var CenterBlock = function(parent, line){
    ContentMarkupBlock.call(this, parent);
    BeginEndBlock.call(this, parent, line, "CENTER");
    this.nodeType = "CenterBlock";
  };
  LineDef.CENTER.constr = Content.CenterBlock = CenterBlock;
  CenterBlock.prototype = Object.create(BeginEndBlock.prototype);
  CenterBlock.prototype.finalize = ContentMarkupBlock.finalize;

  ////////////////////////////////////////////////////////////////////////////////
  //  EXAMPLEBLOCK
  var ExampleBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "EXAMPLE");
    this.nodeType = "ExampleBlock";
    this.verbatim = true;
  };
  LineDef.EXAMPLE.constr = Content.ExampleBlock = ExampleBlock;
  ExampleBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  SRCBLOCK
  var SrcBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "SRC");
    this.nodeType = "SrcBlock";
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
    this.nodeType = "HtmlBlock";
    this.verbatim = true;
  };
  LineDef.HTML.constr = Content.HtmlBlock = HtmlBlock;
  HtmlBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  COMMENTBLOCK
  var CommentBlock = function(parent, line){
    BeginEndBlock.call(this, parent, line, "COMMENT");
    this.nodeType = "CommentBlock";
    this.verbatim = true;
  };
  LineDef.COMMENT.constr = Content.CommentBlock = CommentBlock;
  CommentBlock.prototype = Object.create(BeginEndBlock.prototype);


  ////////////////////////////////////////////////////////////////////////////////
  //  ULISTBLOCK
  var UlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.nodeType = "UlistBlock";
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
    this.nodeType = "OlistBlock";
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
    this.nodeType = "DlistBlock";
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
    this.nodeType = "ListItemBlock";
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
    this.nodeType = "UlistItemBlock";
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
    this.nodeType = "OlistItemBlock";
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
    this.nodeType = "DlistItemBlock";
    var title = (/^\s*[+*-] (.*) ::/).exec(line)[1];
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
    }
    if(current){current.finalize();}
    return root;
  };

  return Content;

};

/*orgdoc+/
#+END_SRC
/---orgdoc*/
