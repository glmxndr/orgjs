/*orgdoc
* TODO =Org.Config= : configuration
*/

Org.getConfig = function(org, params){

  params = params || {};

  var _C = {};

  _C.urlProtocols = [
    "http",
    "https",
    "ftp",
    "mailto",
    "file",
    "id",
    "javascript",
    "elisp"
  ];

/*orgdoc

** Tab width
    Specifies how much single spaces for each tabulation character. 4 by default.
*/
  _C.tabWidth = params.tabWidth || 4;


  return _C;

};

/*orgdoc
** Tab width
** URL protocols

*/