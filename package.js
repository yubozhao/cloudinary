Package.describe({
	name:"bozhao:cloudinary",
	summary: "Upload files to Cloudinary",
	version:"3.0.6",
	git:"https://github.com/yubozhao/cloudinary"
});

Npm.depends({
  cloudinary: "1.2.4"
});


var fileExports = function (api) {
  api.versionsFrom('METEOR@0.9.2');
  
  api.addFiles("lib/canvas-to-blob.min.js", "client");
  api.addFiles("lib/jquery.cloudinary.js", "client");
  api.addFiles("lib/jquery.fileupload-image.js", "client");
  api.addFiles("lib/jquery.fileupload-process.js", "client");
  api.addFiles("lib/jquery.fileupload-validate.js", "client");
  api.addFiles("lib/jquery.fileupload.js", "client");
  api.addFiles("lib/jquery.iframe-transport.js", "client");
  api.addFiles("lib/jquery.ui.widget.js", "client");
  api.addFiles("lib/load-image.min.js", "client");



  //Allow user access to Cloudinary server-side
  api.export("Cloudinary", 'server');
};

Package.onUse(fileExports);
