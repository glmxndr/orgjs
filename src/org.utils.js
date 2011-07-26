/*orgdoc+++/
* =Org.Utils= : useful functions

  Many functionalities are used throughout the parser, mainly to process
  strings. The =Org.Utils= object contains these functions.

   #+BEGIN_SRC js
/-orgdoc*/

Org.Utils = (function(Org){
  
  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  var RGX = Org.Regexps;

  return {
    range: function(){
      var from, to, step, args = arguments, result = [], i;
      switch(args.length){
        case 0: return result;
        case 1: from = 0;       to = args[0]; step = to > from ? 1 : -1; break;
        case 2: from = args[0]; to = args[1]; step = to > from ? 1 : -1; break;
        case 3: from = args[0]; to = args[1]; step = args[2];            break;
      }
      if(step === 0){return result;}
      for(i = from; step > 0 ? i < to : i > to ; i += step){
        result.push(i);
      }
      return result;
    },

    trim: function(str){
      return str && str.length ? str.replace(/^\s*|\s*$/g, "") : "";
    },

    empty: function(o){
      // Valid only for strings and arrays
      return (!(o && o.length));
    },

    notEmpty: function(o){
      // Valid only for strings and arrays
      return !this.empthy(o);
    },

    blank: function(str){
      // Valid only for strings and arrays
      return str && str == 0;
    },

    notBlank: function(str){
      // Valid only for strings and arrays
      return !this.blank(str);
    },

    repeat: function(str, times){
      var result = [];
      for(var i=0; i<times; i++){
        result.push(str);
      }
      return result.join('');
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
    },

    randomStr: function(length){
      var str = "";
      var available = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for( var i=0; i < length; i++ )
          str += available.charAt(Math.floor(Math.random() * available.length));
      return str;
    },

    keys: function(obj){
      var result = [];
      this.each(obj, function(v, k){result.push(k);});
      return result;
    },

    joinKeys: function(str, obj){
      return this.keys(obj).join(str);
    },

    getAbsentToken: function(str, prefix){
      var token, start = prefix + "_";
      if(str.indexOf(start) === -1){return start;}
      token = start + this.randomStr(5);
      while(str.indexOf(token) !== -1){
        token = start + this.randomStr(5);
      }
      return token;
    }

  };

}(Org));

/*orgdoc+/
   #+END_SRC
/---orgdoc*/ 