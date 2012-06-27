/*orgdoc
* Default Rendering

  This section provides a default HTML renderer for the parsed tree.

  It is intended to provide an example of how to attach rendering
  functions to the =Outline.Node='s and the different
  =Content.Block='s prototypes.

** Initialisations
    Working in the context of the =Org= object. We will need, as
    usual, some shortcuts to the =Utils=, and to =Org.Content= and
    =Org.Outline=.
*/

Org.getRenderers = function(org){
  var OC = org.Content;
  var OM = org.Markup;
  var OO = org.Outline;
  var _U = org.Utils;

  var DefaultRenderer = {
    /*orgdoc
    *** =renderChildren=                                               :function:
         + Purpose :: provides a utility function to render all the
                      children of a =Node= or a =Block=.
         + Arguments :: node, renderer
         + Usage :: must be called with =.call(obj)= to provide the value
                    for =this=. =this= must have an enumerable =children=
                    property.
    */
    renderChildren: function(n, r){
      var i, out = "";
      var arr = n.children;
      if((typeof arr) === "function"){
        arr = arr();
      }
      _U.each(arr, function(v){
        out += r.render(v, r);
      });
      return out;
    },

    /*orgdoc
    *** =render=                                               :function:
         + Purpose :: provides a utility function to renders a node with the given
                      renderer
         + Arguments :: node, renderer
    */
    render: function(n, r){
      r = r || this;
      var type = n.nodeType;
      var renderFn = r[type];
      var indent = n.ancestors().length;
      if(!renderFn){
        _U.log("Not found render fn:");
        _U.log(n);
        renderFn = _U.noop;
      }
      return renderFn(n, r);
    }
  };


  var StructRenderer = function(){
    return {
      escapeHtml: function(str){
        str = "" + str;
        str = str.replace(/&/g, "&amp;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/'/g, "&apos;");
        str = str.replace(/"/g, "&quot;");
        return str;
      },

      renderChildren: function(n, r){
        var i, out = "";
        var arr = n.children;
        if((typeof arr) === "function"){
          arr = arr();
        }
        _U.each(arr, function(v){
          out += r.render(v, r);
        });
        return out;
      },

      render: function(n, r){
        r = r || this;
        var type = n.nodeType;
        var renderFn = r[type];
        var indent = n.ancestors().length;
        var tag = "div";
        if(n.nodeType.match(/^Emph|Inline$/)){tag = "span";}
        if(n.nodeType.match(/^Node$/)){tag = "section";}
        return "<" + tag + " class='org-struct " + n.nodeType + "'>" + n.nodeType +
          (n.content ? " " + r.escapeHtml(n.content) : "") +
          (n.children ? " " + r.renderChildren(n,r) : "") +
          "</" + tag + ">";
      }
    };
  };

  var DefaultOrgRenderer = function(){
    var renderer = {
      /*orgdoc
      ** Rendering inline items
      *** =IgnoredLine=
      */
      IgnoredLine: function(n, r){
        return "\n# " + n.content + "";
      },

      /*orgdoc
      *** =EmphInline=
          Should not be used, EmphInline is abstract...
      */
      EmphInline: function(n, r){
        if(n.children.length){
          return r.renderChildren(n, r);
        }
        return "";
      },
      
      /*orgdoc
      *** =EmphRaw=
      */
      EmphRaw: function(n, r){
        if(n.children && n.children.length){
          return r.renderChildren(n, r);
        }
        return n.content;
      },

      /*orgdoc
      *** =EmphCode=
      */
      EmphCode: function(n, r){
        return "=" + n.content + "=";
      },
      
      /*orgdoc
      *** =EmphVerbatim=
      */
      EmphVerbatim: function(n, r){
        return "~" + n.content + "~";
      },

      /*orgdoc
      *** =EmphItalic=
      */
      EmphItalic: function(n, r){
        return "/" + r.renderChildren(n, r) + "/";
      },

      /*orgdoc
      *** =EmphBold=
      */
      EmphBold: function(n, r){
        return "*" + r.renderChildren(n, r) + "*";
      },

      /*orgdoc
      *** =EmphUnderline=
      */
      EmphUnderline: function(n, r){
        return "_" + r.renderChildren(n, r) + "_";
      },

      /*orgdoc
      *** =EmphStrike=
      */
      EmphStrike: function(n, r){
        return "+" + r.renderChildren(n, r) + "+";
      },
      
      /*orgdoc
      *** =LaTeXInline=
      */
      LaTeXInline: function(n, r){
        return "$" + n.content + "$";
      },

      /*orgdoc
      *** =Link=
      */
      Link: function(n, r){
        return "[[" + n.desc + "][" + n.url + "]]";
      },

      /*orgdoc
      *** =FootNoteRef=
      */
      FootNoteRef: function(n, r){
        var root = n.root();
        var footnote = root.fnByName[n.name];
        var num = 0;
        if(footnote){num = footnote.num;}
        return "[fn:" + n.name + "]";
      },

      /*orgdoc
      *** =SubInline=
      */
      SubInline: function(n, r){
        return "_{" + n.content + "}";
      },

      /*orgdoc
      *** =SupInline=
      */
      SupInline: function(n, r){
        return "^{" + n.content + "}";
      },

      /*orgdoc
      *** =TimestampInline=
      */
      TimestampInline: function(n, r){
        var ts     = n.timestamp;
        return "<<" + ts.format("%y-%m-%d %H:%M") + ">>";
      },

      /*orgdoc
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
      */
      RootBlock: function(n, r){
        var out = r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =UlistBlock=
           =UlistBlock=s are rendered with a simple =ul= tag.
      */
      UlistBlock: function(n, r){
        var out = r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =OlistBlock=
           =OlistBlock=s are rendered with a simple =ol= tag.

           If the block has a =start= property different from =1=, it is
           inserted in the =start= attribute of the tag.
      */
      OlistBlock: function(n, r){
        var out = r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =DlistBlock=
           =DlistBlock=s are rendered with a =dl= tag.

           =DlistItemBlock=s will have to use =dt=/=dd= structure
           accordingly.
      */
      DlistBlock: function(n, r){
        var out = r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =UlistItemBlock= and =OlistItemBlocks=
           =UlistItemBlock=s and =0listItemBlocks= are rendered with a
           #simple =li= tag.
      */
      UlistItemBlock: function(n, r){
        var out = "\n + ";
        out += r.renderChildren(n, r);
        return out;
      },

      OlistItemBlock: function(n, r){
        var out = "\n " + n.number + ") ";
        out += r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =DlistItemBlock=
           =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

           The content of the =dt= is the =title= attribute of the block.

           The content of the =dd= is the rendering of this block's children.
      */
      DlistItemBlock: function(n, r){
        var out = "\n  + " + r.render(n.titleInline, r) + " :: ";
        out += r.renderChildren(n, r);
        return out;
      },

      /*orgdoc
      *** Rendering =ParaBlock=
           =ParaBlock=s are rendered with a =p= tag.

           The content of the tag is the concatenation of this block's
           =this.lines=, passed to the =renderMarkup= function.
      */
      ParaBlock: function(n, r){
        var indent = n.ancestors().length;
        var content = r.renderChildren(n, r);
        content = _U.fillParagraph(content, 70);
        content = _U.indent(content, indent);
        return content + "\n";
      },

      /*orgdoc
      *** Rendering =VerseBlock=
           =VerseBlock=s are rendered with a =p= tag, with class
           =verse=.

           All spaces are converted to unbreakable spaces.

           All new lines are replaced by a =br= tag.
      */
      VerseBlock: function(n, r){
        var out = "\n#+BEGIN_VERSE\n" + r.renderChildren(n, r) + "\n#+END_VERSE\n";
        return out;
      },

      /*orgdoc
      *** Rendering =QuoteBlock=
           =QuoteBlock=s are rendered with a =blockquote= tag.

           If the quote contains an author declaration (after a double dash),
           this declaration is put on a new line.
      */
      QuoteBlock: function(n, r){
        var out = "\n#+BEGIN_QUOTE\n" + r.renderChildren(n, r) + "\n#+END_QUOTE\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CenterBlock=
           =CenterBlock=s are rendered with a simple =center= tag.
      */
      CenterBlock: function(n, r){
        var out = "\n#+BEGIN_CENTER\n" + r.renderChildren(n, r) + "\n#+END_CENTER\n";
      },

      /*orgdoc
      *** Rendering =ExampleBlock=
           =ExampleBlock=s are rendered with a simple =pre= tag.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_EXAMPLE\n" + content + "\n#+END_EXAMPLE\n";
        return out;
      },

      /*orgdoc
      *** Rendering =SrcBlock=
           =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
           The =code= tag may have a class attribute if the language of the
           block is known. In case there is, the class would take the language
           identifier.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      SrcBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_SRC\n" + content + "\n#+END_SRC\n";
        return out;
      },

      /*orgdoc
      *** Rendering =HtmlBlock=
           =HtmlBlock=s are rendered by simply outputting the HTML content
           verbatim, with no modification whatsoever.
      */
      HtmlBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_HTML\n" + content + "\n#+END_HTML\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CommentBlock=
           =CommentBlock=s are ignored.
      */
      FndefBlock: function(n, r){
        return "[fn:" + n.name + "] " + n.lines.join("\n");
      },

      CommentBlock : function(n, r){
        var content = n.lines.join("\n") + "\n";
        var out = "\n#+BEGIN_COMMENT\n" + content + "\n#+END_COMMENT\n";
        return out;
      },


      /*orgdoc
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
      */
      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headtpl = "\n%STARS% %TODO%%PRIOR%%TITLE% %TAGS%";

        var stars = _U.repeat('*', n.level);
        headtpl = headtpl.replace(/%STARS%/, stars);

        var todo = n.heading.getTodo();
        headtpl = headtpl.replace(/%TODO%/, todo?todo + " ":"");

        if( n.heading.getPriority()){
          var prior = "[#" + n.heading.getPriority() + "] ";
          headtpl = headtpl.replace(/%PRIOR%/, prior);
        }
        else {
          headtpl = headtpl.replace(/%PRIOR%/, "");
        }
        
        var title = n.heading.getTitle();
        headtpl = headtpl.replace(/%TITLE%/, title);

        if(n.heading.getTags().length > 0){
          var tags = ":";
          _U.each(n.heading.getTags(), function(tag, idx){
            if(tag.length){
              tags += tag + ":";
            }
          });
          headtpl = headtpl.replace(/%TAGS%/, tags);
        } else {
          headtpl = headtpl.replace(/%TAGS%/, "");
        }

        return headtpl + r.renderChildren(n, r) + "\n";
      }
    };
    return _U.merge(renderer, DefaultRenderer);
  };

  var DefaultHTMLRenderer = function(){
    var renderer = {
      /*orgdoc
      ** Utility functions
      *** escapeHtml(str)                                                :function:
           + Purpose :: The =escapeHtml= function escapes the forbidden
                        characters in HTML/XML: =&=, =>=, =<=, ='= and ="=,
                        which are all translated to their corresponding
                        entity.
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      escapeHtml: function(str){
        str = "" + str;
        str = str.replace(/&/g, "&amp;");
        str = str.replace(/>/g, "&gt;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/'/g, "&apos;");
        str = str.replace(/"/g, "&quot;");
        return str;
      },

      /*orgdoc
      *** =unBackslash(str)=                                                :function:
           + Purpose :: Utility to unescape the characters of the given raw content
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      unBackslash: function(str){
        str = "" + str;
        str = str.replace(/\\\\\n/g, "<br/>");
        str = str.replace(/\\ /g, "&nbsp;");
        str = str.replace(/\\(.)/g, "$1");
        str = str.replace(/\s--\s/g, " &#151; ");
        return str;
      },

      /*orgdoc
      *** =htmlize(str, renderer)=                                                :function:
           + Purpose :: Unbackslash after having escaped HTML
           + Arguments ::
             + =str= :: any value, converted into a string at the beginning
                        of the function.
      */
      htmlize: function(str, r){
        return r.unBackslash(r.escapeHtml(str));
      },

      /*orgdoc
      *** =typo(str, renderer)=                                                :function:
           + Purpose :: Applies light typographical preferences for French language
           + Arguments :: str, renderer
      */
      typo: function(str, r){
        str = "" + r.htmlize(str, r);
        str = str.replace(/\s*(,|\.|\)|\])\s*/g, "$1 ");
        str = str.replace(/\s*(\(|\[)\s*/g, " $1");
        str = str.replace(/\s*(;|!|\?|:)\s+/g, "&nbsp;$1 ");
        str = str.replace(/\s*(«)\s*/g, " $1&nbsp;");
        str = str.replace(/\s*(»)\s*/g, "&nbsp;$1 ");
        // Restore entities broken by the ';' typo rule...
        str = str.replace(/(&[a-z]+)&nbsp;;/g, "$1;");
        return str;
      },

      /*orgdoc
      ** Rendering inline items
      *** =IgnoredLine=
      */
      IgnoredLine: function(n, r){
        return "<!-- " + r.htmlize(n.content, r) + " -->";
      },

      /*orgdoc
      *** =EmphInline=
          Should not be used, EmphInline is abstract...
      */
      EmphInline: function(n, r){
        return r.renderChildren(n, r);
      },

      /*orgdoc
      *** =EmphRaw=
      */
      EmphRaw: function(n, r){
        return "<span class='org-inline-raw'>" +
                r.typo(n.content, r) + "</span>";
      },

      /*orgdoc
      *** =EmphCode=
      */
      EmphCode: function(n, r){
        return "<code class='org-inline-code prettyprint'>" +
                r.escapeHtml(n.content, r) + "</code>";
      },
      
      /*orgdoc
      *** =EmphVerbatim=
      */
      EmphVerbatim: function(n, r){
        return "<samp class='org-inline-samp'>" +
                r.htmlize(n.content, r) + "</samp>";
      },

      /*orgdoc
      *** =EmphItalic=
      */
      EmphItalic: function(n, r){
        return "<em class='org-inline-italic'>" +
                r.renderChildren(n, r) + "</em>";
      },

      /*orgdoc
      *** =EmphBold=
      */
      EmphBold: function(n, r){
        return "<strong class='org-inline-bold'>" +
                r.renderChildren(n, r) + "</strong>";
      },

      /*orgdoc
      *** =EmphUnderline=
      */
      EmphUnderline: function(n, r){
        return "<u class='org-inline-underline'>" +
                r.renderChildren(n, r) + "</u>";
      },

      /*orgdoc
      *** =EmphStrike=
      */
      EmphStrike: function(n, r){
        return "<del class='org-inline-strike'>" +
                r.renderChildren(n, r) + "</del>";
      },
      
      /*orgdoc
      *** =LaTeXInline=
      */
      LaTeXInline: function(n, r){
        return "<span class='math'>" +
                r.escapeHtml(n.content, r) + "</span>";
      },

      /*orgdoc
      *** =Link=
      */
      Link: function(n, r){
        return "<a class='org-inline-link' href='" + n.url + "'>" +
                r.htmlize(n.desc, r) + "</a>";
      },

      /*orgdoc
      *** =FootNoteRef=
      */
      FootNoteRef: function(n, r){
        var root = n.root();
        var footnote = root.fnByName[n.name];
        var num = 0;
        if(footnote){num = footnote.num;}
        return "<a name='fnref_" + n.name + "'/>" +
                "<a class='org-inline-fnref' href='#fndef_" + n.name + "'><sup>" +
                num + "</sup></a>";
      },

      /*orgdoc
      *** =SubInline=
      */
      SubInline: function(n, r){
        return "<sub>" +
                r.htmlize(n.content, r) + "</sub>";
      },

      /*orgdoc
      *** =SupInline=
      */
      SupInline: function(n, r){
        return "<sup>" +
                r.htmlize(n.content, r) + "</sup>";
      },

      /*orgdoc
      *** =TimestampInline=
      */
      TimestampInline: function(n, r){
        var ts     = n.timestamp;
        return "<span class='org-inline-timestamp'>" +
                ts.format("%y/%m/%d %H:%M") + "</span>";
      },

      /*orgdoc
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
      */
      RootBlock: function(n, r){
        var out = "<div class='org_content'>\n";
        out += r.renderChildren(n, r);
        out += "</div>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =UlistBlock=
           =UlistBlock=s are rendered with a simple =ul= tag.
      */
      UlistBlock: function(n, r){
        var out = "<ul>\n";
        out += r.renderChildren(n, r);
        out += "</ul>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =OlistBlock=
           =OlistBlock=s are rendered with a simple =ol= tag.

           If the block has a =start= property different from =1=, it is
           inserted in the =start= attribute of the tag.
      */
      OlistBlock: function(n, r){
        var s = n.start;
        var out = "<ol" + (s === 1 ? ">\n" : " start='" + r.escapeHtml(s) + "'>\n");
        out += r.renderChildren(n, r);
        out += "</ol>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =DlistBlock=
           =DlistBlock=s are rendered with a =dl= tag.

           =DlistItemBlock=s will have to use =dt=/=dd= structure
           accordingly.
      */
      DlistBlock: function(n, r){
        var out = "<dl>\n";
        out += r.renderChildren(n, r);
        out += "</dl>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =UlistItemBlock= and =OlistItemBlocks=
           =UlistItemBlock=s and =0listItemBlocks= are rendered with a
           #simple =li= tag.
      */
      UlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n, r);
        out += "</li>\n";
        return out;
      },

      OlistItemBlock: function(n, r){
        var out = "<li>\n";
        out += r.renderChildren(n, r);
        out += "</li>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =DlistItemBlock=
           =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

           The content of the =dt= is the =title= attribute of the block.

           The content of the =dd= is the rendering of this block's children.
      */
      DlistItemBlock: function(n, r){
        var out = "<dt>" + r.render(n.titleInline, r) + "</dt>\n<dd>\n";
        out += r.renderChildren(n, r);
        out += "</dd>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =ParaBlock=
           =ParaBlock=s are rendered with a =p= tag.

           The content of the tag is the concatenation of this block's
           =this.lines=, passed to the =renderMarkup= function.
      */
      ParaBlock: function(n, r){
        return "<p>\n" + r.renderChildren(n, r) + "</p>\n";
      },

      /*orgdoc
      *** Rendering =VerseBlock=
           =VerseBlock=s are rendered with a =p= tag, with class
           =verse=.

           All spaces are converted to unbreakable spaces.

           All new lines are replaced by a =br= tag.
      */
      VerseBlock: function(n, r){
        var out = "<pre class='verse'>\n" + r.renderChildren(n, r) + "</pre>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =QuoteBlock=
           =QuoteBlock=s are rendered with a =blockquote= tag.

           If the quote contains an author declaration (after a double dash),
           this declaration is put on a new line.
      */
      QuoteBlock: function(n, r){
        var out = "<blockquote>\n" + r.renderChildren(n, r) + "</blockquote>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CenterBlock=
           =CenterBlock=s are rendered with a simple =center= tag.
      */
      CenterBlock: function(n, r){
        return "<center>\n" + r.renderChildren(n, r) + "</center>\n";
      },

      /*orgdoc
      *** Rendering =ExampleBlock=
           =ExampleBlock=s are rendered with a simple =pre= tag.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      ExampleBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var out = "<pre>\n" + markup + "</pre>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =SrcBlock=
           =SrcBlock=s are rendered with a =pre.src= tag with a =code= tag within.
           The =code= tag may have a class attribute if the language of the
           block is known. In case there is, the class would take the language
           identifier.

           The content is not processed with the =renderMarkup= function, only
           with the =escapeHtml= function.
      */
      SrcBlock: function(n, r){
        var content = n.lines.join("\n") + "\n";
        var markup = r.escapeHtml(content);
        var l = n.language;
        var out = "<pre class='src prettyprint" +
                  ( l ? " lang-" + l : "") + "'>" +
                  markup + "</pre>\n";
        return out;
      },

      /*orgdoc
      *** Rendering =HtmlBlock=
           =HtmlBlock=s are rendered by simply outputting the HTML content
           verbatim, with no modification whatsoever.
      */
      HtmlBlock: function(n, r){
        var out = n.lines.join("\n") + "\n";
        return out;
      },

      /*orgdoc
      *** Rendering =CommentBlock=
           =CommentBlock=s are ignored.
      */
      FndefBlock: function(n, r){
        return "";
      },

      CommentBlock : function(n, r){
        return "";
      },


      /*orgdoc
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
      */
      Node: function(n, r){
        var headline = n.level === 0 ? n.meta["TITLE"] : n.heading.getTitle();
        var headInline = r.render(n.heading.titleNode, r);
        var todo = n.heading.getTodo();

        var html = "<section id='%REPR%' class='orgnode level-%LEVEL%'>";
        html = html.replace(/%REPR%/, n.repr());
        html = html.replace(/%LEVEL%/, n.level);

        var title = "<div class='title'>%TODO%%HEADLINE%%TAGS%</div>";
        title = title.replace(/%HEADLINE%/, headInline);
        var tags = "";
        _U.each(n.heading.getTags(), function(tag, idx){
          if(tag.length){
            tags += " <span class='tag'>" + tag + "</span>";
          }
        });
        title = title.replace(/%TODO%/, todo ? " <span class='todo'>" + todo + "</span> " : "");
        title = title.replace(/%TAGS%/, tags);

        html += title;

        var childrenHtml = r.renderChildren(n, r);
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
    return _U.merge(renderer, DefaultRenderer);
  };

  return {
    html: DefaultHTMLRenderer,
    org:  DefaultOrgRenderer,
    struct: StructRenderer
  };
};

/*orgdoc
** Conclusion

    This is the end of the function creating the default renderer.
*/
