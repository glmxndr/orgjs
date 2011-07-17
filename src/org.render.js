/*orgdoc+++/
* Default Rendering
  :PROPERTIES:
  :author: G.A.
  :file: org.render.js
  :END:

  This section provides a default HTML renderer for the parsed tree.

  It is intended to provide an example of how to attach rendering
  functions to the =Outline.Node='s and the different
  =Content.Block='s prototypes.

** Initialisations
    Working in the context of the =Org= object. We will need, as
    usual, some shortcuts to the =Utils=, and to =Org.Content= and
    =Org.Outline=.

    #+BEGIN_SRC js
/-orgdoc*/
(function(Org){

  var OC = Org.Content;
  var OO = Org.Outline;
  var _U = Org.Utils;

/*orgdoc+/
    #+END_SRC
** Utility functions
*** escapeHtml(str)                                                :function:
     + Purpose :: The =escapeHtml= function escapes the forbidden
                  characters in HTML/XML: =&=, =>=, =<=, ='= and ="=,
                  which are all translated to their corresponding
                  entity.
     + Arguments :: =str=
       + =str= :: any value, converted into a string at the beginning
                  of the function.
     #+BEGIN_SRC js
/-orgdoc*/

  function escapeHtml(str){
    str = "" + str;
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/'/g, "&apos;");
    str = str.replace(/"/g, "&quot;");
    return str;
  }

/*orgdoc+/
     #+END_SRC
*** renderMarkup                                                   :function:
     + Purpose :: this function converts the wiki-style markup of
                  Org-Mode into HTML.
     + Arguments :: =str=
       + =str= :: any value, converted into a string at the beginning
                  of the function.
     #+BEGIN_SRC js
/-orgdoc*/

  function renderMarkup(str){
    str = "" + str;
    str = escapeHtml(str);
    str = str.replace(/\/([^\s/][^/]*?[^\s/]|[^/])\//g, "<em>$1</em>");
    str = str.replace(/_([^\s_][^_]*?[^\s_]|[^_])_/g,   "<u>$1</u>");
    str = str.replace(/=([^\s=][^=]*?[^\s=]|[^=])=/g,   "<code>$1</code>");
    str = str.replace(/~([^\s~][^~]*?[^\s~]|[^~])~/g,   "<samp>$1</samp>");
    str = str.replace(/\*([^*\s][^*]*?[^*\s]|[^*])\*/g, "<strong>$1</strong>");
    str = str.replace(/\+([^\s+][^+]*?[^\s+]|[^+])\+/g, "<s>$1</s>");
    str = str.replace(/\\\\/g, "<br/>");
    str = str.replace(/\\ /g, "&nbsp;");
    str = str.replace(/\s--\s/g, " &#151; ");
    return str;
  }

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

  function renderChildren(){
    var i, out = "";
    for(i in this.children){
      if(this.children[i].render){
       out += this.children[i].render();
      }
    }
    return out;
  }

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

  OC.RootBlock.prototype.render = function(){
    var out = "<div class='org_content'>\n";
    out += renderChildren.call(this);
    out += "</div>\n";
    return out;
  };

/*orgdoc+/
     #+END_SRC

*** Rendering =UlistBlock=
     =UlistBlock=s are rendered with a simple =ul= tag.

     #+BEGIN_SRC js
/-orgdoc*/

  OC.UlistBlock.prototype.render = function(){
    var out = "<ul>\n";
    out += renderChildren.call(this);
    out += "</ul>\n";
    return out;
  };

/*orgdoc+/
     #+END_SRC

*** Rendering =OlistBlock=
     =OlistBlock=s are rendered with a simple =ol= tag.

     If the block has a =start= property different from =1=, it is
     inserted in the =start= attribute of the tag.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.OlistBlock.prototype.render = function(){
    var s = this.start;
    var out = "<ol" + (s === 1 ? ">\n" : " start='" + escapeHtml(s) + "'>\n");
    out += renderChildren.call(this);
    out += "</ol>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =DlistBlock=
     =DlistBlock=s are rendered with a =dl= tag.

     =DlistItemBlock=s will have to use =dt=/=dd= structure
     accordingly.

     #+BEGIN_SRC js
/-orgdoc*/

  OC.DlistBlock.prototype.render = function(){
    var out = "<dl>\n";
    out += renderChildren.call(this);
    out += "</dl>\n";
    return out;
  };

/*orgdoc+/
     #+END_SRC

*** Rendering =UlistItemBlock= and =OlistItemBlocks=
     =UlistItemBlock=s and =0listItemBlocks= are rendered with a
     #simple =li= tag.

     #+BEGIN_SRC js
/-orgdoc*/

  OC.UlistItemBlock.prototype.render =
  OC.OlistItemBlock.prototype.render = function(){
    var out = "<li>\n";
    out += renderChildren.call(this);
    out += "</li>\n";
    return out;
  };

/*orgdoc+/
     #+END_SRC

*** Rendering =DlistItemBlock=
     =DlistItemBlock=s are rendered with a =dt=/=dl= tag structure.

     The content of the =dt= is the =title= attribute of the block.

     The content of the =dd= is the rendering of this block's children.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.DlistItemBlock.prototype.render = function(){
    var out = "<dt>" + renderMarkup(this.title) + "</dt>\n<dd>\n";
    out += renderChildren.call(this);
    out += "</dd>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =ParaBlock=
     =ParaBlock=s are rendered with a =p= tag.

     The content of the tag is the concatenation of this block's
     =this.lines=, passed to the =renderMarkup= function.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.ParaBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<p>\n" + markup + "</p>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =VerseBlock=
     =VerseBlock=s are rendered with a =p= tag, with class
     =verse=.

     All spaces are converted to unbreakable spaces.

     All new lines are replaced by a =br= tag.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.VerseBlock.prototype.render = function(){
    var content = this.lines.join("\\\\\n") + "\n";
    var markup = renderMarkup(content);
    markup = markup.replace(/ /g, "&nbsp;");
    var out = "<p class='verse'>\n" + markup + "</p>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =QuoteBlock=
     =QuoteBlock=s are rendered with a =blockquote= tag.

     If the quote contains an author declaration (after a double dash),
     this declaration is put on a new line.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.QuoteBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    content = content.replace(/\s(--\s)/g, "\\\\\n\\ \\ \\  $1");
    var markup = renderMarkup(content);
    var out = "<blockquote>\n" + markup + "</blockquote>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =CenterBlock=
     =CenterBlock=s are rendered with a simple =center= tag.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.CenterBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<center>\n" +
              markup + "</center>\n";
    return out;
  };

/*orgdoc+/
    #+END_SRC

*** Rendering =ExampleBlock=
     =ExampleBlock=s are rendered with a simple =pre= tag.

     The content is not processed with the =renderMarkup= function, only
     with the =escapeHtml= function.

    #+BEGIN_SRC js
/-orgdoc*/

  OC.ExampleBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = escapeHtml(content);
    var out = "<pre>\n" + markup + "</pre>\n";
    return out;
  };

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

  OO.Node.prototype.render = function(){
    var headline = this.level === 0 ? this.meta["TITLE"] : this.heading.getTitle();

    var html = "<section id='%ID%' class='orgnode level-%LEVEL%'>" +
        "%TITLE%\n" +
        "%CONTENT%\n" +
        "%CHILDREN%" +
      "</section>";
    html = html.replace(/%ID%/, this.id());
    html = html.replace(/%LEVEL%/, this.level);

    var title = "<div class='title'>%HEADLINE%%TAGS%</div>";
    title = title.replace(/%HEADLINE%/, renderMarkup(headline));
    var tags = "";
    _U.each(this.heading.getTags(), function(tag, idx){
      if(tag.length){
        tags += " <span class='tag'>" + tag + "</span>";
      }
    });
    title = title.replace(/%TAGS%/, tags);

    html = html.replace(/%TITLE%/, title);

    var contentTxt = this.parser.getContent();
    var lines = _U.lines(contentTxt);
    this.contentNode = Org.Content.parse(lines);
    var contentHtml = this.contentNode.render();
    html = html.replace(/%CONTENT%/, contentHtml);

    var childrenHtml = renderChildren.call(this);
    html = html.replace(/%CHILDREN%/, childrenHtml);
    return html;
  };


/*orgdoc+/
    #+END_SRC
** Conclusion

    This is the end of the function creating the default renderer.

    #+BEGIN_SRC js
/-orgdoc*/

}(Org));

/*orgdoc+/
    #+END_SRC
/---orgdoc*/
