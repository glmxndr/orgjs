// Load the document and parse it
$(function(){
  /*////
  $.get("test/document.org", function(data){
    var org = new Org();
    var root = org.Outline.parse(data);
    console.log(root);
    var renderer = org.Renderers.html();
    var jsonRenderer = org.Renderers.json();
    console.log(jsonRenderer.render(root));
    $('#doc').html(renderer.render(root));
  });
  /*/

  $.get("doc/org-js.org", function(data){
    var org = new Org();
    var root = org.Outline.parse(data);
    console.log(root);
    var renderer = org.Renderers.html();
    var jsonRenderer = org.Renderers.json();
    console.log(jsonRenderer.render(root));
    $('#doc').html(renderer.render(root));
  });
  //*/

});
