/*
localize 0.0.1
Copyright (c) 2011, Kyle Florence
https://github.com/kflorence/localize

The contents of this file are released under the MIT license.
https://github.com/kflorence/localize/blob/master/license-mit
*/

(function( global, undefined ) {

// Core prototype function references
var slice = Array.prototype.slice,
    toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty,

    // ECMAScript 5 native function implementations
    nativeForEach = Array.prototype.forEach,
    nativeIndexOf = Array.prototype.indexOf,

    // Deferred onReady callback methods
    onReadyCallbacks = [],

    // Generic object/array iteration function (underscore.js)
    each = function( obj, iterator, context ) {
      if ( obj == null ) {
        return;
      }

      if ( nativeForEach && obj.forEach === nativeForEach ) {
        obj.forEach( iterator, context );

      } else if ( isArray( obj ) ) {
        for ( var i = 0, l = obj.length; i < l; i++ ) {
          if ( i in obj && iterator.call( context, obj[ i ], i, obj ) === false ) {
            return;
          }
        }

      } else {
        for ( var key in obj ) {
          if ( hasOwnProperty.call( obj, key ) ) {
            if ( iterator.call( context, obj[ key ], key, obj ) === false ) {
              return;
            }
          }
        }
      }
    },

    // Merge two or more objects together (jQuery/underscore.js)
    // This function is recursive on object literals (but not arrays)
    extend = function( target ) {
      var copy, prop, source;

      target = target || {};

      each( slice.call( arguments, 1 ), function( obj ) {
        for ( prop in obj ) {
          source = target[ prop ];
          copy = obj[ prop ];

          // Skip recursive objects
          if ( target === copy ) {
            continue;
          }

          // Recurse on object literals
          if ( isObjectLiteral( copy ) && isObjectLiteral( source ) ) {
            target[ prop ] = extend( source, copy );

          // Otherwise, overwrite target with copy (unless undefined)
          } else if ( copy !== undefined ) {
            target[ prop ] = copy;
          }
        }
      });

      return target;
    },

    // A map of JavaScript class names to types
    classTypes = (function() {
      var name, classTypes = {},
          classNames = [
            "Boolean", "Number", "String", "Function",
            "Array", "Date", "RegExp", "Object"
          ];

      each( classNames, function( name ) {
        classTypes[ "[object " + name + "]" ] = name.toLowerCase();
      });

      return classTypes;
    })(),

    // Determine the JavaScript class of an object (jQuery)
    type = function( obj ) {
      return obj == undefined ?
        String( obj ) : classTypes[ toString.call( obj ) ] || "object";
    },

    isArray = function( obj ) {
      return type( obj ) == "array";
    },

    // Crude DOM element detection
    isElement = function( obj ) {
      return obj && obj.nodeType == 1;
    },

    isFunction = function( obj ) {
      return type( obj ) == "function";
    },

    // Check for Object literals (objects created using "{}" or "new Object" (jQuery)
    isObjectLiteral = function( obj ) {

      // Weed out non-Objects, DOM nodes and window objects
      if ( !obj || type( obj ) != "object" || obj.nodeType || "setInverval" in obj ) {
        return false;
      }

      // Not own constructor property must Object
      if ( obj.constructor && !hasOwnProperty.call( obj, "constructor" ) &&
        !hasOwnProperty.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
        return false;
      }

      var key;

      // Own properties are enumerated firstly, so to speed up,
      // if last one is own, then all properties are own.
      for ( key in obj ) {}

      return key === undefined || hasOwnProperty.call( obj, key );
    },

    // Cross-browser implementation of indexOf
    indexOf = function( item, arr ) {
      if ( nativeIndexOf && arr.indexOf === nativeIndexOf ) {
        return arr.indexOf( item );
      }

      for ( var i = 0, l = arr.length; i < l; i++ ) {
        if ( arr[ i ] === item ) {
          return i;
        }
      }

      return -1;
    },

    // Convenience method to check if an item is in an array
    inArray = function( item, arr ) {
      return indexOf( item, arr ) > -1;
    },

    // Builds an absolute path out of several URI segments
    absolutePath = function() {
      var i = 0,
          l = arguments.length,
          path = "/";

      for ( ; i < l; i++ ) {
        path += arguments[ i ] + "/";
      }

      // Remove extraneous slashes
      return path.replace( /[\/]+/g, "/" );
    },

    // Same as absolute path but with the leading slash removed
    relativePath = function() {
      var path = absolutePath.call( global, slice.call( arguments, 0 ) );
      return path[ 0 ] == "/" ? path.substr( 1 ) : path;
    },

    // Builds the path to a resource file
    resourcePath = function( culture, path, resource ) {
      return localize.settings.path.dictionary +
        culture + ( path === undefined ? "" : path || "/" ) +
        ( resource === undefined ? "" : resource || localize.settings.resource.default ) +
        localize.settings.resource.extension;
    },

    // Convert HTML entities to their respective characters
    unescapeHtml = function( str ) {
      return str.replace( /&lt;/g,'<' ).replace( /&gt;/g,'>' ).replace( /&amp;/g,'&' );
    },

    // Modified version of 'parseUri' by Steven Levithan
    // See: http://blog.stevenlevithan.com/archives/parseuri
    parseUri = function( uri ) {
      var uriRegex = new RegExp(
          // Protocol
          "^(?:(?![^:@]+:[^:@/]*@)([^:/?#.]+):)?(?://)?" +
          // Authority
          "(" +
            // Credentials
            "(?:(" +
              // Username
              "([^:@]*)" +
              // Password
              "(?::([^:@]*))?" +
            ")?@)?" +
            // Host
            "([^:/?#]*)" +
            // Port
            "(?::(\\d*))?" +
          // Relative
          ")(" +
            // Path
            "(" +
              // Directory
              "(/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[?#]|$)))*/?)?" +
              // File
              "([^?#/]*)" +
            ")" +
            // Query
            "(?:\\?([^#]*))?" +
            // Anchor
            "(?:#(.*))?" +
          ")"
        ),

        // Parses key/value pairs from a query string
        queryKeysRegex = /(?:^|&)([^&=]*)=?([^&]*)/g,

        // Keys for the uri hash, mapped from the matches array
        properties = [
          "source", "protocol",
          "authority", "credentials",
          "username", "password",
          "host", "port",
          "relative", "path",
          "directory", "file",
          "extension", "query",
          "anchor"
        ],
        i = 0,
        l = properties.length,
        matches = uriRegex.exec( uri ),
        uri = {
          queryData: {}
        };

      for ( ; i < l; i++ ) {
        uri[ properties[ i ] ] = matches[ i ] || "";
      }

      uri.query.replace( queryKeysRegex, function( matched, key, value, offset, str ) {
        if ( key && key.length ) {
          uri.queryData[ key ] = value;
        }
      });

      return uri;
    },

    // Local copy, mostly a convenience method
    localize = function( target ) {
      var args = slice.call( arguments, 0 );

      // First call to this method is treated as initialization if not initialized
      if ( !localize.initialized ) {
        localize.init.apply( localize, args );

      // Otherwise, it's just an alias for another localize function
      } else {
        switch ( typeof target ) {
          case "object": {
            localize[ isElement( target ) ? "element" : "options" ].apply( localize, args );
          } break;
          case "function": {
            localize.ready.apply( localize, args );
          } break;
          case "string": {
            return localize.evaluate.apply( localize, args );
          }
        }
      }

      return localize;
    };

// Public properties
extend( localize, {
  culture: "",
  dictionary: {},
  initialized: false,
  isReady: false,
  queue: null,
  resources: [],
  settings: {
    cultures: [ "en" ],
    path: {
      root: "./",
      dictionary: "dictionary/"
    },
    resource: {
      extension: ".js",
      default: "index.html"
    },
    routes: {},
    template: {
      evaluate: /<%([\s\S]+?)%>/g,
      interpolate: /<%=([\s\S]+?)%>/g
    }
  },
  // FIXME for commonJS environments
  uri: parseUri( global.location.href ),
  version: "0.1.0"
});

// Public methods
extend( localize, {

  // Initialize the library
  init: function( options, callback ) {
    if ( localize.initialized ) {
      return;
    }

    if ( isFunction( options ) ) {
      callback = options;
      options = undefined;
    }

    localize.initialized = true;
    options = localize.options( options, true );

    var path = absolutePath( localize.uri.directory.replace( options.path.root, "" ) ),
        resource = localize.uri.file.toLowerCase(),

        // List of resources to load
        resources = [];

    // TODO -- add in routing here

    // Build the list of resources to load
    each( options.cultures, function( culture ) {
      resources.push( resourcePath( culture ) );
      resources.push( resourcePath( culture, path, resource ) );
    });

    // Load the resources
    require( resources, function() {
      localize.isReady = true;

      while( onReadyCallbacks[ 0 ] ) {
        localize.ready( onReadyCallbacks.shift() );
      }
    });

    return localize.ready( callback );
  },

  // Specify the values for keys in the dictionary for a particular culture
  define: function( culture, key, value ) {
    var defineObject = typeof culture === "object" || typeof key === "object",
        defineValue = !defineObject && key !== undefined;

    if ( defineObject ) {

      // args: object
      if ( key === undefined ) {
        value = culture;
        culture = undefined;

      // args: culture, object
      } else {
        value = key;
      }

    // args: key, value
    } else if ( defineValue && value === undefined ) {
      value = key;
      key = culture;
      culture = undefined;
    }

    if ( !culture ) {
      culture = localize.culture;
    }

    // Culture is not in dictionary yet
    if ( !localize.dictionary[ culture ] ) {
      localize.dictionary[ culture ] = {};
    }

    if ( defineObject ) {
      extend( localize.dictionary[ culture ], value );

    } else if ( defineValue ) {
      localize.dictionary[ culture ][ key ] = value;
    }

    return localize;
  },

  // Localize the innerHTML of a DOM Element
  element: function( culture, element, data ) {

    // args: element[, data ]
    if ( typeof culture != "string" ) {
      data = element;
      element = culture;
      culture = localize.culture;
    }

    if ( isElement( element ) && element.innerHTML ) {
      element.innerHTML = localize.evaluate( culture, element.innerHTML, data );
    }

    return localize;
  },

  // Get the value for a key in the dictionary for a particular culture
  key: function( culture, key, data ) {

    // args: key[, data ]
    if ( typeof key != "string" ) {
      data = key;
      key = culture;
      culture = localize.culture;
    }

    var property, str, item = key.split(".");

    // Nested key support, like: "nested.key"
    while( ( property = item.shift() ) ) {
      str = ( str || localize.dictionary[ culture ] )[ property ];

      // Key not found, return empty string
      if ( str == null ) {
        return "";
      }
    }

    // Evaluate key for interpolated values
    return localize.evaluate( str, data );
  },

  // Extends base settings with those passed in
  options: function( options, returnOptions ) {
    options = extend( localize.settings, options );

    // Generate absolute paths from those given
    each( options.path, function( path, name ) {

      // Root path gets special treatment
      if ( name == "root" ) {

        // TODO make this work at any level, ie: ../../
        options.path[ name ] = path.replace( "./", localize.uri.directory );

      } else {
        options.path[ name ] = absolutePath( options.path.root, path );
      }
    });

    // Update cultures
    if ( isArray( options.cultures ) ) {
      localize.use( options.cultures[ 0 ] );

      each( options.culture, function( culture ) {
        localize.define( culture );
      });
    }

    return returnOptions ? options : localize;
  },

  // Evaluate a string with interpolation in the current culture
  evaluate: function( culture, str, data ) {

    // args: str[, data ]
    if ( typeof str != "string" ) {
      data = str;
      str = culture;
      culture = localize.culture;
    }

    // Make dictionary and uri data available in the template
    data = extend( data, localize.dictionary[ culture ], {
      uri: localize.uri
    });

    // TODO - rewrite to support interpolation inside data keys
    // Evaluate and interpolate JavaScript templates, taken from underscore.js
    // Note that this always renders the template instead of passing back a function
    var tmpl = "var __p=[],print=function(){__p.push.apply(__p,arguments);};" +
      "with(obj||{}){__p.push('" +

      // HTML might be escaped, especially if coming in from innerHTML.
      // We want pure HTML, so we will go ahead and unescape it here.
      unescapeHtml( str )
        .replace( /\\/g, "\\\\" )
        .replace( /'/g, "\\'" )
        .replace( localize.settings.template.interpolate, function( match, code ) {
          return "'," + code
            .replace( /\\'/g, "'" ) + ",'";
        })
        .replace( localize.settings.template.evaluate, function( match, code ) {
          return "');" + code
            .replace( /\\'/g, "'" )
            .replace( /[\r\n\t]/g, " " ) + "__p.push('";
        })
        .replace( /\r/g, "\\r" )
        .replace( /\n/g, "\\n" )
        .replace( /\t/g, "\\t" ) + "');}return __p.join('');";

    var func = new Function( "obj", tmpl );

    return func( data );
  },

  // Specify a function to execute when all resources have loaded
  ready: function( func ) {
    if ( isFunction( func ) ) {
      if ( localize.isReady ) {
        func.call( localize );

      } else {
        onReadyCallbacks.push( func );
      }
    }

    return localize;
  },

  // Specify which culture to use
  use: function( culture ) {
    if ( culture && culture !== localize.culture ) {
      localize.culture = culture;

      if ( !localize.dictionary[ culture ] ) {
        localize.define( culture );
      }
    }

    return localize;
  }
});

// Export for CommonJS environments
if ( typeof module != "undefined" && module.exports ) {
  module.exports = localize;

// Expose to the global (window) object for browser environments
} else {
  global["localize"] = localize;
}

})( this );
