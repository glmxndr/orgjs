
/*orgdoc
* =Org.Regexps= : the regexp bank

  The parser needs a lot of regular expressions.
  Non trivial regexps will be found in the file =org.regexps.js=,
  and accessible under the object =Org.Regexps=.
*/

(function() {

  Org.getRegexps = function(org, params) {
    var _C, _R;
    _C = org.Config;
    _R = {
      /*orgdoc
       + A new line declaration, either windows or unix-like
      */
      newline: /\r?\n/,
      /*orgdoc
       + Captures the first line of the string
      */
      firstLine: /^(.*)/,
      /*orgdoc
       + Selects anything in the given string until the next heading, or the end.
         Example :
         #+BEGIN_EXAMPLE
         some content
         * next heading
         #+END_EXAMPLE
         would match "some content\n\n*"
                Captures everything except the star of the following heading.
      */
      beforeNextHeading: /^([\s\S]*?)(?:\n\*|$)/,
      /*orgdoc
       + Parses a heading line, capturing :
         - the stars
         - the TODO status
         - the priority
         - the heading title
         - the tags, if any, separated by colons
      */
      headingLine: (function() {
        var str;
        str = "(\\**)\\s*";
        str += "(?:(" + _C.todoMarkers.join('|') + ")\\s+)?";
        str += "(?:\\[\\#([A-Z])\\]\\s+)?";
        str += "(.*?)\\s*";
        str += "(?:\\s+:([A-Za-z0-9:]+):\\s*)?";
        str += "(?:\n|$)";
        return RegExp(str);
      })(),
      /*orgdoc
       + How a meta information begins ( =#\+META_KEY:= )
      */
      metaDeclaration: /\s*#\+[A-Z0-9_]+:/,
      /*orgdoc
       + A meta information line, capturing:
         - the meta key,
         - the meta value
         Example:
         #+BEGIN_EXAMPLE
            #+TITLE: The title
         #+END_EXAMPLE
         captures: "TITLE", "The title"
      */
      metaLine: /(?:^|\s*)#\+([A-Z0-9_]+):\s*(.*)(\n|$)/m,
      /*orgdoc
       + The property section. Captures the content of the section.
      */
      propertySection: /:PROPERTIES:\s*\n([\s\S]+?)\n\s*:END:/,
      /*orgdoc
       + Property line. Captures the KEY and the value.
      */
      propertyLine: /^\s*:([A-Z0-9_-]+):\s*(\S[\s\S]*)\s*$/i,
      /*orgdoc
       + Clock section when several clock lines are defined.
      */
      clockSection: /:CLOCK:\s*\n([\s\S]+?)\n?\s*:END:/,
      /*orgdoc
       + Matches a clock line, either started only, or finished.
         Captures:
          - start date (yyyy-MM-dd)
          - start time (hh:mm)
          - end date (yyyy-MM-dd)
          - end time (hh:mm)
          - duration (hh:mm)
      */
      clockLine: /CLOCK: \[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\](?:--\[(\d{4}-\d\d-\d\d) [A-Za-z]{3}\.? (\d\d:\d\d)\] =>\s*(-?\d+:\d\d))?/g,
      /*orgdoc
        + Scheduled
      */
      scheduled: /SCHEDULED: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,
      /*orgdoc
        + Deadline
      */
      deadline: /DEADLINE: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,
      /*orgdoc
        + The different kinds of lines encountered when parsing the content
      */
      lineTypes: {
        letter: /^\s*[a-z]/i,
        ignored: /^#(?:[^+]|$)/,
        litem: /^\s+[+*-]\ /,
        dlitem: RegExp(" ::"),
        olitem: /^\s*\d+[.)] /,
        fndef: /^\s*\[(\d+|fn:.+?)\]/,
        _bBlk: {},
        beginBlock: function(type) {
          return this._bBlk[type] || (this._bBlk[type] = new RegExp("^\\s*#\\+BEGIN_" + type + "(\\s|$)", "i"));
        },
        _eBlk: {},
        endBlock: function(type) {
          return this._eBlk[type] || (this._eBlk[type] = new RegExp("^\\s*#\\+END_" + type + "(\\s|$)", "i"));
        }
      }
    };
    return _R;
  };

}).call(this);
