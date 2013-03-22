
/*orgdoc

* =OrgPath=
  An XPath-like language to select items in the =Org= document tree.

  This allows to provide a selection mechanism to apply templates to nodes
  at rendering time.

** Path examples 
   Just to give a feeling of the selecting language, here are a few examples:

   + =*= :: any item whatsoever
   + =node=, =node{*}= :: any node, an any level
   + =n{*}=, =n= :: any node, 'n' being shortcut for 'node'
   + =n3=, =n{3}= :: any node of level 3
   + =n{1-3}=, =n3[level~1-3]= :: any node of level 1 to 3
   + =n3:tag= :: any node of level 3 with a tag "tag" (possibly implied by parents)
   + =n3!tag= :: any node of level 3 with a tag "tag" defined at this node
   + =n3[position\=2]= :: any second node of level 3 within its parent
   + =n3[2]=  :: any second node of level 3 within its parent
   + =n3[todo\=DONE]= :: any node of level 3 with a "DONE" todo-marker
   + =n3/src1=, =n3/src{1}=, =n3/src[level~1-3]= :: any =BEGIN_SRC= item right under a node of level 3
   + =n3/src= :: any =BEGIN_SRC= item within the content a node of level 3
   + =n3//src= :: any =BEGIN_SRC= item anywhere under a node of level 3
   + =src= :: any =BEGIN_SRC= item anywhere
   + =src[lang\=js]= :: any =BEGIN_SRC= item anywhere whith language set as 'js'
   + =src>p= :: first paragraph following a =BEGIN_SRC= item
   + =src>>p= :: any paragraph following a =BEGIN_SRC= item
   + =src<p= :: first paragraph preceding a =BEGIN_SRC= item
   + =src<<p= :: any paragraph preceding a =BEGIN_SRC= item
   + =src/..= :: parent of a =BEGIN_SRC= item


*/
Org.Path = (function(){

  var OrgPath = function(str){
    this.parse(str);
  };
  OrgPath.prototype.accept = function(){
    
  };

  OrgPath.prototype.parse = function(str){
    
    var levels = str.split(/(?=\/\/?)/);
    

  };
  

return OrgPath;

}());

