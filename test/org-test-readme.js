// Load the document and parse it
$(function(){
  $.get("README.org", function(data){
    var org = new Org();
    var root = org.Parser.parse(data);
    var renderer = org.Renderers.html();
    $('#doc').html(renderer.render(root));
    prettyPrint();
    console.log(root);
  });
});
