// Load the localize library, which depends on the require library
require(["require", "../../../lib/localize"], function() {

  // When all resources have loaded, and the DOM is ready...
  localize(function() {

    // Localize the root (html) element
    localize( document.documentElement );
  });
});
