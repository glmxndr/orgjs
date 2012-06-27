// Load the document and parse it
$(function(){
  
  $('section.orgnode > div.title').live('click', function(){
    $(this).next('.org_content').slideToggle();
  });

  /*/
  $.get("doc/org-js.org", function(data){
    var org = new Org();
    var root = org.Parser.parse(data);
    var renderer = org.Renderers.org();
    $('#doc').html("<pre>" + renderer.render(root) + "</pre>");
    prettyPrint();
    jsMath.Process(document);
    console.log(root);
  });

  /*/
  var location = "doc/org-js.org";//"test/include/test_include.org";
  $.get(location, function(data){
    var org = new Org();
    var root = org.Parser.parse(data, location);
    var renderer = org.Renderers.html();
    $('#doc').html(renderer.render(root));
    prettyPrint();
    jsMath.Process(document);
  });
  //*/

});
