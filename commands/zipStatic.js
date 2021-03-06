const forceUtils = require('../lib/forceUtils.js');
const {
  exec
} = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const parseXML = require('xml2js').parseString;
const archiver = require('archiver');


(function () {
  'use strict';

  module.exports = {
    topic: 'static',
    command: 'zip',
    description: 'zip static resources',
    help: 'zips static resource(s) of type application/zip from local source folder to their original location in the tree',
    run(context) {
      var topLevelAbsolute, config;
      const unzippedLocation = 'resource-bundles';


      const target = context.flags.name;
      const outputdir = context.flags.outputdir;

      var walkSync = function(dir, filelist) {
        var fs = fs || require('fs'),
            files = fs.readdirSync(dir);
        filelist = filelist || [];
        files.forEach(function(file) {
          if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
          }
          else {
            if (file.includes(".resource") && !file.includes(".resource-meta.xml")){
              //see if the file is zipped type?
              var fullpath = dir  + file;
              var meta = fs.readFileSync(fullpath + "-meta.xml", 'utf8');
              //console.log(parseString(meta));
              //console.log(fullpath);
              //console.log(meta);
              parseXML(meta, function(err, result){
                if (err){
                  //console.log(err)
                } else {
                  //console.log(result.StaticResource.contentType[0]);
                  if (result.StaticResource.contentType){
                    //console.log(result.StaticResource.contentType);
                    if (result.StaticResource.contentType[0]==='application/zip'){
                      //console.log(fullpath);
                      filelist.push(fullpath);
                    } else {
                      //console.log("not a zipped file!")
                    }
                  }
                }
              })
            }
          }
        });
        return filelist;
      };

      while (!topLevelAbsolute){
        console.log('Starting directory: ' + process.cwd());
        if (fs.existsSync('sfdx-project.json')){
          //console.log("found config file!");
          topLevelAbsolute = process.cwd();
          var config = JSON.parse(fs.readFileSync('sfdx-project.json', 'utf8'));
          //console.log(config);

          //create the folder.  Rename it up higher if you don't like resource-bundles
          if (!fs.existsSync(unzippedLocation)){
            //fs.mkdirSync(unzippedLocation);
            console.log("resource-bundles folder was not found");
            process.exit(1);
          }

          //find some static resources
          var allFiles = walkSync(topLevelAbsolute+'/');

          //console.log(allFiles);
          //for each of the static resource files
          for (var i=0; i<allFiles.length; i++){
            //create the path from its resource-bundle
            var resourceDir = unzippedLocation + '/' + allFiles[i].replace(topLevelAbsolute+'/', '').replace(".resource", '');
            console.log("will compress:");

            var output = fs.createWriteStream(allFiles[i]);
            var archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            archive.pipe(output);
            archive.directory(resourceDir, false);
          }
          archive.finalize();


        } else {
          console.log("no config file. going up a directory");
          process.chdir('..');
        }
      }
    }
  };
}());

