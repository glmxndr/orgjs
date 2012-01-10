// Load the document and parse it
$(function(){
  /*///
  $.get("test/document.org", function(data){
    var root = Org.Outline.parse(data);
    $('#sample').html(root.render());
    Org.Utils.log(root);
  });
  //*/

  $.get("doc/org-js.org", function(data){
    var org = new Org();
    var root = org.Parser.parse(data);
    var renderer = org.Renderers.html();
    $('#doc').html(renderer.render(root));
  });
  /*/
  var location = "test/include/test_include.org";
  $.get(location, function(data){
    var org = new Org();
    var root = org.Parser.parse(data, location);
    var renderer = org.Renderers.html();
    $('#doc').html(renderer.render(root));
  });

  //*/

});
