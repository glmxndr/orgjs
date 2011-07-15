/*
  Just a simple paragraph

  + Here starts a list with an item
    continuing here
  + Another item

    With a second paragraph

    - A sublist starts here
    - And continues
        here
    * Another item 
     delimiter
    And a third paragraph

  + Third outer item
  And closing paragraph.
*/

var LineType = {
  BLANK: 0,
  NORMAL: 1,
  ULITEM: 2,
  OLITEM: 3
};

function getLineType(line){
  if(/^(?:\s*[+-] |\s+\* )/.exec(line)){
    return LineType.ULITEM;
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
  var item = new ListItemBlock(this, line);
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
  var type = getLineType(line);
  var block;
  var indent = getLineIndent(line);
  if(this.children.length === 0){
    line = line.replace(/[+*-] /, '  ');
    block = new ParaBlock(this);
  }
  if(type === LineType.PARA){
    block = new ParaBlock(this);
  }
  else if(type === LineType.ULITEM && indent > this.indent){
    block = new UlistBlock(this, line);
  }
  this.children.push(block);
  return block.consume(line);
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

