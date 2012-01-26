/*orgdoc
* Markup parser

  This file contains the code for the Org-Mode wiki-style markup.
*/
Org.getMarkup = function(org, params){

  var _U = org.Utils;
  var _C = org.Config;

  var Markup = {};

  /*orgdoc
  ** Link management
  *** Link type definitions
  */
  var LinkDefs = (function(){
    var l = 0;
    return {
      HTTP:     {id:++l, re:/^https?:/},
      FTP:      {id:++l, re:/^ftp:/},
      FILE:     {id:++l, re:/^(?:file:|\.{1,2}\/)/},
      MAIL:     {id:++l, re:/^mailto:/},
      ID:       {id:++l, re:/^#/},
      PROTOCOL: {id:++l, re:/:/},
      SEARCH:   {id:++l, re:/.*/}
    };
  }());

  var LinkType={};  _U.map(LinkDefs, function(v,k){LinkType[k] = v.id;});
  var LinkTypeArr = _U.map(LinkType, function(v,k){return LinkDefs[k];});

  function getLinkType(link){
    var k;
    for(k in LinkTypeArr){
      if(link.url.match(LinkTypeArr[k].re)){return LinkType[k];}
    }
  }

  /*orgdoc
  *** =Link= object
  */
  var Link = function(parent, raw, url, desc, token){
    this.nodeType = "Link";
    this.raw = raw;
    this.parent = parent;
    this.url = url;
    this.desc = desc;
    this.token = token;
    this.type = getLinkType(this);
  };
  Markup.Link = Link;

  /*orgdoc
  ** Footnote references
     Footnotes have definitions as blocks in the =Content= section. This section deals
     only with footnote references from within the markup.
  */
  var FootNoteRef = function(parent, raw, name, token){
    this.nodeType = "FootNoteRef";
    this.raw = raw;
    this.parent = parent;
    this.name = name;
    this.token = token;
  };
  Markup.FootNoteRef = FootNoteRef;

  /*orgdoc
  ** Typographic markup
  *** =EmphMarkers= : emphasis marker abstract object
  */
  //   + Allowed pre:      " \t('\"{"
  //   + Allowed post:     "- \t.,:!?;'\")}\\"
  //   + Forbidden border: " \t\r\n,\"'"
  //   + Allowed body:     "."
  // (defcustom org-emphasis-regexp-components
  //   '(" \t('\"{" "- \t.,:!?;'\")}\\" " \t\r\n,\"'" "." 1)
  //   "Components used to build the regular expression for emphasis.
  // This is a list with five entries.  Terminology:  In an emphasis string
  // like \" *strong word* \", we call the initial space PREMATCH, the final
  // space POSTMATCH, the stars MARKERS, \"s\" and \"d\" are BORDER characters
  // and \"trong wor\" is the body.  The different components in this variable
  // specify what is allowed/forbidden in each part:
  // pre          Chars allowed as prematch.  Beginning of line will be allowed too.
  // post         Chars allowed as postmatch.  End of line will be allowed too.
  // border       The chars *forbidden* as border characters.
  // body-regexp  A regexp like \".\" to match a body character.  Don't use
  //              non-shy groups here, and don't allow newline here.
  // newline      The maximum number of newlines allowed in an emphasis exp.
  // Use customize to modify this, or restart Emacs after changing it."
  //   :group 'org-appearance
  //   :set 'org-set-emph-re
  //   :type '(list
  //     (sexp    :tag "Allowed chars in pre      ")
  //     (sexp    :tag "Allowed chars in post     ")
  //     (sexp    :tag "Forbidden chars in border ")
  //     (sexp    :tag "Regexp for body           ")
  //     (integer :tag "number of newlines allowed")
  //     (option (boolean :tag "Please ignore this button"))))

  var EmphMarkers = {};
  _U.each("/*~=+_".split(""), function(t){EmphMarkers[t] = {};});

  EmphMarkers.getInline = function(token, parent){
    var constr = this[token].constr;
    return new constr(parent);
  };
  EmphMarkers.getRegexpAll = function(){
    return (/(^(?:.|\n)*?)(([\/*~=+_])([^\s].*?[^\s\\]|[^\s\\])\3)/);
  };
  Markup.EmphMarkers = EmphMarkers;


  /*orgdoc
  ** Inline nodes containing either inline nodes or raw textual content
  *** =makeInline=            :function:
       + Purpose :: Creates an inline node object
       + Arguments ::
         + =constr= :: constructor for the object to build ;
                       should build an object with a =consume()= property
         + =parent= :: parent of the node to build ; ust have an =adopt= method
         + =food= :: textual content the new inline node has to parse as subnodes
  */
  function makeInline(constr, parent, food){
    var inline = new constr(parent);
    parent.adopt(inline);
    if(food){inline.consume(food);}
    return inline;
  }

  /*orgdoc
  *** =EmphInline= : abstract high-level inline node
  */
  var EmphInline = function(parent){
    this.nodeType = "EmphInline";
    this.parent = parent;
    this.children = [];
  };
  EmphInline.prototype.adopt = function(child){
    this.children.push(child);
    child.parent = this;
  };
  EmphInline.prototype.replaceTokens = function(tokens){
    if(this.children.length){
      _U.each(this.children, function(v){v.replaceTokens(tokens);});
    }
    if(this.content && this.content.length){
      var content = this.content;
      var pipedKeys =  _U.joinKeys(tokens, "|");
      if(_U.blank(pipedKeys)){return;}
      var rgx = new RegExp('^((?:.|\n)*?)(' + pipedKeys + ')((?:.|\n)*)$');
      var match, pre, token, rest;
      var inline = new EmphInline(this);
      match = rgx.exec(content);
      while(match){
        pre = match[1]; token = match[2]; rest = match[3];
        if(_U.notBlank(pre)){ makeInline(EmphRaw, inline, pre); }
        inline.adopt(tokens[token]);
        content = rest;
        match = rgx.exec(content);
      }
      if(inline.children.length){
        if(_U.notBlank(rest)){ makeInline(EmphRaw, inline, rest); }
        this.content = "";
        this.adopt(inline);
      }
    }
  };
  EmphInline.prototype.consume = function(content){
    var regexp = EmphMarkers.getRegexpAll();
    var match;
    var rest = content;
    var pre, hasEmph, type, inner, length;
    var raw, sub;
    while((_U.trim(rest).length > 0) && (match = regexp.exec(rest))){
      pre = match[1];
      hasEmph = match[2];
      token = match[3] || "";
      inner = match[4] || "";
      length = pre.length + inner.length + (hasEmph ? 2 : 0);
      if(length === 0){break;}
      rest = rest.substr(length);
      if(_U.notBlank(pre)){ makeInline(EmphRaw, this, pre); }
      if(hasEmph !== void(0)){
        makeInline(EmphMarkers[token].constr, this, inner);
      }
    }
    if(_U.notBlank(rest)){ makeInline(EmphRaw, this, rest); }
  };
  Markup.EmphInline = EmphInline;

  /*orgdoc
  *** End-point node types
      Basic inline types containing raw text content.
      Can not contain anything else than text content.
  **** =EmphRaw= : basic text
  */
  var EmphRaw = function(parent){
    EmphInline.call(this, parent);
    this.nodeType = "EmphRaw";
    this.recurse = false;
  };
  EmphRaw.prototype = Object.create(EmphInline.prototype);
  EmphRaw.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphRaw = EmphRaw;

  /*orgdoc
  **** =EmphCode= : code example
  */
  var EmphCode = function(parent){
    EmphRaw.call(this, parent);
    this.nodeType = "EmphCode";
  };
  EmphCode.prototype = Object.create(EmphRaw.prototype);
  EmphMarkers["="].constr = EmphCode;
  Markup.EmphCode = EmphCode;

  /*orgdoc
  **** =EmphVerbatim= : unedited content
  */
  var EmphVerbatim = function(parent){
    EmphRaw.call(this, parent);
    this.nodeType = "EmphVerbatim";
  };
  EmphVerbatim.prototype = Object.create(EmphRaw.prototype);
  EmphMarkers["~"].constr = EmphVerbatim;
  Markup.EmphVerbatim = EmphVerbatim;

  /*orgdoc
  *** Recursing nodes
      These nodes contain other sub nodes (either =EmphRaw=,
      other =EmphInline= subtypes, =Link=s, etc.).
  **** =EmphItalic= : recursing node
  */
  var EmphItalic = function(parent){
    EmphInline.call(this, parent);
    this.nodeType = "EmphItalic";
    this.recurse = true;
  };
  EmphItalic.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["/"].constr = EmphItalic;
  Markup.EmphItalic = EmphItalic;

  /*orgdoc
  **** =EmphBold= : recursing node
  */
  var EmphBold = function(parent){
    EmphInline.call(this, parent);
    this.nodeType = "EmphBold";
    this.recurse = true;
  };
  EmphBold.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["*"].constr = EmphBold;
  Markup.EmphBold = EmphBold;

  /*orgdoc
  **** =EmphUnderline= : recursing node
  */
  var EmphUnderline = function(parent){
    EmphInline.call(this, parent);
    this.nodeType = "EmphUnderline";
    this.recurse = true;
  };
  EmphUnderline.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["_"].constr = EmphUnderline;
  Markup.EmphUnderline = EmphUnderline;

  /*orgdoc
  **** =EmphStrike= : recursing node
  */
  var EmphStrike = function(parent){
    EmphInline.call(this, parent);
    this.nodeType = "EmphStrike";
    this.recurse = true;
  };
  EmphStrike.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["+"].constr = EmphStrike;
  Markup.EmphStrike = EmphStrike;


  ///////////////////////////////////////////////////////////////////////////////
  // PARSE

  var _linkTokenId = 0;

  Markup.tokenize = function tokenize(parent, str){
    str = "" + (str || "");
    var initStr = str;

    var links = {};
    var linkTokenPrefix = uniqToken("LINK");

    function uniqToken(p){return _U.getAbsentToken(initStr, p);}

    ///////////////////////////////////////////////////////////////////////////////
    //     LINKS
    function linkToken(){return linkTokenPrefix + (++_linkTokenId);}

    function linkReplacer(urlIdx, descIdx){
      return function(){
        var t = linkToken();
        var a = arguments;
        links[t] = new Link(parent, a[0], a[urlIdx], a[descIdx], t);
        return t;
      };
    }

    // Whole links with URL and description : [[url:...][Desc of the link]]
    var descLinkRegex = /\[\[((?:.|\s)*?)\]\[((?:.|\s)*?)\]\]/gm;
    str = str.replace(descLinkRegex, linkReplacer(1, 2));

    // Single links with URL only : [[url:...]]
    var singleLinkRegex = /\[\[((?:.|\s)*?)\]\]/gm;
    str = str.replace(descLinkRegex, linkReplacer(1, 1));

    // Treating bare URLs, or URLs without a description attached.
    var urlRegex = new RegExp("(?:" +
                      _C.urlProtocols.join("|") +
                      '):[^\\s),;]+', "gi");
    str = str.replace(urlRegex, linkReplacer(0, 0));

    ///////////////////////////////////////////////////////////////////////////////
    //     FOOTNOTES

    var refFootnoteRegex = /\[(?:(\d+)|fn:([^:]*)(?::((?:.|\s)+?))?)\]/g;
    str = str.replace(refFootnoteRegex, function(){
      var a = arguments;
      var raw = a[0], name = a[2], def = a[3];
      if(!name){name = a[1];}
      if(!name){name = "anon_" + _U.root(parent).fnNextNum;}
      var t = linkToken();
      var fn = new FootNoteRef(parent, raw, name, t);
      if(def){
        var root = _U.root(parent);
        console.log("FROM MARKUP::::");
        console.log(root);
        var inline = new EmphInline(root);
        inline.consume(def);
        root.addFootnoteDef(inline, name);
      }
      links[t] = fn;
      return t;
    });

    var iObj = new EmphInline(parent);
    iObj.consume(str);
    iObj.replaceTokens(links);
    return iObj;
  };


  return Markup;

};
/*orgdoc
*/
