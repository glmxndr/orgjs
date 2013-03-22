/*orgdoc
* TODO =Org.Config= : configuration
*/

Org.getConfig = function(org, params){

  params = params || {};

  var _C = {};

  /*orgdoc
  ** URL protocols
  */
  _C.urlProtocols = params.urlProtocols || [
    "http",
    "https",
    "ftp",
    "mailto",
    "file",
    "id",
    "javascript",
    "elisp"
  ];

  _C.todoMarkers = params.todoMarkers || [
    "TODO",
    "DONE"
  ];

  /*orgdoc

  ** Tab width
      Specifies how much single spaces for each tabulation character. 4 by default.
  */
  _C.tabWidth = params.tabWidth || 4;


  return _C;

};

/*orgdoc+/
  #+END_SRC

** Tab width
** URL protocols

/---orgdoc*/