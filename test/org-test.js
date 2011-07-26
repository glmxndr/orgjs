// Load the document and parse it
$(function(){
  /*////
  $.get("test/document.org", function(data){
    var root = Org.Outline.parse(data);
    $('#sample').html(root.render());
    Org.Utils.log(root);
  });
  //*///

  $.get("doc/org-js.org", function(data){
    var root = Org.Outline.parse(data);
    $('#doc').html(root.render());
    Org.Utils.log(root);
  });

});
