#! /usr/bin/env node

var fs  = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    exec = require('child_process').exec;

var srcFiles = [
  './src/org.main.js',
  './src/org.path.js',
  './src/org.config.js',
  './src/org.regexps.coffee',
  './src/org.utils.js',
  './src/org.markup.js',
  './src/org.content.js',
  './src/org.outline.js',
  './src/org.parser.js',
  './src/org.render.js',
  './src/org.api.js'
];

var isBuildingSrc = false;
var isBuildingDoc = false;
var isBuildingReadme = false;
var isBuilding = function(){return isBuildingSrc || isBuildingDoc || isBuildingReadme;};
var release = function(type){
  if(type === "doc"){isBuildingDoc = false;}
  if(type === "readme"){isBuildingReadme = false;}
  if(type === "src"){isBuildingSrc = false;}
  if(!isBuilding()){
    log("Done building all.");
  }
};

var noop = function(){};
function date(){return new Date().toTimeString();}
function log(str){console.log(date() + ' # ' + str);}


var watchFiles = true;
process.argv.forEach(function (val, index, array) {
  if(val === "nowatch"){
    log("No listening...");
    watchFiles = false;
  }
});

function watch(file){
  fs.realpath('.',function(err,path){
    log("Watching " + file);
    fs.watchFile(file, {persistent:true, interval: 200}, buildAll);
  });
}

function buildAll(){
  if(!isBuilding()){
    isBuildingSrc = true;
    isBuildingDoc = true;
    log("Start building all...");
    buildSrc();
    buildDoc();
  }
}

function buildSrc(){
  var out = "";
  var filename = 'script/org.js';
  var files = srcFiles.slice(0);

  readFile();

  function readFile(){
    var file = files.shift();
    var child;
    if(file){
      if(file.match(/\.coffee$/)){
        var filepath = path.join(path.dirname(fs.realpathSync(__filename)), '.' + file);
        var command = 'coffee -c "' + filepath + '"';
        log(command);
        exec(command, function(err, stdout, stderr){
          log("Compiled, status " + err);
          file = file.replace(/\.coffee$/, ".js");
          fs.readFile(file, concat);
        });
      } else {
        fs.readFile(file, concat);
      }
    } else {
      writeFile();
      return;
    }
  }

  function concat(err, data){
    data = "" + data;
    out += data;
    readFile();
  }

  function writeFile(){
    // Remove opening comments right after closing them
    out = out.replace(/\s*\*\/\s*\/\*orgdoc/gi, "");
    // Remove empty comments
    out = out.replace(/\s*\/\*orgdoc\s*\*\//gi, "");
    fs.writeFile(filename, out, function(){
      log("SRC Wrote " + filename);
      release("src");
    });
  }
}


var docFiles = [
  './src/org.main.js',
  './src/org.api.js',
  './src/org.config.js',
  './src/org.parser.js',
  './src/org.outline.js',
  './src/org.content.js',
  './src/org.markup.js',
  './src/org.regexps.coffee',
  './src/org.utils.js',
  './src/org.path.js',
  './src/org.render.js'
];

function buildDoc(){

  var out = "", fileContent;
  var filename = 'doc/org-js.org';
  var readmename = 'README.org';
  var files = docFiles.slice(0);

  readFile();
  
  function readFile(){
    var file = files.shift();
    if(file){
      if(file.match(/\.coffee$/)){
        var filepath = path.join(path.dirname(fs.realpathSync(__filename)), '.' + file);
        var command = 'coffee -c "' + filepath + '"';
        log(command);
        exec(command, function(err, stdout, stderr){
          log("Compiled, status " + err);
          file = file.replace(/\.coffee$/, ".js");
          fs.readFile(file, concat);
        });
      } else {
        fs.readFile(file, concat);
      }
    } else {
      writeFile();
      return;
    }
  }

  function concat(err, data){
    data = "" + data;
    data = data.replace(/^\n+/, "");

    var STATE = function(prev, line, rgx, next){
      this.prev = prev;
      this.lines = [];
      this.indent = /^\s*/.exec(line)[0];
      
      this.accept = function(line){
        if(rgx.exec(line)){
          return false;
        }
        return true;
      };
      
      this.consume = function(line){
        if(!this.accept(line)){
          this.next = new next(this, line);
          return this.next;
        }
        this.lines.push(line);
        return this;
      };
      
    };

    var DOC = function(prev, line){
      STATE.call(this, prev, line, (/^\s*\*\/\s*$/), SRC);
      this.type = "DOC";
      
      this.render = function(){
        var lines = this.lines;
        if(lines.join("").match(/^\s*$/)){return "";}
        if(lines.length === 0){return "";}
        var indent = this.indent;
        var result = "";
        var idx, line;
        for (idx in lines){
          line = lines[idx];
          result += line.replace(new RegExp("^" + indent), "") + "\n";
        }//*/
        return result;
      };
    };

    var SRC = function(prev, line){
      STATE.call(this, prev, line, (/^\s*\/\*orgdoc\s*$/), DOC);
      this.type = "SRC";

      this.render = function(){
        var lines = this.lines;
        if(lines.join("").match(/^\s*$/)){return "";}
        if(lines.length === 0){return "";}
        var indent = "  ";
        if(this.prev && this.prev.lines.length > 0){
          indent += /^\s*/.exec(this.prev.lines[this.prev.lines.length - 1]);
        }
        var result = indent + "#+BEGIN_SRC js\n";
        var idx, line;
        for (idx in lines){
          line = lines[idx];
          result += indent + line + "\n";
        }
        result += indent + "#+END_SRC\n";
        return result;
      };
    };

    var lines = data.split(/\n/g);
    var first = new SRC();
    var state = first;
    var idx, line;
    for(idx in lines){
      line = lines[idx];
      state = state.consume(line);
    }
    state = first;
    while(state){
      out += state.render();
      state = state.next;
    }
    out += "\n";
    readFile();
  }

  function writeFile(){
    var readme = out.replace(/\s+#\+BEGIN_SRC js[\S\s]*?#\+END_SRC\s+/mg, "\n\n");
    fs.writeFile(readmename, readme, function(){
      log("DOC Wrote " + readmename);
      release("readme");
    });
    fs.writeFile(filename, out, function(){
      log("DOC Wrote " + filename);
      release("doc");
    });
  }
}


if(watchFiles){
  log("Start listening...");
  var idx;
  for (idx in srcFiles) {
    watch(srcFiles[idx]);
  }
}

buildAll();