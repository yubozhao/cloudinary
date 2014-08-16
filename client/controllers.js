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

// For some reason the standard change binding does not work
// Template.c_clientside_upload.events({
//   'change input[type=file]': function (evt, helper) {
//     console.log('event change ');
//   }
// });

Template.c_clientside_upload.rendered = function () {
  var input = this.$('[type=file]');

  // Bind the change handler for the file input.
  //For some reason the
  input.bind('change', function (evt) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var files = evt.target.files;

      var file;
      for (var i = 0; file = files[i]; i++) {

        // // if the file is not an image, continue
        if (!file.type.match('image.*')) {
          continue;
        }

        var reader = new FileReader();

        // immediate function to capture the filename and avoid race condition
        reader.onload = (function (fileRead) {
          var fileName = fileRead.name; // get the name of file to use as annotation

          return function () {
            var pendingFile = {
              file_name: fileName,
              created_at: new Date(),
              uploading: true,
              base64data: this.result
            };
            //console.log("insert with " + EJSON.stringify(pendingFile));
            _cloudinary.insert(pendingFile, function (err, insertedId) {
              if (err) {
                throw new Meteor.Error(417,
                  "Error saving on reader.onload to _cloudinary", err.reason
                );
              }
            });
          };

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

      var fileName = data.files[0].name; // get the name of the file
      var result = data.result; // get the result from cloudinary

      // get the record have a copy of base64data encoded image
      var record = _cloudinary.findOne({
        file_name: fileName
      });

      if (!record) {
        console.log('did not find ' + fileName);
        throw new Meteor.Error(417,
          "Error in cloudinarydone handler. Did not find " + fileName);
      }

      // extend result to include some other properties
      _.extend(result, {
        file_name: fileName,
        total_uploaded: result.bytes,
        percent_uploaded: 100,
        uploading: false
      });

      // don't overwrite the base64data
      if (record.base64data) {
        result.base64data = record.base64data
      }

      // update the record with the result
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

    }).bind('cloudinaryprogress', function (e, data) {

    var fileName = data.files[0].name;
    // console.log(fileName + " data loaded is : " + data.loaded +
    //   " data size: " + data.total);

    // update the record with progress information
    _cloudinary.update({
      file_name: fileName
    }, {
      $set: {
        progress: data.progress()
      },
      {
        multi: true
      }
    });

  }).bind('cloudinaryfail', function (e, data) {
    console.log("Error uploading file. " + e.message);
    throw new Meteor.Error(417, "Cloudinary error uploading file. " + e.message);
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
