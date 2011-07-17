/*orgdoc+++/
#+TITLE:     Org-Mode Javascript Parser

This project aims to provide a parser and easily customizable renderer
for [[http://orgmode.org/][Org-Mode]] files in JavaScript.

* =Org= : the Main object

  The global context is extended with only one object, named =Org=.

   #+BEGIN_SRC js
/-orgdoc*/
var Org = {
  version: "0.1",   
  apiversion: "7.6"
};
/*orgdoc+/
   #+END_SRC
/---orgdoc*/