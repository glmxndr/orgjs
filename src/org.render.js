/*orgdoc+++/
* Default Rendering

  This section provides a default JSON and HTML renderer for the parsed tree.

  It is intended to provide an example of how to attach rendering
  functions to the =Outline.Node='s and the different
  =Content.Block='s prototypes.

** Initialisations
    Working in the context of the =Org= object. We will need, as
    usual, some shortcuts to the =Utils=, and to =Org.Content= and
    =Org.Outline=.

#+BEGIN_SRC js
/-orgdoc*/

Org.getRenderers = function(org){
  var OC = org.Content;
  var OM = org.Markup;
  var OO = org.Outline;
  var _U = org.Utils;

  // minified json2.js ; Public Domain. See http://www.JSON.org/js.html
  var JSON;if(!JSON){JSON={}}(function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==="string"){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());

  var DefaultJSONRenderer = function (options) {
    var o = options || {};

    return {

      renderChildren: function(n){
        var i, out = "";
        for(i in n.children){
          out += this.render(n.children[i]);
        }
        return out;
      },

      renderChildrenAsArray: function (n) {
        var i, out = [];
        for(i in n.children){
          out.push(this.render(n.children[i]));
        }
        return out;
      },

      render: function(n){
        var type = n.nodeType;
        var renderFn = this[type];
        if(!renderFn){
          _U.log("Not found render fn:");
          _U.log(n);
          renderFn = _U.noop;
        }
        return renderFn(n, this);
      },

      EmphInline: function(n, r){
        return {
          "type": "inline", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      EmphRaw: function(n, r){
        if(n.children.length){
          return r.EmphInline(n,r);
        }
        return {
          "type":"raw", 
          "content": n.content
        };
      },

      EmphCode: function(n, r){
        return {
          "type":"code", 
          "content": n.content
        };
      },
      
      EmphVerbatim: function(n, r){
        return {
          "type":"verbatim", 
          "content": n.content
        };
      },

      EmphItalic: function(n, r){
        return {
          "type":"italic", 
          "content": n.content
        };
      },

      EmphBold: function(n, r){
        return {
          "type":"bold", 
          "content": n.content
        };
      },

      EmphUnderline: function(n, r){
        return {
          "type":"underline", 
          "content": n.content
        };
      },

      EmphStrike: function(n, r){
        return {
          "type":"strike", 
          "content": n.content
        };
      },

      Link: function(n, r){
        return {
          "type":"link",
          "content":n.content,
          "url": n.url
        };
      },

      FootNoteRef: function(n, r){
        var root = _U.root(n);
        console.log(n, root.fnByName[n.name]);
        var num = (root.fnByName[n.name] || {}).num;
        return {
          "type": "fnref",  
          "name": n.name,
          "num": num
        };
      },

      RootBlock: function(n, r){
        return {
          "type":"block", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      UlistBlock: function(n, r){
        return {
          "type":"ulist", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      OlistBlock: function(n, r){
        return {
          "type":"olist", 
          "start": n.start,
          "children": r.renderChildrenAsArray(n)
        };
      },

      DlistBlock: function(n, r){
        return {
          "type":"dlist", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      UlistItemBlock: function(n, r){
        return {
          "type":"uitem", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      OlistItemBlock: function(n, r){
        return {
          "type":"oitem", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      DlistItemBlock: function(n, r){
        return {
          "type":"ditem", 
          "title": r.render(n.titleInline),
          "children": r.renderChildrenAsArray(n)
        };
      },

      ParaBlock: function(n, r){
        return {
          "type":"para", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      VerseBlock: function(n, r){
        return {
          "type":"verse", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      QuoteBlock: function(n, r){
        return {
          "type":"quote", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      CenterBlock: function(n, r){
        return {
          "type":"center", 
          "children": r.renderChildrenAsArray(n)
        };
      },

      ExampleBlock: function(n, r){
        var content = n.lines.join("\n");
        return {
          "type":"example", 
          "content": content
        };
      },

      SrcBlock: function(n, r){
        var l = n.language || null;
        var content = n.lines.join("\n");
        return {
          "type":"source",
          "language" : l,
          "content": content
        };
      },

      HtmlBlock: function(n, r){
        var content = n.lines.join("\n");
        return {
          "type":"html", 
          "content": content
        };
      },

      FndefBlock: function(n, r){
        return "";
      },

      CommentBlock : function(n, r){
        return "";
      },

      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headInline = r.render(OM.tokenize(n, headline));

        var result = {
          "type": "node",
          "id": n.id(),
          "level": n.level,
          "headline": headInline,
          "tags": n.heading.getTags(),
          "content": r.render(n.contentNode),
          "children": r.renderChildrenAsArray(n)
        };

        if(_U.notEmpty(n.fnNameByNum)){
          var fns = [];
          var root = n;
          _U.each(root.fnNameByNum, function(name, idx){
            if(!name){return;}
            var fn = root.fnByName[name];
            fns.push({
              "name": name,
              "inline": r.render(fn.inline),
              "num": fn.num
            });
          });
          result.footnotes = fns;
        }
        
        return result;
      }
    };

  };


  var DefaultHTMLRenderer = function () {
    return {

/*orgdoc+/
#+END_SRC

*** renderChildren                                                 :function:
     + Purpose :: provides a utility function to render all the
                  children of a =Node= or a =Block=.
     + Arguments :: none
     + Usage :: must be called with =.call(obj)= to provide the value
                for =this=. =this= must have an enumerable =children=
                property.

#+BEGIN_SRC js
/-orgdoc*/
      renderChildren: function(n){
        var i, out = "";
        for(i in n.children){
          out += this.render(n.children[i]);
        }
        return out;
      },

      render: function(n){
        var type = n.nodeType;
        var renderFn = this[type];
        if(!renderFn){
          _U.log("Not found render fn:");
          _U.log(n);
          renderFn = _U.noop;
        }
        return renderFn(n, this);
      },

/*orgdoc+/
#+END_SRC
** Utility functions
*** escapeHtml(str)                                                :function:
     + Purpose :: The =escapeHtml= function escapes the forbidden
                  characters in HTML/XML: =&=, =>=, =<=, ='= and ="=,
                  which are all translated to their corresponding
                  entity.
     + Arguments ::
       + =str= :: any value, converted into a string at the beginning
                  of the function.
#+BEGIN_SRC js
/-orgdoc*/
      escapeHtml: function(str){
        str = "" + str;
        str = str.replace(/&/g, "&amp;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/'/g, "&apos;");
        str = str.replace(/"/g, "&quot;");
        return str;
      },

      unBackslash: function(str){
        str = "" + str;
        str = str.replace(/\\\\/g, "<br/>");
        str = str.replace(/\\ /g, "&nbsp;");
        str = str.replace(/\\(.)/g, "$1");
        str = str.replace(/\s--\s/g, " &#151; ");
        return str;
      },

      htmlize: function(str, r){
        return r.unBackslash(r.escapeHtml(str));
      },

      typo: function(str){
        str = "" + str;
        str = str.replace(/\s*(,|\.|\)|\])\s*/g, "$1 ");
        str = str.replace(/\s*(\(|\[)\s*/g, " $1");
        str = str.replace(/\s*(;|!|\?|:)\s+/g, "&nbsp;$1 ");
        str = str.replace(/\s*(«)\s*/g, " $1&nbsp;");
        str = str.replace(/\s*(»)\s*/g, "&nbsp;$1 ");
        return str;
      },

      EmphInline: function(n, r){
        return r.renderChildren(n);
      },

      EmphRaw: function(n, r){
        if(n.children.length){
          return r.renderChildren(n);
        }
        return "<span class='org-inline-raw'>" +
                r.typo(r.htmlize(n.content, r)) + "</span>";
      },

      EmphCode: function(n, r){
        return "<code class='org-inline-code'>" +
                r.htmlize(n.content, r) + "</code>";
      },
      
      EmphVerbatim: function(n, r){
        return "<samp class='org-inline-samp'>" +
                r.htmlize(n.content, r) + "</samp>";
      },

      EmphItalic: function(n, r){
        return "<em class='org-inline-italic'>" +
                r.renderChildren(n) + "</em>";
      },

      EmphBold: function(n, r){
        return "<strong class='org-inline-bold'>" +
                r.renderChildren(n) + "</strong>";
      },

      EmphUnderline: function(n, r){
        return "<u class='org-inline-underline'>" +
                r.renderChildren(n) + "</u>";
      },

      EmphStrike: function(n, r){
        return "<del class='org-inline-strike'>" +
                r.renderChildren(n) + "</del>";
      },

      Link: function(n, r){
        return "<a class='org-inline-link' href='" + n.url + "'>" +
                r.htmlize(n.desc, r) + "</a>";
      },

      FootNoteRef: function(n, r){
        var root = _U.root(n);
        var num = (root.fnByName[n.name] || {}).num;
        return "<a name='fnref_" + n.name + "'/>" +
                "<a class='org-inline-fnref' href='#fndef_" + n.name + "'><sup>" +
                num + "</sup></a>";
      },

/*orgdoc+/
#+END_SRC

** Rendering blocks
   This sections contains the code for the different types of
   instanciable blocks defined in

   We will attach a, until now undefined, =render= property to these
   block prototypes. None of these function take any argument, all
   the information they need being in the block object they will act
   upon through the =this= value.

   The container blocks (those whose constructor calls the
   =ContainerBlock= constructor) all use the =renderChildren=
   function.

   The content blocks (those whose constructor calls the
   =ContentBlock= constructor) should use their =this.lines=
   array.

*** Rendering =RootBlock=
     =RootBlock=s are rendered with a =div= tag, with class
     =org_content=.

#+BEGIN_SRC js
/-orgdoc*/
      RootBlock: function(n, r){
        var out = "<div class='org_content'>\n";
        out += r.renderChildren(n);
        out += "</div>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =UlistBlock=
     =UlistBlock=s are rendered with a simple =ul= tag.

#+BEGIN_SRC js
/-orgdoc*/
      UlistBlock: function(n, r){
        var out = "<ul>\n";
        out += r.renderChildren(n);
        out += "</ul>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =OlistBlock=
     =OlistBlock=s are rendered with a simple =ol= tag.

     If the block has a =start= property different from =1=, it is
     inserted in the =start= attribute of the tag.

#+BEGIN_SRC js
/-orgdoc*/
      OlistBlock: function(n, r){
        var s = n.start;
        var out = "<ol" + (s === 1 ? ">\n" : " start='" + r.escapeHtml(s) + "'>\n");
        out += r.renderChildren(n);
        out += "</ol>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =DlistBlock=
     =DlistBlock=s are rendered with a =dl= tag.

     =DlistItemBlock=s will have to use =dt=/=dd= structure
     accordingly.

#+BEGIN_SRC js
/-orgdoc*/
      DlistBlock: function(n, r){
        var out = "<dl>\n";
        out += r.renderChildren(n);
        out += "</dl>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =UlistItemBlock= and =OlistItemBlocks=
     =UlistItemBlock=s and =0listItemBlocks= are rendered with a
     #simple =li= tag.

#+BEGIN_SRC js
/-orgdoc*/
      UlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n);
        out += "</li>\n";
        return out;
      },

      OlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n);
        out += "</li>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =DlistItemBlock=
     =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

     The content of the =dt= is the =title= attribute of the block.

     The content of the =dd= is the rendering of this block's children.

#+BEGIN_SRC js
/-orgdoc*/
      DlistItemBlock: function(n, r){
        var out = "<dt>" + r.render(n.titleInline) + "</dt>\n<dd>\n";
        out += r.renderChildren(n);
        out += "</dd>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =ParaBlock=
     =ParaBlock=s are rendered with a =p= tag.

     The content of the tag is the concatenation of this block's
     =this.lines=, passed to the =renderMarkup= function.

#+BEGIN_SRC js
/-orgdoc*/
      ParaBlock: function(n, r){
        return "<p>\n" + r.renderChildren(n) + "</p>\n";
      },

/*orgdoc+/
#+END_SRC

*** Rendering =VerseBlock=
     =VerseBlock=s are rendered with a =p= tag, with class
     =verse=.

     All spaces are converted to unbreakable spaces.

     All new lines are replaced by a =br= tag.

#+BEGIN_SRC js
/-orgdoc*/
      VerseBlock: function(n, r){
        var out = "<p class='verse'>\n" + r.renderChildren(n) + "</p>\n";
        out = out.replace(/ /g, "&nbsp;");
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =QuoteBlock=
     =QuoteBlock=s are rendered with a =blockquote= tag.

     If the quote contains an author declaration (after a double dash),
     this declaration is put on a new line.

#+BEGIN_SRC js
/-orgdoc*/
      QuoteBlock: function(n, r){
        var out = "<blockquote>\n" + r.renderChildren(n) + "</blockquote>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =CenterBlock=
     =CenterBlock=s are rendered with a simple =center= tag.

#+BEGIN_SRC js
/-orgdoc*/
      CenterBlock: function(n, r){
        return "<center>\n" + r.renderChildren(n) + "</center>\n";
      },

/*orgdoc+/
#+END_SRC

*** Rendering =ExampleBlock=
     =ExampleBlock=s are rendered with a simple =pre= tag.

     The content is not processed with the =renderMarkup= function, only
     with the =escapeHtml= function.

#+BEGIN_SRC js
/-orgdoc*/
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var out = "<pre>\n" + markup + "</pre>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =SrcBlock=
     =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
     The =code= tag may have a class attribute if the language of the
     block is known. In case there is, the class would take the language
     identifier.

     The content is not processed with the =renderMarkup= function, only
     with the =escapeHtml= function.

#+BEGIN_SRC js
/-orgdoc*/
      SrcBlock: function(n, r){
        var content = n.lines.join("\n").replace(/\n[\n\s]*$/, '');
        var markup = r.escapeHtml(content);
        var l = n.language;
        var out = "<pre class='src'><code" +
                  ( l ? " class='" + l + "'>":">") +
                  "\n" + markup + "</code></pre>\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =HtmlBlock=
     =HtmlBlock=s are rendered by simply outputting the HTML content
     verbatim, with no modification whatsoever.

#+BEGIN_SRC js
/-orgdoc*/
      HtmlBlock: function(n, r){
        var out = n.lines.join("\n") + "\n";
        return out;
      },

/*orgdoc+/
#+END_SRC

*** Rendering =CommentBlock=
     =CommentBlock=s are ignored.

#+BEGIN_SRC js
/-orgdoc*/
      FndefBlock: function(n, r){
        return "";
      },

      CommentBlock : function(n, r){
        return "";
      },


/*orgdoc+/
#+END_SRC

** Rendering headlines

    Here we render headlines, represented by =Outline.Node= objects.

    A =section= tag is used, with class orgnode, and a level.
    The =id= attribute is the computed id corresponding to a unique TOC
    identifier.

    The title is in a =div.title= element. Each tag is represented at the
    end of this element by a =span.tag= element.

    The content of the node (the RootBlock associated to this headline)
    is rendered.

    Then the subheadlines are rendered using the =renderChildren= function.

#+BEGIN_SRC js
/-orgdoc*/
      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headInline = r.render(OM.tokenize(n, headline));

        var html = "<section id='%ID%' class='orgnode level-%LEVEL%'>";
        html = html.replace(/%ID%/, n.id());
        html = html.replace(/%LEVEL%/, n.level);

        var title = "<div class='title'>%HEADLINE%%TAGS%</div>";
        title = title.replace(/%HEADLINE%/, headInline);
        var tags = "";
        _U.each(n.heading.getTags(), function(tag, idx){
          if(tag.length){
            tags += " <span class='tag'>" + tag + "</span>";
          }
        });
        title = title.replace(/%TAGS%/, tags);

        html += title;

        var contentHtml = r.render(n.contentNode);
        html += contentHtml;

        var childrenHtml = r.renderChildren(n);
        html += childrenHtml;

        if(_U.notEmpty(n.fnNameByNum)){
          var root = n;
          html += "<section class='org-footnotes'><title>Notes</title>";
          _U.each(root.fnNameByNum, function(name, idx){
            if(!name){return;}
            var fn = root.fnByName[name];
            var inline = fn.inline;
            var num = fn.num;
            html += "<p class='org-footnote'><a name='fndef_" + name + "'/>" +
                "<a class='org-inline-fnref' href='#fnref_" + name + "'><sup>" +
                num + "</sup></a>&nbsp;:&nbsp;<span id='fndef_" + name+ "'>" +
                r.render(inline) + "</span></p>";
          });
          html += "</section>";
        }

        html += "</section>";
        return html;
      }
    };
  };


  return {
    html: DefaultHTMLRenderer,
    json: DefaultJSONRenderer
  };
};

/*orgdoc+/
#+END_SRC
** Conclusion

    This is the end of the function creating the default renderer.

#+BEGIN_SRC js
/-orgdoc*/
