// Load the document and parse it
$(function(){
  $.get("test/document.org", function(data){
    $('#doc').html(Org.Outline.parse(data).render());
  });
});
