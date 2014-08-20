uploaded = new Meteor.Collection('uploaded');

uploaded.allow({
  insert: function (userId, doc) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  },
  update: function (userId, doc, fields, modifier) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  },
  remove: function (userId, doc) {
    if (userId === doc.ownerId) {
      return true;
    }
    return false;
  }
});

uploaded.add = function (imageObj, callback) {
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
    imageObj.status = status.uploading;
  }

  if (imageObj.publicId) {
    check(imageObj.publicId, String);

    if (uploaded.find({
      publicId: imageObj.publicId
    }).count() > 0) {
      return; // return if the image already exists
    }
  }

  imageObj.createdAt = new Date();
  imageObj.ownerId = uId;

  uploaded.insert(imageObj, callback);
};

// when the image is linked it is referenced by another object so the pending reference can be safely removed
uploaded.markLinked = function (id, callback) {
  uploaded.remove({
    _id: id
  }, callback);
};

// marks the image as delete. Deleted on server side and in cloudinary.
uploaded.markDeleted = function (id, callback) {
  this.update({
      _id: id
    }, {
      $set: {
        status: status.deleted
      }
    },
    callback);
};

// /**
//  * Marks all records as deleted. They are subsequently deleted from cloudinary
//  * @param {Array}   ids      An array of _id
//  * @param {Function} callback A callback with error and result
//  */
// uploaded.deleteAll = function (ids, callback) {
//   if (_.isArray(ids)) {
//     for (var i = 0, len = ids.length; i < len; i++) {
//       uploaded.delete({
//         _id: ids[i]
//       }, callback);
//     }
//   }
// };
//
// /**
//  * Remove by the specified predicate
//  * @param {Object} predicate A predicate object
//  */
// uploaded.deleteByPredicate = function (predicate, callback) {
//   // get all with role
//   var imageIds = uploaded.find(predicate, callback).fetch();
//
//   // get ids
//   imageIds = _.pluck(imageIds, "_id");
//
//   // remove all
//   this.deleteAll(imageIds);
// };
//
//
// /**
//  * Marks all records as determined by their public_id field as being deleted.  They are subsequently deleted from cloudinary.
//  * @param {Array}   publicIds An array of public_id
//  * @param {Function} callback A callback with error and result
//  */
// uploaded.deleteByPublicIds = function (publicIds, callback) {
//   if (_.isArray(publicIds)) {
//     var imageIds = uploaded.find({
//       publicId: {
//         $in: publicIds
//       }
//     }).fetch()
//
//     // get the ids
//     imageIds = _.pluck(imageIds, "_id");
//     // remove them all
//     this.deleteAll(imageIds);
//   }
// };


uploaded.roles = {
  collectible: 1,
  discussion: 2,
  profile: 3
};

uploaded.status = {
  deleted: 0,
  active: 1,
  uploading: 2
};

/****** Begin Server only code  **************/
if (Meteor.isServer) {
  var hookHandles = [];

  var initCollectionHooks = function () {
    //once the seed process is complete or no seeding takes place add the listener

    hookHandles.push(
      uploaded.after.update(function (userId, doc, fieldNames,
        modifier, options) {
        // check if the pending image was marked as deleted. If so delete from cloudinary
        if (fieldNames.indexOf('status') > -1 && doc.status ===
          uploaded.status.deleted) {

          Meteor.call("cloudinary_delete", doc.publicId, function (err,
            result) {
            // if there was an error log it.
            if (err) {

              throw new Meteor.Error(419,
                "Error deleting cloudinary image. " +
                err.reason);
              //	return;
            }
            // otherwise remove the image
            uploaded.remove(doc._id);

          });
        }
      }));

  };

  var disableCollectionHooks = function () {

    for (var i = hookHandles.length - 1; i >= 0; i--) {

      var hookHandle = hookHandles.pop();
      hookHandle.remove();
    };
  };

  // start with hooks enabled
  initCollectionHooks();


  Meteor.publish('uploaded', function () {
    return uploaded.find({
      ownerId: this.userId
    });
  });

}
/****** End Server only code  **************/
