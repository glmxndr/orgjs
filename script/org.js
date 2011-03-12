var OrgJS = (function($, undefined){

  //////////////////////////////////////////////////////////////////////////////
  // REGEXP BANK
  var RGXP = {
    /**
     * A new line declaration, either windows or unix-like
     */
    newline: /\r?\n/,
    /**
     * Captures the first line of the string
     */
    firstLine: /^(.*)/,
    /**
     * Selects anything in the given string until the next heading, or the end.
     * Example : 
     * ----
     * some content
     * 
     * * next heading
     * ----
     * would match "some content\n\n*"
     * 
     * Captures everything except the star of the following heading.
     */
    beforeNextHeading: /^([\s\S]*?)(?:\n\*|$)/,
    /**
     * Parses a heading line, capturing :
     * - the stars
     * - the TODO status
     * - the priority
     * - the heading title
     * - the tags, if any, separated by colons
     */
    headingLine: /(\**)\s*(?:([A-Z]{4})\s+)?(?:\[#([A-Z])\]\s+)?(.*?)\s*(?:\s+:([A-Za-z0-9:]+):\s*)?(?:\n|$)/,
    /**
     * How a meta information begins ( "#+META_KEY:" )
     */
    metaDeclaration: /\s*#\+[A-Z0-9_]+:/,
    /**
     * A meta information line, capturing:
     * - the meta key,
     * - the meta value
     * 
     * Example:
     * ----
     *    #+TITLE: The title
     * ----
     * captures "TITLE", "The title" 
     */
    metaLine: /(?:^|\s*)#\+([A-Z0-9_]+):\s*(.*)(\n|$)/m,
    /**
     * The property section. Captures the content of the section.
     */
    propertySection: /:PROPERTIES:\s*\n([\s\S]+?)\n\s*:END:/,
    /**
     * Property line. Captures the KEY and the value.
     */
    propertyLine: /^\s*:([A-Z0-9_-]+):\s*(\S[\s\S]*)\s*$/im,
    /**
     * Clock section when several clock lines are defined.
     */
    clockSection: /:CLOCK:\s*\n([\s\S]+?)\n?\s*:END:/,
    /**
     * Matches a clock line, either started only, or finished.
     * Captures:
     *  - start date (yyyy-MM-dd)
     *  - start time (hh:mm)
     *  - end date (yyyy-MM-dd)
     *  - end time (hh:mm)
     *  - duration (hh:mm)
     */
    clockLine: /CLOCK: \[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\](?:--\[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\] =>\s*(-?\d+:\d\d))?/g,

    scheduled: /SCHEDULED: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,
    deadline: /DEADLINE: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/
  };

  //////////////////////////////////////////////////////////////////////////////
  // UTILS
  var Utils = {
    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },
    repeat: function(str, times){
      var result = "";
      for(var i=0; i<times; i++){
        result += str;
      }
      return result;
    },
    each: function(arr, fn){
      var name, length = arr.length, i = 0, isObj = length === undefined;
      if ( isObj ) {
        for ( name in arr ) {
          if ( fn.call( arr[ name ], arr[ name ], name ) === false ) {break;}
        }
      } else {
        if(!length){return;}
        for ( var value = arr[0];
          i < length && fn.call( value, value, i ) !== false; 
          value = arr[++i] ) {}
      }
    },
    map: function(arr, fn){
      var result = [];
      this.each(arr, function(val, idx){
        var mapped = fn.call(val, val, idx);
        if (mapped != null){result.push(mapped);}
      });
      return result;
    },
    log: function(o){
      if(console && console.log){console.log(o);}
    },
    firstLine: function(str){
      var match = RGXP.firstLine.exec(str);
      return match ? match[0] : "";
    },
    lines: function(str){
      if (!str && str !== ""){return [];}
      return str.split(RGXP.newline);
    }
  };
  var _U = Utils;

  /////////////////////////////////////////////////////////////////////////////
  // ORG NODE : corresponds to a line starting with stars "*** ..."
  
  var OrgNode = function(whole, params){
    params = params || {};
    this.doc_id = params.doc_id;
    this.parent = params.parent;
    this.children = params.children || [];
    
    this.whole = whole;
    this.parser = new NodeParser(this.whole);
    this.heading = this.parser.getHeading();
    this.level = params.level || (this.heading.getStars() || "").length;
    
    this.properties = this.parser.getProperties();
    this.meta = this.parser.getMeta();
    this.content = this.parser.getContent();
    
  };

  OrgNode.prototype = {
    // Computes the ID of this node
    siblings: function(){
      if(this.parent){
        return this.parent.children;
      }
      else return [];
    },
    id: function(){
      if (!this.parent){
        return this.doc_id 
                ? this.doc_id
                : "doc#" + (OrgNode.doc_count++) + "/";
      }
      return this.parent.id() + "" + this.siblings().indexOf(this) + "/";
    },
    // Renders the node as html
    render: function(){
      
      var title = this.level === 0 ? this.meta["TITLE"] : this.heading.getTitle();
      
      var html = $("<section id='" + this.id()
        + "' class='orgnode level-" + this.level
        + "'><div class='title'>" //+ _U.repeat("*", this.level) 
        + " " + title
        + "</div></section>");

      var title = $('div.title', html);
      _U.each(this.heading.getTags(), function(tag, idx){
        if(tag.length){
          title.append(" <span class='tag'>" + tag + "</span>");
        }
      });
      var properties = this.properties; 
      var details = $("<details/>");
      var dl = $("<dl/>").appendTo(details);
      _U.each(properties, function(val, key){
        dl.append("<dd>" + key + "</dd><dt>" + val + "</dt>");
      });
      
      title.after(details);
      html.append(new ContentRenderer(this.parser.getContent()).render());
      _U.each(this.children, function(child, idx){
        html.append(child.render());
      });
      return html;
    }
  };
  
  /**
   * Counting the documents generated in this page.
   * Helps to generate an ID for the nodes 
   * when no doc_id is given in the root node.
   */
  OrgNode.doc_count = 0;
  
  /////////////////////////////////////////////////////////////////////////////
  // RENDERING
  /**
   * Content renderer : works line by line and creates the HTML structure
   */
  var ContentRenderer = function(txt){
    this.content = txt;
  };
  ContentRenderer.prototype = {
    render: function(){
      var content = this.content;
      content = content.replace(/\/([^\s][^/]*[^\s])\//g, "<em>$1</em>");
      content = content.replace(/\\\\/g, "<br/>");
      content = content.replace(/\@([^\s][^@]*[^\s])\@/g, "<code>$1</code>");
      content = content.replace(/\*([^\s][^*]*[^\s])\*/g, "<strong>$1</strong>");
      content = content.replace(/#\+BEGIN_SRC(?:\s+([^'"\s]+))?\s*\n([\s\S]*?)\n?\s*#\+END_SRC/g, "<code class='$1'><pre>$2</pre></code>");
      content = content.replace(/#\+BEGIN_QUOTE\s*\n([\s\S]*?)\n?\s*#\+END_QUOTE/g, "<blockquote>$1</blockquote>");
      content = content.replace(/\+([^\s][^+]*[^\s])\+/g, "<del>$1</del>");
      return content;
    }
  };
  
  var Line = {};
  Line.getType = function(text){
    if(_U.trim(text).length == 0){return Line.TYPE.EMPTY;}
    if(text.match(/^(?:\s*[+-]|\s+\*)\s+/)){return Line.TYPE.ULIST;}
    if(text.match(/^\s*\d+[.)]\s+/)){return Line.TYPE.OLIST;}
    if(text.match(/^\s*>\s+/)){return Line.TYPE.QUOTE;}
    if(text.match(/^\s*:\s+/)){return Line.TYPE.SRC;}

    if(text.match(/^\s*#+BEGIN/)){return Line.TYPE.BEGIN;}
    if(text.match(/^\s*#+END/)){return Line.TYPE.END;}
    return Line.TYPE.TEXT;
  };
  
  /////////////////////////////////////////////////////////////////////////////
  // PARSING
  
  /**
   * HeadingLine embeds the parsing of a heading line.
   */
  var HeadingLine = function(txt){
    this.repr = _U.trim(txt);
    this.match = RGXP.headingLine.exec(this.repr) || [];
  };
  HeadingLine.prototype = {
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
      this.heading = new HeadingLine(firstLine);
      return this.heading;
    },
    /**
     * Returns the map of headers (defined by "#+META: ..." line definitions)
     */
    getMeta: function(){
      if(this.meta){return this.meta;}
      var content = this.content;
      content = content.replace(RGXP.headingLine, "\n");
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
      content = content.replace(RGXP.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      content = content.split(subHeadingStars)[0];
      var props = this.props = {};
      var propMatch = RGXP.propertySection.exec(content);
      if(!propMatch){return this.props;}
      var propLines = _U.lines(propMatch[1]);
      _U.each(propLines, function(line, idx){
        var match = RGXP.propertyLine.exec(line);
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
      content = content.replace(RGXP.headingLine, "\n");
      var subHeadingStars = "\n" + this.getHeading().getStars() + "*";
      _U.log(subHeadingStars);
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
      content = content.replace(RGXP.propertySection, "");
      content = content.replace(RGXP.scheduled, "");
      content = content.replace(RGXP.deadline, "");
      content = content.replace(RGXP.clockSection, "");
      content = content.replace(RGXP.clockLine, "");
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
      var lines = txt.split(RGXP.newline);
      _U.each(lines, function(line, idx){
        if(_U.trim(line).length == 0){return true;}
        if(!line.match(RGXP.metaDeclaration)){return false;} // we went ahead the headers : break the loop
        var match = RGXP.metaLine.exec(line);
        if (match){
          result[match[1]] = match[2];
        }
        return true;
      });
      // _U.log(result);
      return result;
    },
    /**
     * Returns the given text without the "#+HEADER: Content" lines at the beginning
     */
    removeHeaders: function(txt){
      var result = "";
      var lines = txt.split(RGXP.newline);
      var header = true;
      _U.each(lines, function(line, idx){
        if(header && _U.trim(line).length == 0){return;}
        if(header && line.match(RGXP.metaDeclaration)){return;}
        header = false;
        result += "\n" + line;
      });
      return result;
    }
  };
  
  /**
   * General purpose parser.
   */
  var Parser = function(txt){
    this.txt = txt;
  };
  Parser.prototype = {
    /**
     * Creates a list of all the org-node contents
     */
    nodeTextList: function(text){
      var content = text;
      return _U.map(content.split(/^\*/m), function(t, idx){return idx == 0 ? "\n" + t : "*" + t;});
    },
    /**
     * Creates a list of all the org-node contents
     */
    nodeList: function(text){
      return _U.map(this.nodeTextList(text), function(t, idx){return new OrgNode(t);});
    },
    buildTree: function(){
      var nodes = this.nodeList(this.txt);
      var length = nodes.length;
      var done, j, level;
      for(var i = 1; i < length ; i++){
        level = nodes[i].level;
        done = false;
        j = i;
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
      return nodes[0];
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  function parse_org(txt){
    var parser = new Parser(txt);
    return parser.buildTree().render();
  }

  return {
    parse:           parse_org,
    Utils:           _U,
    Node:            OrgNode,
    Heading:         HeadingLine,
    Parser:          Parser,
    NodeParser:      NodeParser, 
    ContentRenderer: ContentRenderer,
    RegExps:         RGXP
  };

}(jQuery));

