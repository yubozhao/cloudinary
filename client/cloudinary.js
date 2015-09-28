Cloudinary = {
  upload: function (files, ops, cb, inProgressCb, overrideOps) {
    ops = ops || {};
    if (!cb || typeof cb !== 'function') {
      throw new Error('callback is missing');
    }
    _.each(files, function (file) {
      var reader = new FileReader;
      reader.onload = function (e) {
        Cloudinary._upload(reader.result, ops, cb, inProgressCb, overrideOps);
      };
      reader.readAsDataURL(file);
    });
  },
  _upload: function (file, ops, cb, inProgressCb, overrideOps) {
    ops = ops || {};
    Meteor.call('_cloudinary/sign', ops, function (err, res) {
      if (!err) {
        var formData = new FormData();

        formData.append('api_key', res.hidden_fields.api_key);
        formData.append('signature', res.hidden_fields.signature);
        formData.append('timestamp', res.hidden_fields.timestamp);
        formData.append('file', file);
        _.each(ops, function (val, key) {
          formData.append(key, val);
        });

        var xhr = new XMLHttpRequest();

        //events we need let this event bubble up.  going to let application handle this via callback
        xhr.upload.addEventListener('progress', function (event) {
          //throw out percentages.
          var progress = (event.loaded / event.total).toFixed(2);
          if (inProgressCb) {
            inProgressCb(progress);
          }
        });

        xhr.addEventListener('load', function (event) {
          var response = JSON.parse(this.response);
          if (xhr.status < 400) {
            cb(null, response);
          } else {
            cb(response, null);
          }
        });
        xhr.addEventListener('error', function () {
          var response = JSON.parse(this.response);
          cb(response, null);
        });
        xhr.addEventListener('abort', function () {
          //var response = JSON.parase(this.response);
        });

        var action = res.form_attrs.action;
        if (overrideOps && overrideOps.action) {
          action = overrideOps.action;
        }
        xhr.open('POST', action, true);
        xhr.send(formData);
      } else {
        cb(err, null);
      }
    });
  }
};
