var LineType = {
  BLANK: 0,
  NORMAL: 1,
  ULITEM: 2,
  OLITEM: 3,
  DLITEM: 4
};

function getLineType(line){
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
  return LineType.PARA;
}

function getLineIndent(line){
  line = line || "";
  var indent = /^\s*/.exec(line)[0].length;
  console.log("" + indent + " = indent of '" + line + "'");
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

RootBlock.prototype.accept  = function(line){return true;};

RootBlock.prototype.consume = function(line){
  var block = getNewBlock(line, this);
  this.children.push(block);
  //console.log(block);
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

ParaBlock.prototype.accept = function(line){
  var indent;
  var type = getLineType(line);
  if(type === LineType.BLANK){
    if(this.ended){return true;}
    this.ended = true; return true;
  }
  if(type !== LineType.PARA){return false;}
  if(this.ended){return false;}

  // If the parent is the root (= has no parent)
  // then the indentation does not matter
  if(!this.parent.parent){return true;}

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
//  ULISTBLOCK
var UlistBlock = function(parent, line){
  ContainerBlock.call(this, parent);
  this.indent = getLineIndent(line);
};

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

DlistItemBlock.prototype = Object.create(ListItemBlock.prototype);
DlistItemBlock.prototype.preprocess = function(line){
  return line.replace(/^(\s*)[+*-]\s+.*? :: /, "$1  ");
};

////////////////////////////////////////////////////////////////////////////////
//       PARSECONTENT
function splitLines(txt){
  return txt.split("\n");  
}

function parseContent(lines){
  var root = new RootBlock();
  //console.log(root);
  var current = root;
  var line = lines.shift();
  //console.log(line);
  while(line !== undefined && getLineType(line) === LineType.BLANK){
    line = lines.shift();
  }
  while(line !== undefined){
    //console.log("===> Treating line : '" + line + "'");
    //console.log("     Current block :");console.log(current);
    if(current.accept(line)){
      current = current.consume(line);
    }
    else {
      while(current = current.parent){
        if(current.accept(line)){
          current = current.consume(line);
          break;
        }
      }
    }
    line = lines.shift();
  };
  return root;
}

