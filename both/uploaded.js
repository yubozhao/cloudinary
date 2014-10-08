uploaded = new Mongo.Collection('uploaded');

uploaded.allow({
  insert: function(userId, doc) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  },
  update: function(userId, doc, fields, modifier) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  },
  remove: function(userId, doc) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  }
});

uploaded.add = function(imageObj, callback) {
  var uId = Meteor.userId();
  if (!uId) {
    return callback(new Meteor.Error(401, "Access Denied",
      "You must be logged in to do that."));
  }

  if (imageObj.name) {
    check(imageObj.name, String);
  }

  if (imageObj.status) {
    check(imageObj.status, Number);
  } else {
    imageObj.status = this.status.uploading;
  }

  if (imageObj.publicId) {
    check(imageObj.publicId, String);

    if (this.find({
      publicId: imageObj.publicId
    }).count() > 0) {
      return; // return if the image already exists
    }
  }

  imageObj.createdAt = new Date();
  imageObj.ownerId = uId;

  this.insert(imageObj, callback);
};

// when the image is linked it is referenced by another object so the pending reference can be safely removed
uploaded.markLinked = function(id, callback) {
  this.remove({
    _id: id
  }, callback);
};


// marks the image as delete. Deleted on server side and in cloudinary.
uploaded.markDeleted = function(id, callback) {
  this.update({
      _id: id
    }, {
      $set: {
        status: this.status.deleted
      }
    },
    callback);
};

uploaded.status = {
  deleted: 0,
  active: 1,
  uploading: 2
};

if (Meteor.isClient) {
  uploaded.after.insert(function(userId, doc) {
    _cloudinary.remove({
      publicId: doc.publicId
    }, function(err, result) {
      if (err) {
        App.logger.error("Error removing temporary entry from _cloudinary. + " + err.message);
      }
    });
  })
}

/****** Begin Server only code  **************/
if (Meteor.isServer) {

  Meteor.methods({
    markUploadDeletedByPublicId: function(publicId, callback) {
      if (_.isString(publicId)) {
        var upload = uploaded.findOne({
          publicId: publicId
        });

        if (upload) {
          uploaded.markDeleted(upload._id, callback);
        } else {
          if (callback) {
            callback("Could not find " + publicId + " in uploaded");
          }
        }

      }
    },
    markUploadLinkedByPublicId: function(publicId, callback) {
      if (_.isString(publicId)) {
        var upload = uploaded.findOne({
          publicId: publicId
        });
        if (upload) {
          uploaded.markLinked(upload._id, callback);
        } else {
          if (callback) {
            callback("Could not find " + publicId + " in uploaded");
          }

        }

      }
    },
    deleteAllMarkedFiles: function() {
      var uId = Meteor.userId();
      if (uId) {
        var marked = uploaded.find({
          ownerId: uId,
          status: uploaded.status.deleted
        }, {
          fields: {
            publicId: 1
          }
        });
        marked.forEach(function(markedFile) {
          Meteor.call("cloudinary_delete", doc.publicId, function(err) {
            // if there was an error log it.
            if (err) {

              throw new Meteor.Error(419,
                "Error deleting cloudinary image. " +
                err.reason);
            }
            // otherwise remove the image
            uploaded.remove(doc._id);

          });
        });
      }

    }
  });

  var hookHandles = [];

  var initCollectionHooks = function() {
    //once the seed process is complete or no seeding takes place add the listener

    hookHandles.push(

      uploaded.after.update(function(userId, doc, fieldNames,
        modifier, options) {

        // check if the pending image was marked as deleted. If so delete from cloudinary
        if (fieldNames.indexOf('status') > -1 && doc.status === uploaded.status.deleted) {

          console.log('calling cloudinary_delete with ' + doc.publicId);
          Meteor.call("cloudinary_delete", doc.publicId, function(err) {
            // if there was an error log it.
            if (err) {

              throw new Meteor.Error(419,
                "Error deleting cloudinary image. " +
                err.reason);
            }
            // otherwise remove the image
            uploaded.remove(doc._id);

          });
        }
      })
    );

  };

  var disableCollectionHooks = function() {

    for (var i = hookHandles.length - 1; i >= 0; i--) {

      var hookHandle = hookHandles.pop();
      hookHandle.remove();
    }
  };

  // start with hooks enabled
  initCollectionHooks();


  Meteor.publish('uploaded', function() {
    return uploaded.find({
      ownerId: this.userId
    });
  });

}
/****** End Server only code  **************/