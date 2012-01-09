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
    var tokens = line.split(/\s*/);
    var token = tokens.unshift();
    var nexttoken;
    while(token){
      if(token.match(/#+INCLUDE:/)){
        nexttoken = _U.unquote(tokens.unshift());
        this.location = _U.path.concat(basepath, nexttoken);
      }
      else if(token.match(/src/)){
        this.beginend = "SRC";
        nexttoken = tokens[0] || "";
        if(nexttoken.match(/[a-z]+/)){
          this.srcType = tokens.unshift();
        }
      }
      else if(token.match(/example/)){
        this.beginend = "EXAMPLE";
      }
      else if(token.match(/quote/)){
        this.beginend = "QUOTE";
      }
      else if(token.match(/:prefix/)){
        this.prefix = _U.unquote(tokens.unshift());
      }
      else if(token.match(/:prefix1/)){
        this.prefix1 = _U.unquote(tokens.unshift());
      }
      else if(token.match(/:minlevel/)){
        this.minlevel = _U.unquote(tokens.unshift());
      }
      else if(token.match(/:lines/)){
        this.minlevel = _U.unquote(tokens.unshift());
      }
      token = tokens.unshift();
    }
  };
  Include.prototype.render = function(){
    
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
      return txt;
      /*
      var rgx = /\n *#+INCLUDE:[^\n]+/;
      var replacefn = function(){
        
      };
      txt.replace(rgx, replacefn);
      */
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
