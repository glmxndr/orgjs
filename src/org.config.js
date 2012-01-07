/*orgdoc+++/
* TODO =Org.Config= : configuration
/-orgdoc*/

Org.getConfig = function(org, params){

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

  return _C;

};

/*orgdoc+/
** Tab width
** URL protocols

/---orgdoc*/