(function(Org, $){

////////////////////////////////////////////////////////////////////////////////
// INITIALISATIONS

  var OC = Org.Content;
  var OO = Org.Outline;
  var _U = Org.Utils;

////////////////////////////////////////////////////////////////////////////////
// UTIL

  function escapeHtml(str){
    str = "" + str;
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/'/g, "&apos;");
    str = str.replace(/"/g, "&quot;");
    return str;
  }

  /* Renders the wiki-style markup in content blocks */
  function renderMarkup(str){
    str = "" + str;
    str = escapeHtml(str);
    str = str.replace(/\/([^\s/][^/]*[^\s/])\//g, "<em>$1</em>");
    str = str.replace(/\\\\/g, "<br/>");
    str = str.replace(/\\ /g, "&nbsp;");
    str = str.replace(/\s--\s/g, " &#151; ");
    str = str.replace(/@([^\s@][^@]*[^\s@])@/g, "<code>$1</code>");
    str = str.replace(/\*([^\s][^*]*[^\s])\*/g, "<strong>$1</strong>");
    return str;
  }

  /* For container blocks, render all their children. */
  function renderChildren(){
    var i, out = "";
    for(i in this.children){
      if(this.children[i].render){
       out += this.children[i].render();
      }
    }
    return out;
  };

////////////////////////////////////////////////////////////////////////////////
// RENDERERS

  OC.RootBlock.prototype.render = function(){
    var out = "<div class='org_content'>\n";
    out += renderChildren.call(this);
    out += "</div>\n";
    return out;
  };

  OC.UlistBlock.prototype.render = function(){
    var out = "<ul>\n";
    out += renderChildren.call(this);
    out += "</ul>\n";
    return out;
  };

  OC.OlistBlock.prototype.render = function(){
    var s = this.start;
    var out = "<ol" + (s === 1 ? ">\n" : " start='" + escapeHtml(s) + "'>\n");
    out += renderChildren.call(this);
    out += "</ol>\n";
    return out;
  };

  OC.DlistBlock.prototype.render = function(){
    var out = "<dl>\n";
    out += renderChildren.call(this);
    out += "</dl>\n";
    return out;
  };

  OC.UlistItemBlock.prototype.render = 
  OC.OlistItemBlock.prototype.render = function(){
    var out = "<li>\n";
    out += renderChildren.call(this);
    out += "</li>\n";
    return out;
  };

  OC.DlistItemBlock.prototype.render = function(){
    var out = "<dt>" + renderMarkup(this.title) + "</dt>\n<dd>\n";
    out += renderChildren.call(this);
    out += "</dd>\n";
    return out;
  };

  OC.ParaBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<p>\n" + markup + "</p>\n";
    return out;
  };

  OC.VerseBlock.prototype.render = function(){
    var content = this.lines.join("\\\\\n") + "\n";
    var markup = renderMarkup(content);
    markup = markup.replace(/ /g, "&nbsp;");
    var out = "<p class='verse'>\n" + markup + "</p>\n";
    return out;
  };

  OC.QuoteBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    content = content.replace(/\s(--\s)/g, "\\\\\n\\ \\ \\  $1");
    var markup = renderMarkup(content);
    var out = "<blockquote>\n" + markup + "</blockquote>\n";
    return out;
  };

  OC.CenterBlock.prototype.render = function(){
    var content = this.lines.join("\n") + "\n";
    var markup = renderMarkup(content);
    var out = "<p class='org-center' style='text-align:center'>\n" + 
              markup + "</p>\n";
    return out;
  };

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
    var contentHtml = Org.Content.parse(lines).render();
    html = html.replace(/%CONTENT%/, contentHtml);

    var childrenHtml = renderChildren.call(this);
    html = html.replace(/%CHILDREN%/, childrenHtml);
    return html;
  };

}(Org, jQuery));