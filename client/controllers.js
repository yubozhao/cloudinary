Template.c_upload.events({
  'change input[type=file]': function (e, helper) {
    var options = {context: this};
    var files = e.currentTarget.files;
    if (helper.data && _.has(helper.data, "callback")) {
      options.callback = helper.data.callback;
    }
		if(helper.data && _.has(helper.data,"public_id")){
			options.public_id = helper.data.public_id;
		}
    _.each(files, function (file) {
      var reader = new FileReader;
      reader.onload = function () {
        options.db_id = _cloudinary.insert({});
        Meteor.call("cloudinary_upload", reader.result, options, function (err, res) {
          if (err) {
            _cloudinary.remove(options.db_id);
            console.log(err);
          }
        });
      };
      reader.readAsDataURL(file);
    });
  }
});

Template.c_upload_stream.events({
  'change input[type=file]': function (e, helper) {
    var options = {context: this};
    var files = e.currentTarget.files;
    if (helper.data && _.has(helper.data, "callback")) {
      options.callback = helper.data.callback;
    }
		if(helper.data && _.has(helper.data,"public_id")){
			options.public_id = helper.data.public_id;
		}
    _.each(files, function (file) {
      var reader = new FileReader;
      reader.onload = function () {
        var file_data = new Uint8Array(reader.result);
        options.db_id = _cloudinary.insert({});
        Meteor.call("cloudinary_upload_stream", file_data, options, function (err, res) {
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
  var meta = getMeta(input);
  // Bind the change handler for the file input.
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
              previewData: this.result
            };
            if (!$.isEmptyObject(meta)) {
              pendingFile.meta = meta;
            }
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
  input.unsigned_cloudinary_upload(preset, cloudinaryUploadParams).bind('cloudinarydone', function (e, data) {
    var fileName = data.files[0].name; // get the name of the file
    var result = data.result; // get the result from cloudinary

    // get the record have a copy of previewData encoded image
    var record = _cloudinary.findOne({
      file_name: fileName
    });

    if (!record) {
      console.log('did not find ' + fileName);
      throw new Meteor.Error(417, "Error in cloudinarydone handler. Did not find " + fileName);
    }

    var existingData = {
      file_name: fileName,
      total_uploaded: result.bytes,
      percent_uploaded: 100,
      uploading: false,
      publicId: result.public_id
    }

    // don't overwrite the meta data
    if (record.meta) {
      existingData.meta = record.meta;
    }
    // don't overwrite the previewData
    if (record.previewData) {
      existingData.previewData = record.previewData
    }

    // extend result to include some other properties
    _.extend(result, existingData);

    if ($.cloudinary.config().debug) {
      console.log('upload done' + data.result.public_id);
    }

    delete data.result.public_id;

    // update the record with the result
    _cloudinary.update({
      file_name: fileName,
    }, result);

    if (record.callback) {
      Meteor.call(record.callback, result);
    }
  }).bind('fileuploadprogress', function (e, data) {
    var fileName = data.files[0].name;
    if ($.cloudinary.config().debug) {
      console.log(fileName + " data loaded is : " + data.loaded +
      " data size: " + data.total);
    }

    // update the record with progress information
    _cloudinary.update({
      file_name: fileName
    }, {
      $set: {
        progress: data.progress()
      }
    }, {
      multi: true
    });
  }).bind('cloudinaryfail', function (e, data) {
    if ($.cloudinary.config().debug) {
      console.log("Error uploading file. " + e.message);
    }
    throw new Meteor.Error(417, "Cloudinary error uploading file. " + e.message);
  }).bind('cloudinarystart', function (e) {
    if ($.cloudinary.config().debug) {
      console.log('starting')
    }
  }).bind('cloudinarystop', function (e, data) {
    if ($.cloudinary.config().debug) {
      console.log('stopping');
    }
  });
};

Template.c_clientside_upload.destroyed = function () {
  var input = this.$('[type=file]');
  input.unbind("cloudinarystop");
  input.unbind('cloudinarystart');
  input.unbind('cloudinaryprogress');
  input.unbind('cloudinarydone');
};

/* Expects a string "role:collector,userId:1234,...", return and object {role:'collector',userId:'1234'}
 */
var getMeta = function ($input) {
  var meta = {};
  var metaField = $input.data('meta');
  if (metaField && metaField.length > 0) {
    var keyValues = metaField.split(',');
    _.map(keyValues, function (keyValue) {
      var pair = keyValue.split(":");
      meta[pair[0]] = pair[1];
    });
  }
  return meta;
};

var getPreset = function ($input) {
  var preset = $input.data("preset");
  if (preset) {
    return preset;
  }
};

var getCloudinaryOptions = function ($input) {
  var options = {};
  var context = {}; // $input.data("context")|| {};
  var tags = $input.data("tags");
  var publicId = $input.data('publicId');
  if (tags) {
    options.tags = tags;
  }
  if ($.cloudinary.config().debug) {
    context = {alt: 'debug'};
  }
  if (context) {
    options.context = context;
  }
  if (publicId) {
    options.public_id = publicId;
  }
  return options;
};
