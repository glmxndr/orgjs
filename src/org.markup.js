/*orgdoc
* Markup parser

  This file describes the =OrgMode= wiki-style markup parsing.

  The parsing strategy differs in some ways from the original =Org=:
  + emphasis markup (bold, italic, underline, strike-through) are recursive,
    and can be embedded one in  (they can also contain code/verbatim inline items)
  + the delimiting characters for the emphasis/code/verbatim markup are
    not configurable as they are in the =OrgMode= implementation
  + subscript and superscript are mandatorily used with curly braces
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
    _U.TreeNode.call(this, parent, {"nodeType": "Link", leaf: true});
    this.raw = raw;
    this.url = url;
    this.desc = desc;
    this.token = token;
    this.type = getLinkType(this);
  };
  Link.prototype = Object.create(_U.TreeNode.prototype);
  Link.prototype.replaceTokens = function(){};
  Markup.Link = Link;

  /*orgdoc
  ** Footnote references
     Footnotes have definitions as blocks in the =Content= section. This section
     deals only with footnote references from within the markup.
  */
  var FootNoteRef = function(parent, raw, name, token){
    _U.TreeNode.call(this, parent, {"nodeType": "FootNoteRef", leaf: true});
    this.raw = raw;
    this.name = name;
    this.token = token;
  };
  FootNoteRef.prototype = Object.create(_U.TreeNode.prototype);
  FootNoteRef.prototype.replaceTokens = function(){};
  Markup.FootNoteRef = FootNoteRef;

  /*orgdoc
  ** Sub/sup markup
  */
  var SubInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "SubInline"});
    this.content = raw;
    this.token = token;
  };
  SubInline.prototype = Object.create(_U.TreeNode.prototype);
  SubInline.prototype.replaceTokens = function(){};
  Markup.SubInline = SubInline;

  var SupInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "SupInline"});
    this.content = raw;
    this.token = token;
  };
  SupInline.prototype = Object.create(_U.TreeNode.prototype);
  SupInline.prototype.replaceTokens = function(){};
  Markup.SupInline = SupInline;

  /*orgdoc
  ** Timestamp markup
  */
  var TimestampInline = function(parent, raw, token){
    _U.TreeNode.call(this, parent, {"nodeType": "TimestampInline"});
    this.content = raw;
    this.token = token;
  };
  TimestampInline.prototype = Object.create(_U.TreeNode.prototype);
  TimestampInline.prototype.replaceTokens = function(){};
  Markup.TimestampInline = TimestampInline;

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
  // pre          Chars allowed as prematch.  Beginning of line will be allowed
  //              too.
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
  _U.each("/*+_".split(""), function(t){EmphMarkers[t] = {};});

  EmphMarkers.getInline = function(token, parent){
    var constr = this[token].constr;
    return new constr(parent);
  };
  EmphMarkers.getRegexpAll = function(){
    return (/(^(?:.|\n)*?)(([\/*+_])([^\s].*?[^\s\\]|[^\s\\])\3)/);
  };
  Markup.EmphMarkers = EmphMarkers;


  /*orgdoc
  ** Inline nodes containing either inline nodes or raw textual content
  *** =makeInline=            :function:
       + Purpose :: Creates an inline node object
       + Arguments ::
         + =constr= :: constructor for the object to build ;
                       should build an object with a =consume()= property
         + =parent= :: parent of the node to build
         + =food= :: textual content the new inline node has to parse as
                     subnodes
  */
  function makeInline(constr, parent, food){
    var inline = new constr(parent);
    //parent.append(inline);
    if(food){inline.consume(food);}
    return inline;
  }

  /*orgdoc
  *** =EmphInline= : abstract high-level inline node
  */
  var EmphInline = function(parent, nodeType){
    nodeType = nodeType || "EmphInline";
    _U.TreeNode.call(this, parent, {"nodeType": nodeType});
  };

  EmphInline.prototype = Object.create(_U.TreeNode.prototype);
  
  EmphInline.prototype.replaceTokens = function(tokens){
    if(this.children && this.children.length){
      _U.each(this.children, function(v){
        v.replaceTokens(tokens);
      });
    }
    if(this.content && this.content.length){
      var content = this.content;
      var pipedKeys =  _U.joinKeys(tokens, "|");
      if(_U.blank(pipedKeys)){return;}
      var rgx = new RegExp('^((?:.|\n)*?)(' + pipedKeys + ')((?:.|\n)*)$');
      var match, pre, token, rest;
      match = rgx.exec(content);
      var created = [];
      while(match){
        pre = match[1]; token = match[2]; rest = match[3];
        if(_U.notBlank(pre)){ created.push(makeInline(EmphRaw, this.parent, pre)); }
        var tokinline = tokens[token];
        tokinline.parent = this.parent;
        created.push(tokinline);
        content = rest;
        match = rgx.exec(content);
      }
      if(_U.notBlank(rest)){
        if(_U.notBlank(rest)){ created.push(makeInline(EmphRaw, this.parent, rest)); }
      }
      if(created.length){
        this.parent.replace(this, created);
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
      pre     = match[1];
      hasEmph = match[2];
      token   = match[3] || "";
      inner   = match[4] || "";
      length  = pre.length + inner.length + (hasEmph ? 2 : 0);
      if(length === 0){break;}
      rest    = rest.substr(length);
      if(_U.notBlank(pre)){ this.append(makeInline(EmphRaw, this, pre)); }
      if(hasEmph !== void 0){
        this.append(makeInline(EmphMarkers[token].constr, this, inner));
      }
    }
    if(_U.notBlank(rest)){ this.append(makeInline(EmphRaw, this, rest)); }
  };
  Markup.EmphInline = EmphInline;

  /*orgdoc
  *** End-point node types
      Basic inline types containing raw text content.
      Can not contain anything else than text content.
  **** =EmphRaw= : basic text
  */
  var EmphRaw = function(parent, nodeType){
    nodeType = nodeType || "EmphRaw";
    EmphInline.call(this, parent, nodeType);
    this.children = null;
    this.recurse = false;
  };
  EmphRaw.prototype = Object.create(EmphInline.prototype);
  EmphRaw.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphRaw = EmphRaw;

  /*orgdoc
  *** Recursing nodes
      These nodes contain other sub nodes (either =EmphRaw=,
      other =EmphInline= subtypes, =Link=s, etc.).
  **** =EmphItalic= : recursing node
  */
  var EmphItalic = function(parent){
    EmphInline.call(this, parent, "EmphItalic");
    this.recurse = true;
  };
  EmphItalic.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["/"].constr = EmphItalic;
  Markup.EmphItalic = EmphItalic;

  /*orgdoc
  **** =EmphBold= : recursing node
  */
  var EmphBold = function(parent){
    EmphInline.call(this, parent, "EmphBold");
    this.recurse = true;
  };
  EmphBold.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["*"].constr = EmphBold;
  Markup.EmphBold = EmphBold;

  /*orgdoc
  **** =EmphUnderline= : recursing node
  */
  var EmphUnderline = function(parent){
    EmphInline.call(this, parent, "EmphUnderline");
    this.recurse = true;
  };
  EmphUnderline.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["_"].constr = EmphUnderline;
  Markup.EmphUnderline = EmphUnderline;

  /*orgdoc
  **** =EmphStrike= : recursing node
  */
  var EmphStrike = function(parent){
    EmphInline.call(this, parent, "EmphStrike");
    this.recurse = true;
  };
  EmphStrike.prototype = Object.create(EmphInline.prototype);
  EmphMarkers["+"].constr = EmphStrike;
  Markup.EmphStrike = EmphStrike;

  /*orgdoc
  **** =LaTeXInline= : non-recursing node
  */
  var LaTeXInline = function(parent){
    EmphRaw.call(this, parent, "LaTeXInline");
    this.children = null;
  };
  LaTeXInline.prototype = Object.create(EmphRaw.prototype);
  LaTeXInline.prototype.replaceTokens = _U.noop;
  LaTeXInline.prototype.consume = function(content){
    this.content = content;
  };
  Markup.LaTeXInline = LaTeXInline;


  /*orgdoc
  **** =EmphCode= : code example
  */
  var EmphCode = function(parent){
    EmphRaw.call(this, parent, "EmphCode");
    this.children = null;
  };
  EmphCode.prototype = Object.create(EmphRaw.prototype);
  EmphCode.prototype.replaceTokens = _U.noop;
  EmphCode.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphCode = EmphCode;

  /*orgdoc
  **** =EmphVerbatim= : unedited content
  */
  var EmphVerbatim = function(parent){
    EmphRaw.call(this, parent, "EmphVerbatim");
    this.children = null;
  };
  EmphVerbatim.prototype = Object.create(EmphRaw.prototype);
  EmphVerbatim.prototype.replaceTokens = _U.noop;
  EmphVerbatim.prototype.consume = function(content){
    this.content = content;
  };
  Markup.EmphVerbatim = EmphVerbatim;

  /*orgdoc
  *** Parsing the paragraph content
  */
  Markup.parse = function parse(parent, str){
    str = "" + (str || "");
    var initStr = str;

    /*orgdoc
    **** Replacing code/verbatim parts with unique tokens
         Before dealing with emphasis markup, we replace the code/verbatim parts
         with textual tokens which will be replaced in the end by their
         corresponding tree item. These tokens are stored in the =tokens=
         local variable.
    */
    var tokens = {};
    function uniqToken(p){return _U.getAbsentToken(initStr, p);}

    /*orgdoc
    ***** Replacing \LaTeX inline markup
          These inline items are possibly:
          + enclosed in dollar signs (~\$~)
          + enclosed in backslash-parens (~\\(...\\)~)
          + enclosed in backslash-brackets (~\\[...\\]~)
    */
    var latexTokenPrefix = uniqToken("LATEX");

    function latexToken(){return latexTokenPrefix + _U.incr();}

    function latexReplacer(){
      var t     = latexToken();
      var a     = arguments;
      var latex = new LaTeXInline(parent);
      latex.consume(a[2]);
      tokens[t] = latex;
      return a[1] + t;
    }

    var latexParenRegex   = /(^|[^\\])\\\(([\s\S]*?)\\\)/gm;
    str = str.replace(latexParenRegex, latexReplacer);
    var latexBracketRegex = /(^|[^\\])\\\[([\s\S]*?)\\\]/gm;
    str = str.replace(latexBracketRegex, latexReplacer);
    var latexDollarRegex  = /(^|[^\\])\$([\s\S]*?)\$/gm;
    str = str.replace(latexDollarRegex, latexReplacer);


    /*orgdoc
    ***** Replacing code/verbatim markup
          These inline items are possibly:
          + for code :: enclosed in ~\=~ signs
          + for verbatim :: enclosed in ~\~~ signs
    */
    var codeTokenPrefix = uniqToken("CODE");

    function codeToken(){return codeTokenPrefix + _U.incr();}

    function codeReplacer(){
      var t       = codeToken();
      var a       = arguments;
      var delim   = a[3];
      var constr  = (a[3] === "=") ? EmphCode : EmphVerbatim;
      var code    = new constr(parent);
      // We replace all the escaped delimiters by themselves
      var content = a[4].replace(new RegExp("\\\\" + delim, "g"), delim);
      code.consume(content);
      tokens[t]   = code;
      return a[1] + t;
    }

    var codeRegexp = /(^|[^\\])(([=~])([^\s\\]|[^\s].*?[^\s\\])\3)/gm;
    str = str.replace(codeRegexp, codeReplacer);


    /*orgdoc
    ***** Replacing timestamp markup
          These items are possibly:
          + activated :: ~<yyyy-MM-dd (weekday.)? (hh:mm)?>~
          + deactivated :: ~[yyyy-MM-dd (weekday.)? (hh:mm)?]~
    */
    var timestampTokenPrefix = uniqToken("TIMESTAMP");

    function timestampToken(){return timestampTokenPrefix + _U.incr();}

    function timestampReplacer(activated){
      return function(){
        var t            = timestampToken();
        var a            = arguments;
        var timestamp    = new _U.Timestamp(a[1]);
        var inline       = new TimestampInline(parent, a[1], t);
        inline.activated = activated;
        inline.timestamp = timestamp;
        inline.date      = timestamp.date;
        tokens[t]        = inline;
        return t;
      };
    }

    var timestampRegexAngle  = /<(\d{4}-\d{2}-\d{2}(?: [a-z.]+)?(?: \d{2}:\d{2})?)>/gim;
    str = str.replace(timestampRegexAngle, timestampReplacer(true));
    var timestampRegexSquare = /\[(\d{4}-\d{2}-\d{2}(?: [a-z.]+)?(?: \d{2}:\d{2})?)\]/gim;
    str = str.replace(timestampRegexSquare, timestampReplacer(false));

    /*orgdoc
    ***** Replacing sub/sup markup
          These items are possibly:
          + for sub :: defined by underscore and cury braces (~\_{...}~)
          + for sup :: defined by caret and cury braces (~\^{...}~)
          This behaviour should evolve to deal with the possiblity to skip the
          curly braces. For now, since it may conflict with the underscore
          markup, this part is left for later. Consider the org-option
          ~#+OPTIONS: ^:{}~ to be mandatory.
    */
    var subsupTokenPrefix = uniqToken("SUBSUP");

    function subsupToken(){return subsupTokenPrefix + _U.incr();}

    function subsupReplacer(){
      var t      = subsupToken();
      var a      = arguments;
      var constr = (a[2] === "_") ? SubInline : SupInline;
      tokens[t]  = new constr(parent, a[3], t);
      return a[1] + t;
    }

    var subsupRegexBrace = /([^\s\\])(_|\^)\{([^\}]+?)\}/gm;
    str = str.replace(subsupRegexBrace, subsupReplacer);
    // Repeat the treatment, since a sub followed by a sup are not treated in
    // the previous line...
    str = str.replace(subsupRegexBrace, subsupReplacer);

    /*orgdoc
    ***** Replacing links
    */
    var linkTokenPrefix = uniqToken("LINK");

    function linkToken(){return linkTokenPrefix + _U.incr();}

    function linkReplacer(urlIdx, descIdx){
      return function(){
        var t = linkToken();
        var a = arguments;
        tokens[t] = new Link(parent, a[0], a[urlIdx], a[descIdx], t);
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

    /*orgdoc
    ***** Replacing footnote definitions
    */
    var refFootnoteRegex = /\[(?:(\d+)|fn:([^:]*)(?::((?:.|\s)+?))?)\]/g;
    str = str.replace(refFootnoteRegex, function(){
      var a    = arguments;
      var raw  = a[0];
      var name = a[2];
      var def  = a[3];
      if(!name){name = a[1];}
      if(!name){name = "anon_" + parent.root().fnNextNum;}
      var t  = linkToken();
      var fn = new FootNoteRef(parent, raw, name, t);
      if(def){
        var root   = parent.root();
        var inline = new EmphInline(root);
        inline.consume(def);
        root.addFootnoteDef(inline, name);
      }
      tokens[t] = fn;
      return t;
    });

    /*orgdoc
    ***** Processing emphasis markup (*bold*, /italic/, etc.)
    */
    var iObj = new EmphInline(parent);
    iObj.consume(str);

    /*orgdoc
    ***** Reinjecting saved tokens
    */
    iObj.replaceTokens(tokens);
    return iObj;
  };


  return Markup;

};
