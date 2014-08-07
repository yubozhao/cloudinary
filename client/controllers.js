Template.c_upload.events({
  'change input[type=file]': function (e, helper) {
    var options = {
      context: this
    };

    if (helper.data && _.has(helper.data, "callback")) {
      options.callback = helper.data.callback;
    } else {
      console.log(
        "Cloudinary Error: Helper Block needs a callback function to run");
      return
    }

    var files = e.currentTarget.files;

    _.each(files, function (file) {
      var reader = new FileReader;

      reader.onload = (function (fileRead) {
        var fileName = fileRead.name;
        var pendingFile = {
          file_name: fileName,
          created_at: new Date()
        };
        options.db_id = _cloudinary.insert(pendingFile);
        Meteor.call("cloudinary_upload", reader.result, options, function (
          err, res) {
          if (err) {
            _cloudinary.remove(options.db_id);
            console.log(err);
          }
        });
      }(file));

      reader.readAsDataURL(file);
    });
  }
});

Template.c_upload_stream.events({
  'change input[type=file]': function (e, helper) {

    var options = {
      context: this
    };

    if (helper.data && _.has(helper.data, "callback")) {
      options.callback = helper.data.callback;
    } else {
      console.log(
        "Cloudinary Error: Helper Block needs a callback function to run");
      return
    }
    //buildImagePreview(e, this, options)

    var files = e.currentTarget.files;

    _.each(files, function (file) {
      var reader = new FileReader();
      var fileName = file.name;

      reader.onload = function (e) {
        var file_data = new Uint8Array(reader.result);
        var pendingFile = {
          file_name: fileName,
          created_at: new Date()
        };
        options.db_id = _cloudinary.insert(pendingFile);
        Meteor.call("cloudinary_upload_stream", file_data, options,
          function (err, res) {
            if (err) {
              _cloudinary.remove(options.db_id);
              console.log(err);
            }
          });
      };


      reader.readAsArrayBuffer(file);

    });
  }
});


/******** Client side ***********/

Template.c_clientside_upload.helpers({
  preview: function () {
    if (this.previewClass) {
      return true;
    } else {
      return false;
    }

  }
});

Template.c_clientside_upload.events({
  'change input[type=file]': function (evt, helper) {
    console.log('event change ');
  }
});

Template.c_clientside_upload.rendered = function () {
  var input = this.$('[type=file]');

  // // Bind the change handler for the file inout
  input.bind('change', function (evt) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var files = evt.target.files;

      var file;
      for (var i = 0; file = files[i]; i++) {
        console.log('render change ' + file.name);
        // // if the file is not an image, continue
        if (!file.type.match('image.*')) {
          continue;
        }

        var reader = new FileReader();

        reader.onload = (function (fileRead) {
          var fileName = fileRead.name; // get the name of file to use as annotation
          return function () {
            var pendingFile = {
              file_name: fileName,
              created_at: new Date(),
              uploading: true,
              base64data: this.result
            };
            console.log("insert with " + EJSON.stringify(pendingFile));
            var db_id = _cloudinary.insert(pendingFile, function (err) {
              if (err) {
                App.logger.error(
                  "Error saving on reader.onload to _cloudinary",
                  err.reason);
              }
            });
          };

          // return function (evt) {
          //   var base64 = this.result;
          //   _cloudinary.update({file_name: fileName}, {$set: {base64data: base64}}, function (err) {
          //     if (err) {
          //       App.logger.error(
          //         "Error saving base64 data in _cloudinary",
          //         err.reason);
          //     }else{
          //       console.log("saved basedata for " + fileName + ": " + base64);
          //     }
          //   });
          //
          // };

        }(file));

        reader.readAsDataURL(file);
      }
    } else {
      alert('The File APIs are not fully supported in this browser.');
    }
  });

  var preset = getPreset(input);
  var cloudinaryUploadParams = getCloudinaryOptions(input);
  // Set up an unsigned upload
  input.unsigned_cloudinary_upload(preset, cloudinaryUploadParams).bind(
    'cloudinarydone', function (e, data) {

      var fileName = data.files[0].name;
      var publicId = data.result.public_id;
      console.log('done with file ' + fileName + " publicId " + publicId);

      // var numFiles = data.files.length;
      // for (var i = 0; i < numFiles; i++) {

      var result = data.result;
      console.log('searching for ' + fileName)
      var record = _cloudinary.findOne({
        file_name: fileName
      });

      if (!record) {
        console.log('did not find ' + fileName);
      }

      _.extend(result, {
        file_name: fileName,
        total_uploaded: result.bytes,
        percent_uploaded: 100,
        uploading: false
      });
      if (record.base64data) {
        result.base64data = record.base64data
      }

      // get the name of the image

      _cloudinary.update({
        file_name: fileName,
      }, result);

      if (record.callback) {
        Meteor.call(record.callback, result);
      }

      // var imageTransforms = {
      //   format: 'jpg',
      //   width: 150,
      //   height: 100,
      //   crop: 'thumb',
      //   gravity: 'face',
      //   effect: 'saturation:50'
      // };

      //  augmentPreview(fileName, publicId);
      // }

    }).bind('cloudinaryprogress', function (e, data) {

    var fileName = data.files[0].name;
    console.log(fileName + " data loaded is : " + data.loaded +
      " data size: " + data.total);
    _cloudinary.update({
      file_name: fileName
    }, {
      $set: {
        progress: data.progress()
      }
    });

    $('div.progress[data-progress="' + fileName + '"]').css('width',
      Math.round((data.loaded * 100.0) / data.total) + '%');
  });
};

var getPreset = function ($input) {
  var preset = $input.data("preset");
  if (preset) {
    return preset;
  }
};

var getCloudinaryOptions = function ($input) {
  var options = {};

  var tags = $input.data("tags");
  if (tags) {
    options.tags = tags;
  }

  // var context = $input.data("context");
  // if(context){
  // 	options.context = context;
  // }

  var publicId = $input.data('publicId');
  if (publicId) {
    options.public_id = publicId;
  }

  // var folder = $input.data('folder');
  // if(folder){
  // 	options.folder = folder;
  // }
  return options;
};

// var augmentPreview = function (previewImageName, publicId, transforms) {
//   // if there are no transforms then just annotate, otherwise replace
//   if (typeof transforms === 'undefined') {
//     annotatePreview(previewImageName, publicId);
//   } else {
//     replacePreview(previewImageName, publicId, transforms);
//   }
// };
//
// var replacePreview = function (previewImageName, publicId, transforms) {
//   // create a cloudinaryImage
//   var cloudinaryImage = $.cloudinary.image(publicId, transforms);
//
//   //annotate it with the public_id
//   cloudinaryImage.attr("public_id", publicId);
//
//   // replace the preview with the cloudinary image
//   $("img[data-name='" + previewImageName + "']").replaceWith(
//     cloudinaryImage);
// };
//
// var annotatePreview = function (previewImageName, publicId) {
//   $("img[data-name='" + previewImageName + "']").attr("public_id", publicId);
// };
//
// function buildImagePreview(evt, tmpl, options) {
//   if (window.File && window.FileReader && window.FileList && window.Blob) {
//     var files = evt.target.files;
//     optons = options || {};
//
//     var file;
//     for (var i = 0; file = files[i]; i++) {
//       // if the file is not an image, continue
//       if (!file.type.match('image.*')) {
//         continue;
//       }
//
//       var reader = new FileReader();
//       reader.onload = (function (fileRead) {
//         var fileName = fileRead.name; // get the name of file to use as annotation
//         var pendingFile = {
//           file_name: fileName,
//           created_at: new Date(),
//           uploading: true
//         };
//         options.db_id = _cloudinary.insert(pendingFile);
//
//         return function (evt, options) {
//           var div = $('<div>');
//           // create a progress div
//           var progress = $('<div>');
//           progress.addClass("progress");
//           progress.attr('data-progress', fileName);
//
//           // append it to the container
//           div.append(progress);
//
//           _cloudinary.update({
//             file_name: fileName
//           }, {
//             $set: {
//               base64data: evt.target.result
//             }
//           }, function (err) {
//             if (err) {
//               App.logger.error("Error saving base64 data in _cloudinary",
//                 err.reason);
//             }
//           })
//           // add the preview image
//           div.append('<img style="width: 90px;" src="' + evt.target.result +
//             '" data-name=' + fileName + ' />');
//
//           // add it to the thumbs
//           $('.thumbnails').append(div);
//         };
//       }(file, options));
//
//       reader.readAsDataURL(file);
//     }
//   } else {
//     alert('The File APIs are not fully supported in this browser.');
//   }
// };
