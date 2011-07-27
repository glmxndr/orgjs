#! /usr/bin/env node

var fs  = require('fs'),
    sys = require('sys');

var srcFiles = [
  './src/org.main.js',
  './src/org.config.js',
  './src/org.regexps.js',
  './src/org.utils.js',
  './src/org.markup.js',
  './src/org.content.js',
  './src/org.outline.js',
  './src/org.render.js',
  './src/org.api.js'
];

var isBuildingSrc = false;
var isBuildingDoc = false;
var isBuilding = function(){return isBuildingSrc || isBuildingDoc;};
var release = function(type){
  if(type === "doc"){isBuildingDoc = false;}
  if(type === "src"){isBuildingSrc = false;}
  if(!isBuilding()){
    log("Done building all.");
  }
};

var noop = function(){};
function date(){return new Date().toTimeString();}
function log(str){sys.puts(date() + ' # ' + str);}


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
    log("Start building all...")
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
    if(file){
      fs.readFile(file, concat);
    } else {
      writeFile();
      return;
    }
  }
  function concat(err, data){
    data = "" + data;
    data = data.replace(/ *\/\*orgdoc\++\/ */ig, "/***orgdoc***");
    data = data.replace(/ *\/-+orgdoc\*\/ */ig, "*/");
    out += data.replace(/\n *#\+(BEGIN|END)_SRC( +js)?.*?\n/ig, "\n");
    readFile();
  }
  function writeFile(){
    // Remove opening comments right after closing them
    out = out.replace(/[\s\n]*\*\/[\s\n]*\/\*{3}orgdoc\*{3}/gi, "");
    // Remove empty comments
    out = out.replace(/[\s\n]*\/\*{3}orgdoc\*{3}[\s\n]*\*\//gi, "");
    fs.writeFile(filename, out, function(){
      log("SRC Wrote " + filename);
      release("src");
    });
  }
}

function buildDoc(){
  var out = "", fileContent;
  var filename = 'doc/org-js.org';
  var files = srcFiles.slice(0);

  readFile();
  
  function readFile(){
    var file = files.shift();
    if(file){
      fs.readFile(file, concat);
    } else {
      writeFile();
      return;
    }
  }
  function concat(err, data){
    data = "" + data;
    data = data.replace(/\s*\/\*orgdoc\++\/[\s\n]*/g, "\n");
    data = data.replace(/\s*\/-+orgdoc\*\/[\s\n]*/g, "\n");
    data = data.replace(/^\n+/, "");
    out += data + "\n\n";
    readFile();
  }
  function writeFile(){
    fs.writeFile(filename, out, function(){
      log("DOC Wrote " + filename);
      release("doc");
    });
  }
}


if(watchFiles){
  log("Start listening...");
  for(idx in srcFiles){
    watch(srcFiles[idx]);
  }
}

buildAll();