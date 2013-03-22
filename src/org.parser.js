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

  /*orgdoc
  ** =Parser= : the object to be returned by =Org.getParser=
     The parser creates a tree of =Org= =Node=s. It includes
     the referenced external files and generates a tree of nodes,
     each of them recursively parsed with the =Content= parser.
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
      var rgx = /^[\t ]*#\+INCLUDE:[^\n]+$/mg;
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
            nodes[j].append(nodes[i]);
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

  /*orgdoc
  ** Including external files
     This section deals with the =#\+INCLUDE:= tags, which allow to load another
     =Org= file into the current file.

     There are basically two strategies to include a file: 
     - ~HTTP GET~ :: if we detect that
       we're in a browser with jQuery, we use that to get the content from the
       included file with a GET request to the server, using the path in the include
       tag as a relative path to the current file being processed.
     - File system read :: if we detect that we're in Node.js (presence 
       of the 'fs' module), we read the file having a relative path to the current
       =Org= file given in the include tag.
     This behaviour is not coded here, though, it relies on the behaviour of the
     =_U.get()= function.

  *** =Include= object
  */
  var Include = function(line, basepath){
    this.basepath = basepath;
    this.line     = line;
    this.beginend = false;
    this.prefix   = "";
    this.prefix1  = "";
    this.limitMin = 0;
    this.limitMax = Infinity;
    this.parse(line, basepath);
  };

  /*orgdoc
  *** Parsing the include lines
  */
  Include.prototype.parse = function(line, basepath){
    var match = /#\+INCLUDE:\s+"([^"]+)"(?:\s+(example|quote|src))?/m.exec(line) || [];

    this.indent   = /^\s*/.exec(line)[0] || "";
    this.relPath  = match[1] || "";
    this.location = _U.path.concat(basepath, this.relPath);
    this.beginend = match[2];
    
    if(this.beginend === "src"){
      this.srcType = (/\ssrc\s+([^:\s]+)/.exec(line) || [])[1];
    }

    match = line.match(/:prefix\s+"([^"]+)"/);
    if(match){this.prefix   = match[1];}
    match = line.match(/:prefix1\s+"([^"]+)"/);
    if(match){this.prefix1  = match[1];}
    match = line.match(/:minlevel\s+("?)(\d+)\1/);
    if(match){this.minlevel = match[2];}
    match = line.match(/:lines\s+"(\d*-\d*)"/);
    if(match){
      this.limit = match[1];
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
  };

  /*orgdoc
  *** Rendering the included content
  */
  Include.prototype.render = function(){
    /*orgdoc
        + Loading the content from the location
    */
    var content = _U.get(this.location);

    /*orgdoc
        + Modifying the headlines levels (if =:minlevel= has been set)
    */
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

    /*orgdoc
        + Generating the included content from the fetched lines
    */
    var lines = content.split(/\n/);
    var result = "";
    var indent = this.indent;
    var first = true;
    var _this = this;
    _U.each(lines, function(v, idx){
      if(idx < _this.limitMin || idx > _this.limitMax + 1){return;}
      result += (_this.beginend ? indent : "") +
                (first ? (_this.prefix1 ? _this.prefix1 : _this.prefix) : _this.prefix) +
                v +
                "\n";
      if(first){first = false;}
    });

    /*orgdoc
        + Enclosing in a =BEGIN/END= block if needed
    */
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


  return Parser;

};
