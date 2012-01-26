/*orgdoc
#+TITLE:     Org-Mode Javascript Parser

This project aims to provide[fn:2] a parser and easily customizable renderer
for [[http://orgmode.org/][Org-Mode]] files in JavaScript.

[fn:2] Oh, right!

[1] Oh, right again!

# This is a comment!

#+INCLUDE: "../test/include/doc_header.org"

* =Org= : the Main object

  The global context[1] is extended with only one object, named =Org=.

*/
var Org = function(params){
  this.version    = "0.1";
  this.apiversion = "7.6";
  this.Config     = Org.getConfig(this, params);
  this.Regexps    = Org.getRegexps(this, params);
  this.Utils      = Org.getUtils(this, params);
  this.Markup     = Org.getMarkup(this, params);
  this.Content    = Org.getContent(this, params);
  this.Outline    = Org.getOutline(this, params);
  this.Parser     = Org.getParser(this, params);
  this.Renderers  = Org.getRenderers(this, params);
};
