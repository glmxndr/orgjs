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

  var Include = function(line, basepath){
    this.basepath = basepath;
    this.line = line;
    this.beginend = false;
    this.prefix = "";
    this.prefix1 = "";
    this.limitMin = 0;
    this.limitMax = Infinity;
    this.indent = /^\s*/.exec(line)[0] || "";

    var nexttoken, limitNum;
    var tokens = line.split(/\s+/);
    var token = tokens.shift();
    if(tokens.length > 0 && _U.blank(token)){
      token = tokens.shift();
    }
    while(token){
      if(token === "#+INCLUDE:"){
        nexttoken = _U.unquote(tokens.shift());
        this.location = _U.path.concat(basepath, nexttoken);
      }
      else if(token === "src"){
        this.beginend = token;
        nexttoken = tokens[0] || "";
        if(nexttoken.match(/[a-z-]+/)){
          this.srcType = tokens.shift();
        }
      }
      else if(token === "example"){
        this.beginend = token;
      }
      else if(token === "quote"){
        this.beginend = token;
      }
      else if(token === ":prefix"){
        this.prefix   = _U.unquote(tokens.shift());
      }
      else if(token === ":prefix1"){
        this.prefix1  = _U.unquote(tokens.shift());
      }
      else if(token === ":minlevel"){
        this.minlevel = _U.unquote(tokens.shift());
      }
      else if(token === ":lines"){
        this.limit = _U.unquote(tokens.shift());
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
      token = tokens.shift();
    }
  };
  Include.prototype.render = function(){
    var content = _U.get(this.location);

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
    var lines = content.split(/\n/);
    var result = "";
    var indent = this.indent;
    var first = false;
    var _this = this;
    _U.each(lines, function(v, idx){
      if(idx < _this.limitMin || idx > _this.limitMax + 1){return;}
      result += (_this.beginend ? indent : "") +
                (first ? _this.prefix1 : _this.prefix) +
                v +
                "\n";
      if(first){first = false;}
    });

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


  /**
   * General purpose parser.
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
      var rgx = /[\t ]*#\+INCLUDE:[^\n]+/g;
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
      console.log(txt);
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

  Parser.parse = function(txt, location){
    var parser = new Parser(txt, location);
    return parser.buildTree();
  };

  return Parser;

};