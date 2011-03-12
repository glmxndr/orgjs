// Load the document and parse it
$(function(){
  $.get("test/document.org", function(data){
    $('#doc').html(OrgJS.parse(data));
  });
});
