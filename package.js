Package.describe({
	name: "cramhead:cloudinary",
	summary: "Upload files to Cloudinary. Extend lepozepo's package with client side upload. Active development",
	version: "0.9.3",
	git: "https://github.com/cramhead/cloudinary"
});

Npm.depends({
	cloudinary: "1.0.11",
	"stream-buffers": "1.0.0"
});


var fileExports = function(api) {
	api.versionsFrom('METEOR@0.9.2');

	api.use('mongo', ['client', 'server']);
	//Need service-configuration to use Meteor.method
	api.use(["underscore@1.0.0", "ejson@1.0.0", "service-configuration@1.0.0", "lepozepo:streams@0.2.0",
		'jparker:crypto-md5@0.1.1'
	], ["client", "server"]);

	api.use(["matb33:collection-hooks@0.7.7"], ["client", "server"], {
		weak: true
	});

	api.use(["ui@1.0.0", "templating@1.0.0", "spacebars@1.0.0"], "client");

	//Image manipulation
	api.addFiles("lib/jquery.iframe-transport.js", "client");
	api.addFiles("lib/jquery.ui.widget.js", "client");
	api.addFiles("lib/jquery.fileupload.js", "client");
	api.addFiles("lib/jquery.cloudinary.js", "client");

	api.addFiles("client/blocks.html", "client");
	api.addFiles("client/helpers.js", "client");
	api.addFiles("client/controllers.js", "client");
	api.addFiles("client/collections.js", "client");
	api.addFiles("client/functions.js", "client");
	api.addFiles("server.js", "server");

	api.addFiles("both/uploaded.js", ["client", "server"]);

	//Allow user access to Cloudinary server-side
	api.export("Cloudinary", 'server');
	api.export("_cloudinary", "client");
	api.export("C", "client");
	api.export("uploaded", ["client", "server"]);
};

Package.onUse(fileExports);

Package.onTest(function(api) {
	api.use('tinytest');
	fileExports(api);

	api.use('cramhead:cloudinary');
	api.addFiles('tests/test.js');
});
