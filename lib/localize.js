/*
localize 0.0.1
Copyright (c) 2011, Kyle Florence
https://github.com/kflorence/localize

The contents of this file are released under the MIT license.
https://github.com/kflorence/localize/blob/master/license-mit
*/

(function( window, document, undefined ) {

// Core prototype function references
var slice = Array.prototype.slice,
    toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty,

    // ECMAScript 5 native function implementations
    nativeForEach = Array.prototype.forEach,
    nativeIndexOf = Array.prototype.indexOf,
    nativeTrim = String.prototype.trim,

    // Deferred onReady callback methods
    onReadyCallbacks = [],

    // Used for trimming whitespace
    trimLeft = /^\s+/,
    trimRight = /\s+$/,

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
    }

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

    // Builds the path to a resource file
    resourcePath = function( culture, resource ) {
      return localize.settings.path.dictionary +
        ( culture || localize.culture ) +
        ( resource || "" ) + localize.settings.resource.extension;
    },

    // Convert HTML entities to their respective characters
    unescapeHtml = function( str ) {
      return str.replace( /&lt;/g,'<' ).replace( /&gt;/g,'>' ).replace( /&amp;/g,'&' );
    },

    // Trim whitespace from before and after a string
    trim = function( str ) {
      if ( nativeTrim && str.trim === nativeTrim ) {
        return str.trim();
      }

      return str == null ?
        "" : str.replace( trimLeft, "" ).replace( trimRight, "" );
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
    localize = function( target, options ) {
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
            return localize.parse.apply( localize, args );
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
      extension: ".js"
    },
    routes: {},
    template: {
      evaluate: /<%([\s\S]+?)%>/g,
      interpolate: /<%=([\s\S]+?)%>/g
    }
  },
  uri: parseUri( window.location.href )
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

    // Path to current resource
    var resource = absolutePath( localize.uri.directory.replace( options.path.root, "" ) ) +
        ( localize.uri.file || "index" ).toLowerCase(),

        // List of resources to load
        resources = [];

    // TODO -- add in routing here

    // Build the list of resources to load
    each( options.cultures, function( culture ) {
      resources.push( resourcePath( culture ) );
      resources.push( resourcePath( culture, resource ) );
    });

    // Load the resources
    yepnope({
      load: resources,

      // Resources are done loading, fire onReady callbacks
      complete: function() {
        localize.isReady = true;

        while( onReadyCallbacks[ 0 ] ) {
          localize.ready( onReadyCallbacks.shift() );
        }
      }
    });

    return localize.ready( callback );
  },

  // Alias for yepnope
  load: function( options ) {
    yepnope.apply( window, slice.call( arguments, 0 ) );
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
      element.innerHTML = localize.parse( culture, element.innerHTML, data );
    }

    return localize;
  },

  // Get the value for a key in the dictionary for a particular culture
  key: function( culture, key ) {
    var str;

    // args: key
    if ( key === undefined ) {
      key = culture;
      culture = localize.culture;
    }

    try {
      str = localize.dictionary[ culture ][ key ];

    } catch ( e ) {}

    return str || "";
  },

  // Extends base settings with those passed in
  options: function( options, returnOptions ) {
    options = extend( localize.settings, options );

    // Generate absolute paths from those given
    each( options.path, function( path, name ) {

      // Root path gets special treatment
      if ( name == "root" ) {

        // TODO make this work at any level, ie: ../../
        if ( path == "./" ) {
          options.path[ name ] = localize.uri.directory;
        }

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

  // Parse a string, expanding any translation tags into their corresponding
  // value in the specified (or current) culture.
  parse: function( culture, str, data ) {

    // args: str[, data ]
    if ( typeof str != "string" ) {
      data = str;
      str = culture;
      culture = localize.culture;
    }

    // Evaluate and interpolate JavaScript templates, taken from underscore.js
    // Note that this always renders the template instead of passing back a function
    return Function( 'obj',
      'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      "with(obj||{}){__p.push('" +

      // HTML might be escaped, especially if coming in from innerHTML.
      // We want pure HTML, so we will go ahead and unescape it here.
      unescapeHtml( str )
        .replace( /\\/g, '\\\\').replace(/'/g, "\\'" )
        .replace( localize.settings.template.interpolate, function( match, code ) {
          return "'," + code.replace( /\\'/g, "'" ) + ",'";
        })
        .replace( localize.settings.template.evaluate || null, function( match, code ) {
          return "');" + code.replace( /\\'/g, "'" ).replace( /[\r\n\t]/g, ' ' ) + "__p.push('";
        })
        .replace( /\r/g, '\\r' )
        .replace( /\n/g, '\\n' )
        .replace( /\t/g, '\\t' ) + "');}return __p.join('');"

    // Execute the function, passing in dictionary data for the current culture
    // along with any keys the user may have defined (matching keys are overriden).
    )( extend( data, localize.dictionary[ culture ] ) );
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

// Exports
window.localize = localize;

// yepnope.js
// Version - 1.0.2
//
// by
// Alex Sexton - @SlexAxton - AlexSexton[at]gmail.com
// Ralph Holzmann - @ralphholzmann - ralphholzmann[at]gmail.com
//
// http://yepnopejs.com/
// https://github.com/SlexAxton/yepnope.js/
//
// Tri-license - WTFPL | MIT | BSD
//
(function(a,b,c){function H(){var a=z;a.loader={load:G,i:0};return a}function G(a,b,c){var e=b=="c"?r:q;i=0,b=b||"j",u(a)?F(e,a,b,this.i++,d,c):(h.splice(this.i++,0,a),h.length==1&&E());return this}function F(a,c,d,g,j,l){function q(){!o&&A(n.readyState)&&(p.r=o=1,!i&&B(),n.onload=n.onreadystatechange=null,e(function(){m.removeChild(n)},0))}var n=b.createElement(a),o=0,p={t:d,s:c,e:l};n.src=n.data=c,!k&&(n.style.display="none"),n.width=n.height="0",a!="object"&&(n.type=d),n.onload=n.onreadystatechange=q,a=="img"?n.onerror=q:a=="script"&&(n.onerror=function(){p.e=p.r=1,E()}),h.splice(g,0,p),m.insertBefore(n,k?null:f),e(function(){o||(m.removeChild(n),p.r=p.e=o=1,B())},z.errorTimeout)}function E(){var a=h.shift();i=1,a?a.t?e(function(){a.t=="c"?D(a):C(a)},0):(a(),B()):i=0}function D(a){var c=b.createElement("link"),d;c.href=a.s,c.rel="stylesheet",c.type="text/css";if(!a.e&&(o||j)){var g=function(a){e(function(){if(!d)try{a.sheet.cssRules.length?(d=1,B()):g(a)}catch(b){b.code==1e3||b.message=="security"||b.message=="denied"?(d=1,e(function(){B()},0)):g(a)}},0)};g(c)}else c.onload=function(){d||(d=1,e(function(){B()},0))},a.e&&c.onload();e(function(){d||(d=1,B())},z.errorTimeout),!a.e&&f.parentNode.insertBefore(c,f)}function C(a){var c=b.createElement("script"),d;c.src=a.s,c.onreadystatechange=c.onload=function(){!d&&A(c.readyState)&&(d=1,B(),c.onload=c.onreadystatechange=null)},e(function(){d||(d=1,B())},z.errorTimeout),a.e?c.onload():f.parentNode.insertBefore(c,f)}function B(){var a=1,b=-1;while(h.length- ++b)if(h[b].s&&!(a=h[b].r))break;a&&E()}function A(a){return!a||a=="loaded"||a=="complete"}var d=b.documentElement,e=a.setTimeout,f=b.getElementsByTagName("script")[0],g={}.toString,h=[],i=0,j="MozAppearance"in d.style,k=j&&!!b.createRange().compareNode,l=j&&!k,m=k?d:f.parentNode,n=a.opera&&g.call(a.opera)=="[object Opera]",o="webkitAppearance"in d.style,p=o&&"async"in b.createElement("script"),q=j?"object":n||p?"img":"script",r=o?"img":q,s=Array.isArray||function(a){return g.call(a)=="[object Array]"},t=function(a){return Object(a)===a},u=function(a){return typeof a=="string"},v=function(a){return g.call(a)=="[object Function]"},w=[],x={},y,z;z=function(a){function h(a,b){function i(a){if(u(a))g(a,f,b,0,c);else if(t(a))for(h in a)a.hasOwnProperty(h)&&g(a[h],f,b,h,c)}var c=!!a.test,d=c?a.yep:a.nope,e=a.load||a.both,f=a.callback,h;i(d),i(e),a.complete&&b.load(a.complete)}function g(a,b,d,e,g){var h=f(a),i=h.autoCallback;if(!h.bypass){b&&(b=v(b)?b:b[a]||b[e]||b[a.split("/").pop().split("?")[0]]);if(h.instead)return h.instead(a,b,d,e,g);d.load(h.url,h.forceCSS||!h.forceJS&&/css$/.test(h.url)?"c":c,h.noexec),(v(b)||v(i))&&d.load(function(){H(),b&&b(h.origUrl,g,e),i&&i(h.origUrl,g,e)})}}function f(a){var b=a.split("!"),c=w.length,d=b.pop(),e=b.length,f={url:d,origUrl:d,prefixes:b},g,h;for(h=0;h<e;h++)g=x[b[h]],g&&(f=g(f));for(h=0;h<c;h++)f=w[h](f);return f}var b,d,e=this.yepnope.loader;if(u(a))g(a,0,e,0);else if(s(a))for(b=0;b<a.length;b++)d=a[b],u(d)?g(d,0,e,0):s(d)?z(d):t(d)&&h(d,e);else t(a)&&h(a,e)},z.addPrefix=function(a,b){x[a]=b},z.addFilter=function(a){w.push(a)},z.errorTimeout=1e4,b.readyState==null&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",y=function(){b.removeEventListener("DOMContentLoaded",y,0),b.readyState="complete"},0)),a.yepnope=H()})(this,this.document);

})( window, document );
