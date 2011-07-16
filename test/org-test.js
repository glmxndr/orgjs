// Load the document and parse it
$(function(){
  $.get("test/document.org", function(data){
    var root = Org.Outline.parse(data);
    $('#doc').html(root.render());
    Org.Utils.log(root);
  });
});
