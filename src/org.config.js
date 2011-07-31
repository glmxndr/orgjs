/*orgdoc+++/
* TODO =Org.Config= : configuration


  #+BEGIN_SRC js
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
  #+END_SRC

** Tab width
** URL protocols

/---orgdoc*/