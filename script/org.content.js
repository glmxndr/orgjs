Org.Content = (function(Org){

  var Content = {};

  var LineType = {
    "BLANK":        0,
    "NORMAL":       1,
    "ULITEM":       2,
    "OLITEM":       3,
    "DLITEM":       4,
    "VERSE":        5,
    "QUOTE":        6,
    "CENTER":       7,
    "EXAMPLE":      8
  };
  Content.LineType = LineType;

  function getLineType(line){
    // First test on a line beginning with a letter,
    // the most common case, to avoid making all the
    // other tests before returning the default.
    if(/^\s*[a-z]/i.exec(line)){
      return LineType.PARA;
    }
    // Then test all the other cases
    if(/^(?:\s*[+-] |\s+\* )/.exec(line)){
      if(/ :: /.exec(line)){
        return LineType.DLITEM;
      }
      return LineType.ULITEM;
    }
    if(/^\s*\d+[.)] /.exec(line)){
      return LineType.OLITEM;
    }
    if(/^\s*$/.exec(line)){
      return LineType.BLANK;
    }
    if(/#\+BEGIN_VERSE/.exec(line)){
      return LineType.VERSE;
    }
    if(/#\+BEGIN_QUOTE/.exec(line)){
      return LineType.QUOTE;
    }
    if(/#\+BEGIN_CENTER/.exec(line)){
      return LineType.CENTER;
    }
    if(/#\+BEGIN_EXAMPLE/.exec(line)){
      return LineType.EXAMPLE;
    }
    return LineType.PARA;
  }

  function getLineIndent(line){
    line = line || "";
    var indent = /^\s*/.exec(line)[0].length;
    return indent;
  }

  function getNewBlock(line, parent){
    var type = getLineType(line);
    if(type === LineType.ULITEM){
      return new UlistBlock(parent, line);
    }
    if(type === LineType.OLITEM){
      return new OlistBlock(parent, line);
    }
    if(type === LineType.DLITEM){
      return new DlistBlock(parent, line);
    }
    if(type === LineType.VERSE){
      return new VerseBlock(parent);
    }
    if(type === LineType.QUOTE){
      return new QuoteBlock(parent);
    }
    if(type === LineType.CENTER){
      return new CenterBlock(parent);
    }
    if(type === LineType.EXAMPLE){
      return new ExampleBlock(parent);
    }
    else return new ParaBlock(parent);
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
  Content.ParaBlock = ParaBlock;

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

  ParaBlock.prototype.consume = function(line) {
    this.lines.push(line);
    return this;
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  BEGINENDBLOCK
  var BeginEndBlock = function(parent){
    ContentBlock.call(this, parent);
    this.ended = false;
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
  var VerseBlock = function(parent){
    BeginEndBlock.call(this, parent);
    this.beginre = /#\+BEGIN_VERSE/;
    this.endre = /#\+END_VERSE/;
  };
  Content.VerseBlock = VerseBlock;

  VerseBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  QUOTEBLOCK
  var QuoteBlock = function(parent){
    BeginEndBlock.call(this, parent);
    this.beginre = /#\+BEGIN_QUOTE/;
    this.endre = /#\+END_QUOTE/;
  };
  Content.QuoteBlock = QuoteBlock;

  QuoteBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  CENTERBLOCK
  var CenterBlock = function(parent){
    BeginEndBlock.call(this, parent);
    this.beginre = /#\+BEGIN_CENTER/;
    this.endre = /#\+END_CENTER/;
  };
  Content.CenterBlock = CenterBlock;

  CenterBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  EXAMPLEBLOCK
  var ExampleBlock = function(parent){
    BeginEndBlock.call(this, parent);
    this.beginre = /#\+BEGIN_EXAMPLE/;
    this.endre = /#\+END_EXAMPLE/;
  };
  Content.ExampleBlock = ExampleBlock;

  ExampleBlock.prototype = Object.create(BeginEndBlock.prototype);

  ////////////////////////////////////////////////////////////////////////////////
  //  ULISTBLOCK
  var UlistBlock = function(parent, line){
    ContainerBlock.call(this, parent);
    this.indent = getLineIndent(line);
  };
  Content.UlistBlock = UlistBlock;

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
  Content.OlistBlock = OlistBlock;

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
  Content.DlistBlock = DlistBlock;

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
  Content.parse = function parseContent(lines){
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