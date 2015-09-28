Package.describe({
  name:"bozhao:cloudinary",
  summary: "Upload files to Cloudinary",
  version:"4.0.5",
  git:"https://github.com/yubozhao/cloudinary"
});

Npm.depends({
  cloudinary: "1.2.4"
});

Package.on_use(function (api){
  api.versionsFrom('METEOR@1.0');

  // Core Packages
  api.use(["underscore"], ["client", "server"]);
  api.use(["templating"], "client");

  // Cloudinary Client Side
  api.add_files("lib/jquery.cloudinary.js","client");

  // Core Files
  api.add_files("server/signature.js", "server");
  api.add_files("client/cloudinary.js", "client");

  api.export && api.export("Cloudinary",["server","client"]);
});
