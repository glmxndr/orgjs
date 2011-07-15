
function renderChildren(){
  var i, out = "";
  for(i in this.children){
    if(this.children[i].render){
     out += this.children[i].render();
    }
  }
  return out;
};

RootBlock.prototype.render = function(){
  var out = "<div class='org_content'>\n";
  out += renderChildren.call(this, out);
  out += "</div>\n";
  return out;
};

UlistBlock.prototype.render = function(){
  var out = "<ul>\n";
  out += renderChildren.call(this, out);
  out += "</ul>\n";
  return out;
};

OlistBlock.prototype.render = function(){
  var s = this.start;
  var out = "<ol" + (s === 1 ? ">\n" : " start='" + s + "'>\n");
  out += renderChildren.call(this, out);
  out += "</ol>\n";
  return out;
};

DlistBlock.prototype.render = function(){
  var out = "<dl>\n";
  out += renderChildren.call(this, out);
  out += "</dl>\n";
  return out;
};

UlistItemBlock.prototype.render = function(){
  var out = "<li>\n";
  out += renderChildren.call(this, out);
  out += "</li>\n";
  return out;
};

OlistItemBlock.prototype.render = UlistItemBlock.prototype.render;

DlistItemBlock.prototype.render = function(){
  var out = "<dt>" + this.title + "</dt>\n<dd>\n";
  out += renderChildren.call(this, out);
  out += "</dd>\n";
  return out;
};


ParaBlock.prototype.render = function(){
  var out = "<p>\n";
  out += this.lines.join("\n") + "\n";
  out += "</p>\n";
  return out;
};

VerseBlock.prototype.render = function(){
  var out = "<pre class='verse'>\n";
  out += this.lines.join("\n") + "\n";
  out += "</pre>\n";
  return out;
};