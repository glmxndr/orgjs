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
  //*///

  var org = new Org();
  var path = org.Utils.path.concat("src/", "org.api.js");
  console.log(path);
  var api = org.Utils.get(path);
  console.log(api);

});
