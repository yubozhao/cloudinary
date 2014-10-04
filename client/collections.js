_cloudinary = new Mongo.Collection(null);
_cloudinary_stream = new Meteor.Stream("c_stream");

_cloudinary_stream.on("upload", function (data, options) {
  _cloudinary.update(options.db_id, data);
});


var hookHandles = [];

var initCollectionHooks = function () {
  //once the seed process is complete or no seeding takes place add the listener
  //
  hookHandles.push(
    _cloudinary.after.update(function (userId, doc, fieldNames, modifier, options) {

      if (fieldNames.indexOf("publicId") > -1) {
        console.log("Adding uploaded " + doc.publicId);
        // create a new pending image
        var newUpload = {
          status: uploaded.status.active,
          publicId: doc.publicId,
          name: doc.file_name
        };

        // nab the meta info if it's there
        if (doc.meta) {
          newUpload.meta = doc.meta;
        }

        // add it
        uploaded.add(newUpload, function (err, result) {
          if (err) {
            throw new Meteor.Error(419,
              "Error adding cloudinary image to uploaded. " + err
                .message);
          }
        });

      }
    }));

};

var disableCollectionHooks = function () {

  for (var i = hookHandles.length - 1; i >= 0; i--) {
    var hookHandle = hookHandles.pop();
    hookHandle.remove();
  }
};

// start with hooks enabled
initCollectionHooks();
