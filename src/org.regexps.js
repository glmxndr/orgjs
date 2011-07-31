/*orgdoc+++/

* =Org.Regexps= : the regexp bank

  The parser needs a lot of regular expressions.
  Non trivial regexps will be found in the file =org.regexps.js=, 
  and accessible under the object =Org.Regexps=.

   #+BEGIN_SRC js
/-orgdoc*/

Org.getRegexps = function(org, params){
  
  var RGX = {

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

    deadline: /DEADLINE: <(\d{4}-\d\d-\d\d) [A-Za-z]{3}>/,

    _bBlk: {},
    beginBlock: function(type){
      return this._bBlk[k] || 
        (this._bBlk[k] = new RegExp("^\\s*#\\+BEGIN_" + type + "|\\s\n]", "i"));
    },

    _eBlk: {},
    endBlock: function(type){
      return this._eBlk[k] || 
        (this._eBlk[k] = new RegExp("^\\s*#\\+END_" + type + "|\\s\n]", "i"));
    }

  };

  return RGX;
  
};

/*orgdoc+/
   #+END_SRC
/---orgdoc*/