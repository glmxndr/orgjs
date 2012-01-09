/*orgdoc

* =Org.Outline= : the outline/headlines parser

  This section describes the outline parser.
*/

Org.getOutline = function(org, params){

  var _P = params;
  var _R = org.Regexps;
  var OC = org.Content;
  var _U = org.Utils;

  /////////////////////////////////////////////////////////////////////////////
  // NODE : corresponds to a line starting with stars "*** ..."

  var Node = function(whole, params){
    params          = params || {};
    
    this.nodeType = "Node";

    this.docid      = params.docid;
    this.parent     = params.parent;
    this.children   = params.children || [];
    
    this.whole      = whole;
    this.parser     = new NodeParser(this.whole);
    this.heading    = this.parser.getHeading();
    this.level      = params.level || (this.heading.getStars() || "").length;
    
    this.properties = this.parser.getProperties();
    this.meta       = this.parser.getMeta();
    this.content    = this.parser.getContent();

  };

  /**
   * Counting the documents generated in this page.
   * Helps to generate an ID for the nodes
   * when no docid is given in the root node.
   */
  Node.tocnum = 0;

  Node.prototype = {
    parseContent: function(){
      var lines = _U.lines(this.content);
      this.contentNode = OC.parse(this, lines);
    },

    siblings: function(){
      return this.parent ? this.parent.children : [];
    },

    // Computes the ID of this node
    id: function(){
      if (!this.parent){
        return this.docid || "doc#" + (Node.tocnum++) + "/";
      }
      return this.parent.id() + "" + this.siblings().indexOf(this) + "/";
    },

    addFootnoteDef: function(inline, name){
      if(this.fnByName === void(0)){
        this.fnByName    = {};
        this.fnNameByNum = [];
        this.fnNextNum   = 1;
      }
      if(!name){name = "" + this.fnNextNum;}
      if(this.fnByName[name]){
        this.fnByName[name].inline = inline;
        return this.fnNextNum;
      }
      else {
        this.fnByName[name] = {"inline": inline, "num": this.fnNextNum, "name": name};
        this.fnNameByNum[this.fnNextNum] = name;
        this.fnNextNum = this.fnNextNum + 1;
        return this.fnNextNum - 1;
      }
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // PARSING

  /**
   * Headline embeds the parsing of a heading line.
   */
  var Headline = function(txt){
    this.nodeType = "Headline";
    this.repr = _U.trim(txt);
    this.match = _R.headingLine.exec(this.repr) || [];
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
      this.heading  = new Headline(firstLine);
      return this.heading;
    },

    /**
     * Returns the map of headers (defined by "#+META: ..." line definitions)
     */
    getMeta: function(){
      if(this.meta){return this.meta;}
      var content = this.content;
      if(this.level > 0){content = content.replace(_R.headingLine, "\n");}
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
      content = content.replace(_R.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      content = content.split(subHeadingStars)[0];
      var props = this.props = {};
      var propMatch = _R.propertySection.exec(content);
      if(!propMatch){return this.props;}
      var propLines = _U.lines(propMatch[1]);
      _U.each(propLines, function(line, idx){
        var match = _R.propertyLine.exec(line);
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
      content = content.replace(_R.headingLine, "\n");
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
      content = content.replace(_R.propertySection, "");
      content = content.replace(_R.scheduled, "");
      content = content.replace(_R.deadline, "");
      content = content.replace(_R.clockSection, "");
      content = content.replace(_R.clockLine, "");
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
      var lines = txt.split(_R.newline);
      _U.each(lines, function(line, idx){
        if(_U.blank(line)){return true;}
        if(!line.match(_R.metaDeclaration)){return false;} // we went ahead the headers : break the loop
        var match = _R.metaLine.exec(line);
        if (match){
          if(result[match[1]]){
            result[match[1]] = result[match[1]] + "\n" + match[2];
          } else {
            result[match[1]] = match[2];
          }
        }
        return true;
      });
      return result;
    },

    /**
     * Returns the given text without the "#+HEADER: Content" lines at the beginning
     */
    removeHeaders: function(txt){
      var result = "";
      var lines  = txt.split(_R.newline);
      var header = true;
      _U.each(lines, function(line, idx){
        if(header && _U.blank(line)){return;}
        if(header && line.match(_R.metaDeclaration)){return;}
        header = false;
        result += "\n" + line;
      });
      return result;
    }
  };


  var Outline = {
    Node:       Node,
    Headline:   Headline,
    NodeParser: NodeParser
  };

  return Outline;

};
