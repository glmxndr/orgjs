Org.Utils = (function(Org){
  
  var RGX = Org.Regexps;

  return {
    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    repeat: function(str, times){
      var result = "";
      for(var i=0; i<times; i++){
        result += str;
      }
      return result;
    },
    
    each: function(arr, fn){
      var name, length = arr.length, i = 0, isObj = length === undefined;
      if ( isObj ) {
        for ( name in arr ) {
          if ( fn.call( arr[ name ], arr[ name ], name ) === false ) {break;}
        }
      } else {
        if(!length){return;}
        for ( var value = arr[0];
          i < length && fn.call( value, value, i ) !== false; 
          value = arr[++i] ) {}
      }
    },
    
    map: function(arr, fn){
      var result = [];
      this.each(arr, function(val, idx){
        var mapped = fn.call(val, val, idx);
        if (mapped != null){result.push(mapped);}
      });
      return result;
    },
    
    log: function(o){
      if(console && console.log){console.log(o);}
    },
    
    firstLine: function(str){
      var match = RGX.firstLine.exec(str);
      return match ? match[0] : "";
    },
    
    lines: function(str){
      if (!str && str !== ""){return [];}
      return str.split(RGX.newline);
    },
    
    indentLevel: function(str){
      return /^\s*/.exec(str)[0].length;
    }
  };

}(Org));