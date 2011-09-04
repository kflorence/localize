
// Load the localize library, which depends on the require library
require(["require", "../../../lib/localize"], function() {

  // Initialize the localize library, passing in a function to be
  // executed once all required resources have loaded
  localize(function() {

    // When the DOM is ready, we can translate
    require.ready(function() {
      localize( document.documentElement );
    });
  });
});
