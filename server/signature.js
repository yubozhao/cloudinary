Future = Npm.require("fibers/future");
Cloudinary = Npm.require("cloudinary");

Meteor.methods({
  '_cloudinary/sign': function (ops) {
    check(ops, Match.OneOf(Object, null, undefined));
    ops = ops || {};
    var signature = Cloudinary.uploader.direct_upload("", ops);
    return signature;
  }
});
