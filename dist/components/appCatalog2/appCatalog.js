/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 170);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function (useSourceMap) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = cssWithMappingToString(item, useSourceMap);

      if (item[2]) {
        return '@media ' + item[2] + '{' + content + '}';
      } else {
        return content;
      }
    }).join('');
  }; // import a list of modules into the list


  list.i = function (modules, mediaQuery) {
    if (typeof modules === 'string') {
      modules = [[null, modules, '']];
    }

    var alreadyImportedModules = {};

    for (var i = 0; i < this.length; i++) {
      var id = this[i][0];

      if (id != null) {
        alreadyImportedModules[id] = true;
      }
    }

    for (i = 0; i < modules.length; i++) {
      var item = modules[i]; // skip already imported module
      // this implementation is not 100% perfect for weird media query combinations
      // when a module is imported multiple times with different media queries.
      // I hope this will never occur (Hey this way we have smaller bundles)

      if (item[0] == null || !alreadyImportedModules[item[0]]) {
        if (mediaQuery && !item[2]) {
          item[2] = mediaQuery;
        } else if (mediaQuery) {
          item[2] = '(' + item[2] + ') and (' + mediaQuery + ')';
        }

        list.push(item);
      }
    }
  };

  return list;
};

function cssWithMappingToString(item, useSourceMap) {
  var content = item[1] || '';
  var cssMapping = item[3];

  if (!cssMapping) {
    return content;
  }

  if (useSourceMap && typeof btoa === 'function') {
    var sourceMapping = toComment(cssMapping);
    var sourceURLs = cssMapping.sources.map(function (source) {
      return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */';
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
  }

  return [content].join('\n');
} // Adapted from convert-source-map (MIT)


function toComment(sourceMap) {
  // eslint-disable-next-line no-undef
  var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;
  return '/*# ' + data + ' */';
}

/***/ }),

/***/ 1:
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(4);

/***/ }),

/***/ 112:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(52)))

/***/ }),

/***/ 117:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const DEFAULT_APP_DESCRIPTION = "Place a description of the app here.";
/* unused harmony export DEFAULT_APP_DESCRIPTION */

const DEFAULT_APP_VERSION = "N/A";
/* harmony export (immutable) */ __webpack_exports__["a"] = DEFAULT_APP_VERSION;

const DEFAULT_APP_RELEASE_NOTES = "N/A";
/* harmony export (immutable) */ __webpack_exports__["b"] = DEFAULT_APP_RELEASE_NOTES;


/***/ }),

/***/ 121:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__EmptyResults__ = __webpack_require__(172);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__AppCard__ = __webpack_require__(83);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//components



/**
 * The results page. Shown when filter tags are applied, search text is entered, or both.
 * @param {object} props Component props
 * @param {array} props.tags Array of tags that are applied for filtering
 * @param {array} props.cards Array of app card objects (apps that come from FDC app directory)
 * @param {func} props.addApp See AppCard.jsx
 * @param {func} props.removeApp See AppCard.jsx
 * @param {func} props.openAppShowcase See AppCard.jsx
 * @param {func} props.addTag Parent function to add a filtering tag
 */
const AppResults = props => {

	/**
  * Function to take the incoming apps and any filtering tags and filter the list.
  * If there are no tags, we'll use all of the cards supplied
  */
	const buildResultCards = () => {
		let cardsForShowcase = [];

		//Filter cards by tags
		if (props.tags && props.tags.length > 0) {
			cardsForShowcase = props.cards.filter(card => {
				for (let i = 0; i < props.tags.length; i++) {
					let tagToSearchFor = props.tags[i];
					if (!card.tags.includes(tagToSearchFor)) return false;
				}
				return true;
			});
		} else {
			cardsForShowcase = props.cards;
		}

		return cardsForShowcase;
	};

	let cardsForShowcase = buildResultCards();

	/**
  * Function to build the table of cards based on filtered information
  */
	const getCardRows = () => {
		let cardRows = [];
		let cardsInRow = [];
		for (let i = 0; i < cardsForShowcase.length; i++) {
			let card = cardsForShowcase[i];
			let name = card.title || card.name;

			let key = "card-" + i + "-" + name.toLowerCase();

			cardsInRow.push(__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"td",
				{ key: key },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__AppCard__["a" /* default */], _extends({}, card, { viewAppShowcase: props.viewAppShowcase }))
			));

			if (cardsInRow.length === 4 || i === cardsForShowcase.length - 1) {
				cardRows.push(cardsInRow);
				cardsInRow = [];
			}
		}

		return cardRows;
	};

	if (cardsForShowcase.length === 0) return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_1__EmptyResults__["a" /* default */], null);

	let cardRows = getCardRows();

	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "app-results" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"table",
			{ className: "app-results-table" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"tbody",
				null,
				cardRows.map((row, i) => {
					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"tr",
						{ key: "tablerow-" + i },
						row
					);
				})
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (AppResults);

/***/ }),

/***/ 122:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Hero__ = __webpack_require__(173);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__Carousel__ = __webpack_require__(171);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
/**
 * This component is the name of a component and a pin that will pin that component to all toolbars.
 *
 */


//components


const TAG1 = "App";
const TAG2 = "Native";
/**
 * Home page. Contains carousels and a hero component
 * @param {object} props Component props
 * @param {array} props.cards An Array of app information from FDC
 * @param {func} props.viewAppShowcase Opens the AppShowcase page for a selected app
 */
const Home = props => {
	let carousel1 = props.cards.filter(card => {
		return card.tags.includes(TAG1);
	});

	let carousel2 = props.cards.filter(card => {
		return card.tags.includes(TAG2);
	});

	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		'div',
		{ className: 'home' },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_1__Hero__["a" /* default */], { cards: props.cards, viewAppShowcase: props.viewAppShowcase }),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__Carousel__["a" /* default */], { tag: TAG1, cards: carousel1, viewAppShowcase: props.viewAppShowcase }),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__Carousel__["a" /* default */], { tag: TAG2, cards: carousel2, viewAppShowcase: props.viewAppShowcase })
	);
};

/* harmony default export */ __webpack_exports__["a"] = (Home);

/***/ }),

/***/ 123:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__Toast__ = __webpack_require__(182);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__shared_Tag__ = __webpack_require__(86);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__shared_TagsMenu__ = __webpack_require__(87);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//data


//components




/**
 * The search bar, tags filter menu, and any active tags being filtered on
 * @param {object} props Component props
 * @param {boolean} [props.backButton] If true, display a back button for going back to the homepage
 * @param {array} props.tags An array of all available tags for the tags menu
 * @param {array} props.activeTags An array of active tags acting as search criteria
 * @param {func} props.goHome Function to handle sending the app back to the homepage
 * @param {func} props.installationActionTaken Function that handles display/hiding the success/failure message from adding/removing an app
 */
class SearchBar extends __WEBPACK_IMPORTED_MODULE_0_react__["Component"] {
	constructor(props) {
		super(props);
		this.state = {
			searchValue: "",
			tagSelectorOpen: false
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.goHome = this.goHome.bind(this);
		this.changeSearch = this.changeSearch.bind(this);
		this.toggleTagSelector = this.toggleTagSelector.bind(this);
		this.selectTag = this.selectTag.bind(this);
		this.removeTag = this.removeTag.bind(this);
	}
	componentWillReceiveProps(nextProps) {
		if (nextProps.activeTags.length === 0 && !nextProps.backButton || nextProps.isViewingApp) {
			//this.setState({
			//	searchValue: ""
			//});
		}
	}
	/**
  * Handles changing the component state for handling local input value. Also calls parent function to effect the store
  * @param {object} e React Synthetic event
  */
	changeSearch(e) {
		this.setState({
			searchValue: e.target.value
		});
		this.props.search(e.target.value);
	}
	/**
  * Opens/hides the tag selection menu
  */
	toggleTagSelector() {
		this.setState({
			tagSelectorOpen: !this.state.tagSelectorOpen
		});
	}
	/**
  * Calls parent function to add a tag to filters
  * @param {string} tag The name of the tag
  */
	selectTag(tag) {
		let tags = __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].getActiveTags();

		this.setState({
			tagSelectorOpen: false
		}, () => {
			if (tags.includes(tag)) {
				__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].removeTag(tag);
			} else {
				__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addTag(tag);
			}
		});
	}
	/**
  * Calls parent function to remove a tag from filters
  * @param {string} tag The name of the tag
  */
	removeTag(tag) {
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].removeTag(tag);
	}
	/**
  * Clears search because 'back' button was clicked
  */
	goHome() {
		this.setState({
			searchValue: ""
		}, this.props.goHome);
	}
	render() {
		let tagListClass = "tag-selector-content";

		if (!this.state.tagSelectorOpen) {
			tagListClass += " hidden";
		}

		let activeTags = __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].getActiveTags();

		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "search-main" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__Toast__["a" /* default */], { installationActionTaken: this.props.installationActionTaken }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "search-action-items" },
				this.props.backButton ? __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"div",
					{ className: "search-back", onClick: this.goHome },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-arrow-back" }),
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"span",
						{ className: "button-label" },
						"Back"
					)
				) : null,
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"div",
					{ className: "search-input-container" },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-search" }),
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("input", { className: "search-input", type: "text", value: this.state.searchValue, onChange: this.changeSearch })
				),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_4__shared_TagsMenu__["a" /* default */], { active: activeTags, list: this.props.tags, onItemClick: this.selectTag, label: "Tags", align: "right" })
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "label-bar" },
				this.props.activeTags.map((tag, i) => {
					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_3__shared_Tag__["a" /* default */], { key: tag, name: tag, removeTag: this.removeTag });
				})
			)
		);
	}
}

/* harmony default export */ __webpack_exports__["a"] = (SearchBar);

/***/ }),

/***/ 124:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__Modal__ = __webpack_require__(178);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__Header__ = __webpack_require__(176);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__ImageCarousel__ = __webpack_require__(177);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__AppDescription__ = __webpack_require__(174);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__ReleaseNotes__ = __webpack_require__(179);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__AppDevNotes__ = __webpack_require__(175);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__VersionNotes__ = __webpack_require__(181);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__SupportNotes__ = __webpack_require__(180);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__AppCard__ = __webpack_require__(83);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//data


//components










const imagesInCarousel = 4;
class AppShowcase extends __WEBPACK_IMPORTED_MODULE_0_react__["Component"] {
	constructor(props) {
		super(props);
		this.state = {
			name: this.props.app.title || this.props.app.name,
			iconUrl: this.props.app.icons !== undefined && this.props.app.icons[0].url !== undefined ? this.props.app.icons[0].url : "../assets/placeholder.svg",
			entitled: this.props.app.entitled ? this.props.app.entitled : false,
			imageIndex: 0,
			imageModalOpen: false,
			modalImage: null
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.nextImage = this.nextImage.bind(this);
		this.previousImage = this.previousImage.bind(this);
		this.openSite = this.openSite.bind(this);
		this.openModal = this.openModal.bind(this);
		this.closeModal = this.closeModal.bind(this);
		this.addTag = this.addTag.bind(this);
	}
	/**
  * Pages right through the app's images.
  */
	nextImage() {
		let index = this.state.imageIndex;

		//We want to increase the image index for the carousel, but if this paging action takes us past the length of the image array, we need to reset
		if (index + 1 > this.props.app.images.length) {
			index = 0;
		} else {
			index++;
		}

		this.setState({
			imageIndex: index
		});
	}
	/**
  * Pages left through the app's images.
  */
	previousImage() {
		let index = this.state.imageIndex;

		//We want to decrease the image index for the carousel, but if this paging action takes us under 0, we need to reset
		if (index - 1 < 0) {
			index = this.props.app.images.length - 1;
		} else {
			index--;
		}

		this.setState({
			imageIndex: index
		});
	}
	/**
  * Opens the publisher's website.
  */
	//NOTE: There is currently no prop in the FDC spec that has a dev site.
	openSite() {
		console.log("open the developers site");
	}
	/**
  * Opens the image modal (light box). Sets the image to display
  * @param {string} url The image url to display in the light box
  */
	openModal(url) {
		this.setState({
			modalImage: url,
			imageModalOpen: true
		});
	}
	/**
  * Closes the image modal
  */
	closeModal() {
		this.setState({
			imageModalOpen: false,
			modalImage: null
		});
	}
	/**
  * Calls the parents function to add a tag to list of filters
  * @param {string} name The tag name
  */
	addTag(name) {
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addTag(name);
	}
	render() {
		let { name, iconUrl, imageIndex: index } = this.state;

		let images = [];
		for (let i = 0; i < imagesInCarousel; i++) {

			if (index > this.props.app.images.length - 1) {
				index = 0;
			}

			let imageUrl = this.props.app.images[index].url !== undefined ? this.props.app.images[index].url : "../assets/placeholder.svg";
			images.push(imageUrl);
			index++;
		}
		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "app-showcase" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				__WEBPACK_IMPORTED_MODULE_2__Modal__["a" /* default */],
				{ open: this.state.imageModalOpen, closeModal: this.closeModal },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("img", { src: this.state.modalImage, className: "modal-image" })
			),
			!this.state.entitled && __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "app-warning" },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"span",
					{ className: "app-warning-wrapper" },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-alert" }),
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"span",
						{ className: "app-warning-text" },
						"You don't have permission to add this App. ",
						__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
							"a",
							{ href: "#" },
							"Contact your administrator"
						),
						" to request permission."
					)
				)
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_3__Header__["a" /* default */], { iconUrl: iconUrl, name: this.props.app.name, entitled: this.state.entitled, installed: this.props.app.installed, appId: this.props.app.appId }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_4__ImageCarousel__["a" /* default */], { nextImage: this.nextImage, previousImage: this.previousImage, openModal: this.openModal, images: images }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_5__AppDescription__["a" /* default */], { description: this.props.app.description }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_6__ReleaseNotes__["a" /* default */], { releaseNotes: this.props.app.releaseNotes }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_7__AppDevNotes__["a" /* default */], { email: this.props.app.contactEmail, publisher: this.props.app.publisher }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_8__VersionNotes__["a" /* default */], { version: this.props.app.version }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_9__SupportNotes__["a" /* default */], { email: this.props.app.supportEmail, tags: this.props.app.tags })
		);
	}
}

/* harmony default export */ __webpack_exports__["a"] = (AppShowcase);

/***/ }),

/***/ 146:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(238);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {"hmr":true}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(7)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/dist/cjs.js!./appCatalog.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/dist/cjs.js!./appCatalog.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 170:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_react_dom__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_react_dom___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_react_dom__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_SearchBar__ = __webpack_require__(123);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_Home__ = __webpack_require__(122);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_AppResults__ = __webpack_require__(121);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__components_Showcase_AppShowcase__ = __webpack_require__(124);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__stores_appStore__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__appCatalog_css__ = __webpack_require__(146);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__appCatalog_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8__appCatalog_css__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/



//components





//data



//style


class AppMarket extends __WEBPACK_IMPORTED_MODULE_0_react___default.a.Component {
	constructor(props) {
		super(props);
		this.state = {
			apps: [],
			filteredApps: [],
			installed: [],
			tags: [],
			activeTags: [],
			activeApp: null,
			forceSearch: false,
			installationActionTaken: null
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.addedAppsChanged = this.addedAppsChanged.bind(this);
		this.filteringApps = this.filteringApps.bind(this);
		this.goHome = this.goHome.bind(this);
		this.addTag = this.addTag.bind(this);
		this.removeTag = this.removeTag.bind(this);
		this.changeSearch = this.changeSearch.bind(this);
		this.openAppShowcase = this.openAppShowcase.bind(this);
		this.stopShowingInstalledNotification = this.stopShowingInstalledNotification.bind(this);
		this.compileAddedInfo = this.compileAddedInfo.bind(this);
		this.getPageContents = this.getPageContents.bind(this);
		this.determineActivePage = this.determineActivePage.bind(this);
		this.navigateToShowcase = this.navigateToShowcase.bind(this);
		this.viewApp = this.viewApp.bind(this);
	}

	componentWillMount() {
		//For more information on async react rendering, see here
		//https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html

		this._asyncAppRequest = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getApps().then(apps => {
			this.setState({
				apps
			});
		});

		this._asyncTagsRequest = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getTags().then(tags => {
			this.setState({
				tags
			});
		});
	}

	componentDidMount() {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().addListener({ field: "appDefinitions" }, this.addedAppsChanged);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().addListener({ field: "filteredApps" }, this.filteringApps);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().addListener({ field: "activeTags" }, this.filteringApps);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().addListener({ field: "activeApp" }, this.openAppShowcase);
		// Get notified when user wants to view an app
		FSBL.Clients.RouterClient.addListener("viewApp", this.viewApp);
		let installed = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getInstalledApps();

		this.setState({
			installed: Object.keys(installed)
		});
	}

	componentWillUnmount() {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().removeListener({ field: "appDefinitions" }, this.addedAppsChanged);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().removeListener({ field: "filteredApps" }, this.filteringApps);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().removeListener({ field: "activeTags" }, this.filteringApps);
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["a" /* getStore */])().removeListener({ field: "activeApp" }, this.openAppShowcase);
		// Get notified when user wants to view an app
		FSBL.Clients.RouterClient.removeListener("viewApp", this.viewApp);

		//Make sure async requests have finished.
		if (this._asyncAppRequest) {
			this._asyncAppRequest.cancel();
		}

		if (this._asyncTagsRequest) {
			this._asyncTagsRequest.cancel();
		}
	}

	viewApp(error, event) {
		!error && this.navigateToShowcase(event.data.app.appID);
	}

	addedAppsChanged() {
		let action;
		if (this.state.installed.length > Object.keys(__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getInstalledApps()).length) {
			//If the components installed apps is greater than that of the store, that means an app was removed
			action = "remove";
		} else if (this.state.installed.length < Object.keys(__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getInstalledApps()).length) {
			//If the component's installed apps is less than that of the store, that means an app was added
			action = "add";
		}

		if (action) {
			this.setState({
				installationActionTaken: action,
				installed: Object.keys(__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getInstalledApps())
			}, () => {
				setTimeout(this.stopShowingInstalledNotification, 3000);
			});
		}
	}

	/**
  * The store has pushed an update to the filtered tags list. This means a user has begun searching or added tags to the filter list
  */
	filteringApps() {
		let { filteredApps, activeTags, activeApp } = this.state;
		let apps = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getFilteredApps();
		let tags = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getActiveTags();

		//Make sure a change actually occured before rerendering. If the store's activeTags or filteredApps is different then component's, we make a change (which triggers a page change). Otherwise don't.
		//NOTE: The potential bug here is if filteredApps or activeTags has somehow changed and maintained the same length (which should be impossible)
		if (apps && filteredApps && activeTags && tags && (apps.length !== filteredApps.length || activeTags.length !== tags.length)) {
			this.setState({
				filteredApps: apps,
				activeTags: tags,
				activeApp: apps.length !== 0 && tags.length !== 0 ? null : activeApp
			});
		}
	}
	/**
  * Determines the apps page based on the state of the activeTags, search text, etc
  */
	determineActivePage() {
		let { activeApp, filteredApps, activeTags, forceSearch } = this.state;
		let page;

		if (activeApp && !forceSearch) {
			page = "showcase";
		} else if (filteredApps.length > 0 || forceSearch) {
			page = "appSearch";
		} else if (filteredApps.length === 0 && activeTags.length === 0) {
			page = "home";
		}

		return page;
	}
	/**
  * Calls the store to add a tag to the activeTag list. Also updates the app view to switch to the AppResults page (since adding a tag implies filtering has begun)
  * @param {string} tag The name of the tag to add
  */
	addTag(tag) {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].addTag(tag);
	}
	/**
  * Calls the store to remove a tag from the activeTag list. Also updates the app view to switch to the homepage if all tags have been removed
  * @param {string} tag The name of the tag to add
  */
	removeTag(tag) {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].removeTag(tag);
	}
	/**
  * Action to take when the back button is clicked (which just goes home)
  */
	goHome() {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].clearTags();
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].clearFilteredApps();
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].clearApp();
		this.setState({
			activeApp: null,
			forceSearch: false
		});
	}
	/**
  * Performs a search through the catalog
  * @param {string} search The text to search the catalog with
  */
	changeSearch(search) {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].searchApps(search, () => {

			this.setState({ forceSearch: search !== "" });
		});
	}
	/**
  * When the notification for isntalling/removing an app is shown a timeout is set to call this function to cease showing the notification
  */
	stopShowingInstalledNotification() {
		this.setState({
			installationActionTaken: null,
			activeApp: __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getActiveApp()
		});
	}

	navigateToShowcase(id) {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].openApp(id);
	}

	/**
  * Opens the AppShowcase page for the app supplied
  */
	openAppShowcase() {
		let app = __WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].getActiveApp();
		if (app !== null) {
			__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].clearTags();
			__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].clearFilteredApps();
			this.setState({
				activeApp: app,
				forceSearch: false
			});
		}
	}
	/**
  * Compiles a list of apps that are installed from the information recieved back from appd
  * and the information contained on the system
  * TODO: This is temporary. It will change when there is actually a way to know from launcher what apps are installed, and which are not
  * @param {boolean} filtered If true, uses the filtered apps array. Otherwise uses all apps
  */
	compileAddedInfo(filtered) {
		let { installed, forceSearch } = this.state;
		let apps;
		if (filtered || forceSearch) {
			apps = this.state.filteredApps;
		} else {
			apps = this.state.apps;
		}

		apps = apps.map(app => {
			for (let i = 0; i < installed.length; i++) {
				if (installed.includes(app.appId)) {
					app.installed = true;
				} else {
					app.installed = false;
				}
			}
			return app;
		});
		return apps;
	}
	getPageContents() {
		let { filteredApps, activeTags } = this.state;
		let activePage = this.determineActivePage();
		let apps = this.compileAddedInfo(filteredApps.length > 0);
		//Force default case if activepage isn't search and apps.length is 0
		if (apps.length === 0 && activePage !== "appSearch") activePage = -1;
		switch (activePage) {
			case "home":
				return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_3__components_Home__["a" /* default */], { cards: apps, seeMore: this.addTag, addApp: this.addApp, removeApp: this.removeApp, addTag: this.addTag, viewAppShowcase: this.navigateToShowcase });
			case "appSearch":
				return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_4__components_AppResults__["a" /* default */], { cards: apps, tags: activeTags, addApp: this.addApp, removeApp: this.removeApp, viewAppShowcase: this.navigateToShowcase, addTag: this.addTag });
			case "showcase":
				let app = this.compileAddedInfo(false).find(app => {
					return this.state.activeApp === app.appId;
				});
				return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_5__components_Showcase_AppShowcase__["a" /* default */], { app: app, addApp: this.addApp, removeApp: this.removeApp, addTag: this.addTag });
			default:
				return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("div", null);
		}
	}
	render() {

		let { tags, activeTags } = this.state;
		let page = this.determineActivePage();
		let pageContents = this.getPageContents();

		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			null,
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__components_SearchBar__["a" /* default */], { hidden: page === "showcase" ? true : false, backButton: page !== "home", tags: tags, activeTags: activeTags, tagSelected: this.addTag,
				removeTag: this.removeTag, goHome: this.goHome, installationActionTaken: this.state.installationActionTaken,
				search: this.changeSearch, isViewingApp: this.state.activeApp !== null }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "market_content" },
				pageContents
			)
		);
	}
}
/* harmony export (immutable) */ __webpack_exports__["default"] = AppMarket;


if (window.FSBL && FSBL.addEventListener) {
	FSBL.addEventListener("onReady", FSBLReady);
} else {
	window.addEventListener("FSBLReady", FSBLReady);
}

function FSBLReady() {
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__stores_appStore__["b" /* createStore */])(store => {
		__WEBPACK_IMPORTED_MODULE_7__stores_storeActions__["a" /* default */].initialize(() => {
			__WEBPACK_IMPORTED_MODULE_1_react_dom___default.a.render(__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(AppMarket, null), document.getElementById("bodyHere"));
		});
	});
}

/***/ }),

/***/ 171:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__AppCard__ = __webpack_require__(83);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//data


//components

/**
 * A carousel of AppCards
 * @param {object} props Component props
 * @param {array} props.cards An array of AppCards to display in a carousel
 * @param {string} props.tag The carousel's tag (title)
 * @param {func} props.openAppShowcase Parent function to show the AppShowcase for the selected card
 */
class Carousel extends __WEBPACK_IMPORTED_MODULE_0_react__["Component"] {
	constructor(props) {
		super(props);
		this.state = {
			firstIndex: 0,
			titleHighlighted: false
		};
		this.bindCorrectContext();
		if (this.props.cards.length <= 4) this.notEnoughCards();
	}
	bindCorrectContext() {
		this.pageUp = this.pageUp.bind(this);
		this.pageDown = this.pageDown.bind(this);
		this.highlightTitle = this.highlightTitle.bind(this);
		this.seeMore = this.seeMore.bind(this);
		this.notEnoughCards = this.notEnoughCards.bind(this);
		this.buildCarousel = this.buildCarousel.bind(this);
	}
	/**
  * Pages through the carousel by one card (right)
  */
	pageUp() {
		let index = this.state.firstIndex;

		//If increasing the carousel's first index will move beyond the array's limits, we reset back to zero
		if (index + 1 <= this.props.cards.length - 1) {
			index++;
		}

		this.setState({
			firstIndex: index
		});
	}
	/**
  * Pages through the carousel by one card (left)
  */
	pageDown() {
		let index = this.state.firstIndex;

		//If increasing the carousel's first index will move beyond the array's limits, we reset back to zero
		if (index - 1 >= 0) {
			index--;
		}

		this.setState({
			firstIndex: index
		});
	}
	/**
  * Toggles the highlight on a carousel's title. When a user mouses over, we want to style it so its obvious its a link
  * @param {*} highlight
  */
	highlightTitle(highlight) {
		this.setState({
			titleHighlighted: highlight
		});
	}
	/**
  * Calls the parents seeMore function, which will add the selected tag as a filter
  */
	seeMore() {
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addTag(this.props.tag);
	}
	/**
  * Spits out a warning if the number of cards supplied to the carousel is < 4
  */
	notEnoughCards() {
		console.warn('Less than 4 card supplied. This carousel will not display optimally');
	}
	/**
  * Function to build the items in the carousel
  */
	buildCarousel() {
		let { cards } = this.props;
		let firstCard = this.state.firstIndex;

		let displayCards = [];
		for (let i = 0; i < 4; i++) {
			if (firstCard >= 0 && firstCard <= cards.length - 1) {
				displayCards.push(cards[firstCard]);
				firstCard++;
			}
		}

		return displayCards;
	}
	render() {

		let displayCards = this.buildCarousel();
		let titleClass = "carousel-title";
		if (this.state.titleHighlighted) titleClass += " highlight";

		let chevron_left_style = 'ff-chevron-left',
		    chevron_right_style = 'ff-chevron-right';
		let left_click = this.pageDown,
		    right_click = this.pageUp;

		if (this.state.firstIndex + 3 >= this.props.cards.length - 1) {
			chevron_right_style += " disabled";
			right_click = Function.prototype;
		}

		if (this.state.firstIndex === 0) {
			chevron_left_style += " disabled";
			left_click = Function.prototype;
		}

		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			'div',
			{ className: 'carousel-main' },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				'div',
				{ className: 'carousel-header' },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					'div',
					{ className: titleClass, onClick: this.seeMore, onMouseEnter: this.highlightTitle.bind(this, true), onMouseLeave: this.highlightTitle.bind(this, false) },
					this.props.tag[0].toUpperCase() + this.props.tag.substring(1)
				),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					'button',
					{ className: 'see-more', onClick: this.seeMore },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						'span',
						{ className: 'button-label' },
						'See More'
					)
				)
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				'div',
				{ className: 'carousel-content' },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement('i', { className: chevron_left_style, onClick: left_click }),
				displayCards.map((card, i) => {
					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(__WEBPACK_IMPORTED_MODULE_2__AppCard__["a" /* default */], _extends({ key: (card.title || card.name) + i }, card, { viewAppShowcase: this.props.viewAppShowcase }));
				}),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement('i', { className: chevron_right_style, onClick: right_click })
			)
		);
	}
}
/* harmony export (immutable) */ __webpack_exports__["a"] = Carousel;


/***/ }),

/***/ 172:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * Empty Results to show on the search page when filters/search text apply to zero results
 * @param {*} props
 */
const EmptyResults = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		'div',
		{ className: 'app-results' },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			'h3',
			{ className: 'app-results-no-results' },
			'No results found. Please try again.'
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (EmptyResults);

/***/ }),

/***/ 173:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
/**
 * This component is the name of a component and a pin that will pin that component to all toolbars.
 *
 */


/**
 * The hero component at the top of the App Catalog homepage. Display images and textual descriptions of showcased apps
 * @param {object} props Component props
 * @param {}
 */
class Hero extends __WEBPACK_IMPORTED_MODULE_0_react__["Component"] {
	constructor(props) {
		super(props);
		this.state = {
			active: 0
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.changePage = this.changePage.bind(this);
		this.openApp = this.openApp.bind(this);
	}
	/**
  * Changes the page of the hero component depending on the action its handed
  * @param {string} action One of 'page_down' or 'page_up'. Any other action is ignored
  */
	changePage(action) {
		let { cards } = this.props;
		let newActive = this.state.active;

		if (typeof action === "number") {
			newActive = action;
		} else {
			switch (action) {
				case "page_down":
					newActive = newActive - 1 < 0 ? cards.length - 1 : newActive - 1;
					break;
				case "page_up":
					newActive = newActive + 1 > cards.length - 1 ? 0 : newActive + 1;
					break;
				default:
					break;
			}
		}

		this.setState({
			active: newActive
		});
	}
	/**
  * Called the parent function to open the AppShowcase for the clicked app
  */
	openApp() {
		this.props.viewAppShowcase(this.props.cards[this.state.active].appId);
	}
	render() {

		let { active } = this.state;
		let { cards } = this.props;
		let contentTitle = cards[active].title === undefined ? cards[active].name : cards[active].title;
		let contentMsg = cards[active].description;
		let imageUrl = cards[active].images ? cards[active].images[0].url : "../assets/placeholder.svg";

		let bgImageStyle = {
			background: "url(" + imageUrl + ") no-repeat fixed center"
		};

		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			null,
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "hero-main" },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-chevron-left", onClick: this.changePage.bind(this, 'page_down') }),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"div",
					{ className: "hero_selected_content", onClick: this.openApp, style: bgImageStyle },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"div",
						{ className: "selected-content-title" },
						contentTitle
					),
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"div",
						{ className: "selected-content-message" },
						__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
							"div",
							null,
							contentMsg
						)
					)
				),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-chevron-right", onClick: this.changePage.bind(this, 'page_up') })
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "paginator" },
				cards.map((card, i) => {
					let classes = 'pagination-oval';
					if (i === active) classes += " active";
					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("div", { key: i, className: classes, onClick: this.changePage.bind(this, i) });
				})
			)
		);
	}
}
/* harmony export (immutable) */ __webpack_exports__["a"] = Hero;


/***/ }),

/***/ 174:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * AppShowcase description section
 * @param {object} props Component props
 * @param {string} props.description The app description
 */
const AppDescription = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "app-notes description" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"span",
			{ className: "showcase-label" },
			"Description"
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "description-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				null,
				props.description || DEFAULT_APP_DESCRIPTION
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (AppDescription);

/***/ }),

/***/ 175:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
var _this = this;

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * AppShowcase dev notes section. Contains developer information
 * @param {object} props Component props
 * @param {string} props.publisher The name of this app's publisher
 * @param {func} props.openSite Parent function to launch the developer's site in Finsemble window
 * @param {string} props.email The developer's contact email
 */
const AppDevNotes = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "app-notes developer" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"span",
			{ className: "showcase-label" },
			"Developer"
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "developer-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				null,
				props.publisher,
				" - ",
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"a",
					{ href: "#", onClick: _this.openSite },
					props.email
				)
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (AppDevNotes);

/***/ }),

/***/ 176:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/



//data


let pendingSpawn = false;

/**
 * The header of the AppShowcase. Contains the actionable buttons (to add/remove and app) and the app title and icon
 * @param {object} props Component props
 * @param {string} props.iconUrl The image url for the app's icon
 * @param {string} props.name The app name
 * @param {func} props.appAction The function to call when a button is clicked.
 */
const Header = props => {

	const addApp = () => {

		if (props.installed) {
			if (pendingSpawn) return;
			pendingSpawn = true;
			const name = props.title || props.name;
			// If the app has a URL property
			// For now, this means it was manually added
			// So lets spawn from URL
			if (props.url) {
				FSBL.Clients.LauncherClient.spawn(null, {
					url: props.url
				}, () => {
					pendingSpawn = false;
				});
				return;
			}
			// Otherwise launch application by name
			FSBL.Clients.LauncherClient.spawn(name, {}, (err, data) => {
				pendingSpawn = false;
			});
		} else {
			__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addApp(props.appId);
		}
	};

	const removeApp = () => {
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].removeApp(props.appId);
	};

	const launchApp = () => {};
	console.log("addApp", props);
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "header" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "icon-title-container" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("img", { className: "header-icon", src: props.iconUrl }),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "appName" },
				props.name
			)
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "action-button-container" },
			props.installed && __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"button",
				{ className: props.entitled ? "action-button remove" : "action-button disabled", disabled: !props.entitled, onClick: removeApp },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"div",
					{ className: "remove-button" },
					"Remove"
				)
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"button",
				{ className: props.entitled ? "action-button open" : "action-button disabled", disabled: !props.entitled, onClick: addApp },
				props.installed ? __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"div",
					null,
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"span",
						{ className: "action-button-label" },
						"Open"
					)
				) : __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"span",
					{ className: "action-button-label" },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-plus" }),
					"\xA0My Apps"
				)
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (Header);

/***/ }),

/***/ 177:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
var _this = this;

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
/**
 * This component is the name of a component and a pin that will pin that component to all toolbars.
 *
 */


/**
 * The image carousel which displays images for a single app
 * @param {object} props Component props
 * @param {func} props.nextImage Function supplied by the parent to page through the images (right)
 * @param {func} props.previousImage Function supplied by the parent to page through the images (left)
 * @param {array} props.images The images of the displayed app
 */
const ImageCarousel = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "image-carousel-container" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-chevron-left", onClick: props.nextImage }),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "image-carousel" },
			props.images.map((imageUrl, i) => {
				return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("img", { key: "showcase-image-" + i, className: "image-carousel-image", src: imageUrl, onClick: props.openModal.bind(_this, imageUrl) });
			})
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-chevron-right", onClick: props.previousImage })
	);
};

/* harmony default export */ __webpack_exports__["a"] = (ImageCarousel);

/***/ }),

/***/ 178:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * The image modal (light box)
 * @param {object} props Component props
 * @param {func} props.closeModal Parent function to close the modal. Actual display is handled by CSS
 * @param {object} props.children The inner contents (elements) of the array
 */
const Modal = props => {
	let modalClassName = "modal";
	if (props.open) {
		modalClassName += " open";
	} else {
		modalClassName += " closed";
	}

	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: modalClassName, onClick: props.closeModal },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "modal-main" },
			props.children
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (Modal);

/***/ }),

/***/ 179:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__defaults__ = __webpack_require__(117);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/



/**
 * AppShowcase release notes section. Display information about app's most recent change notes
 * @param {object} props Component props
 * @param {string} props.releaseNotes The release notes
 */
const ReleaseNotes = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "app-notes release-notes" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"span",
			{ className: "showcase-label" },
			"Release Notes"
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "release-notes-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				null,
				props.releaseNotes || __WEBPACK_IMPORTED_MODULE_1__defaults__["b" /* DEFAULT_APP_RELEASE_NOTES */]
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (ReleaseNotes);

/***/ }),

/***/ 18:
/***/ (function(module, exports) {


/**
 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
 * embed the css on the page. This breaks all relative urls because now they are relative to a
 * bundle instead of the current page.
 *
 * One solution is to only use full urls, but that may be impossible.
 *
 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
 *
 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
 *
 */

module.exports = function (css) {
  // get current location
  var location = typeof window !== "undefined" && window.location;

  if (!location) {
    throw new Error("fixUrls requires window.location");
  }

	// blank or null?
	if (!css || typeof css !== "string") {
	  return css;
  }

  var baseUrl = location.protocol + "//" + location.host;
  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");

	// convert each url(...)
	/*
	This regular expression is just a way to recursively match brackets within
	a string.

	 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
	   (  = Start a capturing group
	     (?:  = Start a non-capturing group
	         [^)(]  = Match anything that isn't a parentheses
	         |  = OR
	         \(  = Match a start parentheses
	             (?:  = Start another non-capturing groups
	                 [^)(]+  = Match anything that isn't a parentheses
	                 |  = OR
	                 \(  = Match a start parentheses
	                     [^)(]*  = Match anything that isn't a parentheses
	                 \)  = Match a end parentheses
	             )  = End Group
              *\) = Match anything and then a close parens
          )  = Close non-capturing group
          *  = Match anything
       )  = Close capturing group
	 \)  = Match a close parens

	 /gi  = Get all matches, not the first.  Be case insensitive.
	 */
	var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
		// strip quotes (if they exist)
		var unquotedOrigUrl = origUrl
			.trim()
			.replace(/^"(.*)"$/, function(o, $1){ return $1; })
			.replace(/^'(.*)'$/, function(o, $1){ return $1; });

		// already a full url? no change
		if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
		  return fullMatch;
		}

		// convert the url to a full url
		var newUrl;

		if (unquotedOrigUrl.indexOf("//") === 0) {
		  	//TODO: should we add protocol?
			newUrl = unquotedOrigUrl;
		} else if (unquotedOrigUrl.indexOf("/") === 0) {
			// path should be relative to the base url
			newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
		} else {
			// path should be relative to current directory
			newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
		}

		// send back the fixed url(...)
		return "url(" + JSON.stringify(newUrl) + ")";
	});

	// send back the fixed css
	return fixedCss;
};


/***/ }),

/***/ 180:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
var _this = this;

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//data


/**
 * AppShowcase support notes section.
 * @param {object} props Component props
 * @param {string} props.email The publisher's support email address
 * @param {array} props.tags An array containing the names of all tags that apply to this app
 */
const SupportNotes = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "dev-notes support" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "support-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "showcase-label" },
				"Support"
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "support" },
				props.email
			)
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "tags-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "showcase-label" },
				"Tags"
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "tags" },
				props.tags.map((tag, i) => {
					let tagName = tag[0].toUpperCase() + tag.substring(1);

					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"div",
						{ key: "showcase-tag-label-" + i, className: "tag-label", onClick: __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addTag.bind(_this, tag) },
						__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
							"span",
							{ className: "label-content" },
							tagName
						)
					);
				})
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (SupportNotes);

/***/ }),

/***/ 181:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__defaults__ = __webpack_require__(117);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/



/**
 * AppShowcase version notes section.
 * @param {object} props Component props
 * @param {string} props.version The current app version
 */
const VersionNotes = props => {
	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		"div",
		{ className: "dev-notes version-update" },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "version-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "showcase-label" },
				"Version"
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "version" },
				props.version || __WEBPACK_IMPORTED_MODULE_1__defaults__["a" /* DEFAULT_APP_VERSION */]
			)
		),
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "updated-content" },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "showcase-label" },
				"Last Updated"
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "updated" },
				"Not available"
			)
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (VersionNotes);

/***/ }),

/***/ 182:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


/**
 * Toast component. Displays a success/failure message when an app is added/removed
 * @param {object} props Component props
 * @param {string} props.installationActionTaken String containing the action that occurred
 */
const Toast = props => {
	let classes = "toast-content";
	let icon = null,
	    messageContent = null;

	switch (props.installationActionTaken) {
		case "add":
			icon = 'ff-check-mark';
			messageContent = "Added to My Apps";
			classes += " success";
			break;
		case "remove":
			icon = 'ff-close';
			messageContent = "Removed from My Apps";
			classes += " error";
			break;
		default:
			classes += " not-shown";
			break;
	}

	if (messageContent !== null) {
		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: classes },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"span",
				{ className: "toast" },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: icon }),
				"\xA0\xA0",
				messageContent
			)
		);
	} else {
		return null;
	}
};

/* harmony default export */ __webpack_exports__["a"] = (Toast);

/***/ }),

/***/ 2:
/***/ (function(module, exports) {

module.exports = vendor_lib;

/***/ }),

/***/ 238:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)(false);
// Module
exports.push([module.i, ".appMarket {\r\n\tbackground-color: var(--catalog-background-color);\r\n\tcolor: var(--catalog-font-color);\r\n\t/* background-image: linear-gradient(to top, rgb(60, 76, 88), rgb(48, 61, 71)); */\r\n\tfont-family: Roboto;\r\n\tfont-style: normal;\r\n    font-stretch: normal;\r\n    line-height: normal;\r\n    letter-spacing: normal;\r\n\theight: 100%;\r\n\tmargin-left: 0;\r\n\tmargin-right: 0;\r\n}\r\n\r\n.appMarket .market-content {\r\n\tposition: relative;\r\n}\r\n\r\n::-webkit-scrollbar-track {\r\n    border-radius: 3px;\r\n    background-color: transparent;\r\n}\r\n\r\n::-webkit-scrollbar-track-piece {\r\n    display: none;\r\n}\r\n\r\n::-webkit-scrollbar {\r\n    width: 5px;\r\n    background-color: transparent;\r\n\tborder-radius: 3px;\r\n\tdisplay: none;\r\n}\r\n\r\n::-webkit-scrollbar-thumb {\r\n    cursor: pointer;\r\n    border-radius: 9px;\r\n    background-color: var(--scrollbar-color);\r\n}\r\n\r\n.market_content {\r\n\tpadding-bottom: 25px;\r\n\tfont-family: Roboto;\r\n}\r\n\r\n.hero-main {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: space-between;\r\n\tmargin-top: 10px;\r\n}\r\n\r\n.hero_selected_content {\r\n\twidth: 488px;\r\n\theight: 174px;\r\n\tborder: solid 1px var(--catalog-hero-border-color);\r\n\tbackground-color: var(--catalog-hero-background-color);\r\n\tcursor: pointer;\r\n\tpadding: 10px;\r\n\tuser-select: none;\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: flex-start;\r\n}\r\n\r\n.selected-content-title {\r\n\twidth: 100%;\r\n\tfont-size: 20px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding: 0 5px;\r\n\tmargin-bottom: 10px;\r\n}\r\n\r\n.selected-content-message {\r\n\twidth: 477px;\r\n\theight: 130px;\r\n\tfont-size: 14px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\ttext-overflow: clip;\r\n\toverflow: hidden;\r\n\twhite-space: normal;\r\n\tpadding: 0 5px;\r\n}\r\n\r\n.paginator {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n}\r\n\r\n.pagination-oval {\r\n\twidth: 6px;\r\n\theight: 6px;\r\n\tborder: solid 1px var(--catalog-pagination-dots-color);\r\n\tpadding: 1px;\r\n\tmargin: 3px;\r\n\tborder-radius: 5px;\r\n\tcursor: pointer;\r\n}\r\n\r\n.pagination-oval.active {\r\n\tbackground-color: var(--catalog-pagination-dots-color);\r\n}\r\n\r\n.ff-chevron-right, .ff-chevron-left {\r\n\tcolor: var(--catalog-font-color);\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: center;\r\n\tfont-size: 36px;\r\n\tcursor: pointer;\r\n}\r\n\r\n.ff-chevron-left.disabled, .ff-chevron-right.disabled {\r\n\topacity: 0.4;\r\n\tcursor: not-allowed;\r\n}\r\n\r\n.app-card {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: flex-start;\r\n\twidth: 120px;\r\n\theight: 180px;\r\n\tbox-shadow: 1px 2px 4px 0 rgba(0, 0, 0, 0.25);\r\n\tbackground-color: var(--catalog-card-background-color);\r\n\tuser-select:none;\r\n\tcursor: pointer;\r\n\tposition: relative;\r\n}\r\n\r\n.app-card .app-image {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\twidth: 100px;\r\n\theight: 100px;\r\n\tuser-select: none;\r\n\tmargin: 10px 10px 6px 10px;\r\n\tposition: relative;\r\n}\r\n\r\n.app-card .app-images.entitled {\r\n\topacity: 0.4;\r\n}\r\n\r\n.app-card .app-title {\r\n\twidth: 92%;\r\n\theight: 19px;\r\n\tfont-size: 14px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\ttext-overflow: ellipsis;\r\n\twhite-space: nowrap;\r\n\toverflow: hidden;\r\n\tpadding: 5px 0px 5px 5px;\r\n}\r\n\r\n.app-card .app-title.highlighted {\r\n\ttext-decoration: underline;\r\n}\r\n\r\n.app-card .app-title.entitled {\r\n\topacity: 0.4;\r\n}\r\n\r\n.app-card .footer {\r\n\twidth: 89px;\r\n\theight: 26px;\r\n\tfont-size: 10px;\r\n\tfont-weight: var(--secondary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 6px;\r\n\toverflow-y: scroll;\r\n}\r\n\r\n.app-card .footer .app-tags.entitled {\r\n\topacity: 0.4;\r\n}\r\n\r\n.app-card .footer .app-tags .tag-names {\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-card .footer .app-tags .tag-name:hover {\r\n\tcursor: pointer;\r\n\ttext-decoration: underline;\r\n}\r\n\r\n.app-card .ff-check-circle {\r\n\tdisplay: none;\r\n\tposition: absolute;\r\n\tleft: 15px;\r\n\ttop: 15px;\r\n\tz-index: 1;\r\n\tcursor: pointer;\r\n}\r\n\r\n.app-card .ff-check-circle.faded {\r\n\tdisplay: block;\r\n\tcolor: var(--catalog-card-checkmark-unselected-color);\r\n}\r\n\r\n.app-card .ff-check-circle.highlighted {\r\n\tdisplay: block;\r\n\tcolor: var(--catalog-card-checkmark-selected-color);\r\n}\r\n\r\n.app-catalog {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: space-between;\r\n}\r\n\r\n.carousel-main {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: center;\r\n\tmargin-bottom: 14px;\r\n}\r\n\r\n.carousel-main .carousel-header .carousel-title {\r\n\twidth: 90px;\r\n\theight: 19px;\r\n\tfont-size: 14px;\r\n\tfont-weight: var(--tertiary-font-weight);\r\n\tcolor: var(--catalog-section-header-font-color);\r\n\tcursor: pointer;\r\n\tuser-select: none;\r\n}\r\n\r\n.carousel-main .carousel-header .carousel-title.highlight {\r\n\ttext-decoration: underline;\r\n}\r\n\r\n.carousel-main .carousel-content {\r\n\tdisplay: flex !important;\r\n\tflex-direction: row !important;\r\n\tjustify-content: space-between !important;\r\n}\r\n\r\n.carousel-main .carousel-header .see-more {\r\n\twidth: 67px;\r\n  \theight: 23px;\r\n\tbackground-color: var(--button-affirmative-background-color);\r\n\tborder: none;\r\n\tfont-size: 10px;\r\n\tfont-weight: var(--secondary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\tuser-select: none;\r\n\toutline:none;\r\n\tcursor: pointer;\r\n}\r\n\r\n.carousel-main .carousel-header .see-more .button-label {\r\n\twidth: 43px;\r\n\theight: 13px;\r\n}\r\n\r\n.carousel-header {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: space-between;\r\n\talign-items: center;\r\n\tmargin-bottom: 6px;\r\n\tpadding: 0px 46px;\r\n}\r\n\r\n.carousel-header .see-more {\r\n\tfloat: right;\r\n}\r\n\r\n.carousel-header .carousel-title {\r\n\tfloat: left;\r\n}\r\n\r\n.search-main .search-action-items {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: space-between;\r\n\talign-items: center;\r\n\twidth: 92%;\r\n}\r\n\r\n.search-main .button-label {\r\n\tpadding: 0 5px;\r\n}\r\n\r\n.ff-search {\r\n    padding: 0 10px 0 5px;\r\n}\r\n\r\n.search-main {\r\n\tmargin: 10px 15px;\r\n}\r\n\r\n.search-main .ff-search {\r\n\tcolor: var(--catalog-font-color);\r\n}\r\n\r\n.search-input-container {\r\n\tdisplay: flex;\r\n    width: 100%;\r\n}\r\n\r\n.search-main .search-input {\r\n\twidth: 100%;\r\n\tcolor: var(--catalog-font-color);\r\n\theight: 17px;\r\n\tbackground: none;\r\n\tborder: 0;\r\n\tborder-bottom: solid 1px var(--catalog-search-border-color);\r\n\tfont-size: 14px;\r\n\ttransition: .2s ease-in;\r\n}\r\n\r\n@keyframes fadeOut {\r\n\t0% {opacity: 0.9;}\r\n\t25% {opacity: 0.7;}\r\n\t50% {opacity: 0.5;}\r\n\t75% {opacity: 0.2;}\r\n\t100% {opacity: 0; visibility: hidden;}\r\n}\r\n\r\n@keyframes fadeIn {\r\n\t0% {opacity: 0.2;}\r\n\t25% {opacity: 0.3;}\r\n\t50% {opacity: 0.5;}\r\n\t75% {opacity: 0.7;}\r\n\t100% {opacity: 1;}\r\n}\r\n\r\n.search-main .toast-content {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\tvisibility: visible;\r\n\twidth: 166px;\r\n\theight: 25px;\r\n\tfont-size: 12px;\r\n\tfont-weight: var(--secondary-font-weight);\r\n\ttext-align: center;\r\n\tcolor: var(--catalog-font-color);\r\n\tbackground-color: rgba(60, 76, 88, 1.0);\r\n\tz-index: 99;\r\n\tleft: 0;\r\n\tright: 0;\r\n\tmargin: auto;\r\n\tposition: absolute;\r\n\tanimation-name: fadeIn;\r\n\tanimation-duration: 0.5s;\r\n\tcursor: default;\r\n\tpointer-events: none;\r\n}\r\n\r\n.search-main .toast-content.success {\r\n\tborder: 3px solid var(--catalog-card-checkmark-selected-color);\r\n}\r\n\r\n.search-main .toast-content.error {\r\n\tborder: 3px solid var(--secondary-negative-color);\r\n}\r\n\r\n.search-main .toast-content.not-shown {\r\n\topacity: 0;\r\n\tanimation-name: fadeOut;\r\n\tanimation-duration: 2s;\r\n}\r\n\r\n.search-main .toast-content .toast {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\talign-items: center;\r\n}\r\n\r\n.search-main .toast-content .ff-check-mark {\r\n\tcolor: var(--catalog-card-checkmark-selected-color);\r\n}\r\n\r\n.search-main .toast-content .ff-close {\r\n\tcolor: var(--secondary-negative-color);\r\n}\r\n\r\n.search-main .search-input:focus {\r\n\tborder-bottom: 1px solid var(--catalog-search-active-border-color);\r\n\toutline: none;\r\n}\r\n\r\n.search-main .search-back {\r\n\tborder: none;\r\n\tcolor: var(--catalog-font-color);\r\n\tbackground-color: inherit;\r\n\tcursor: pointer;\r\n\tfont-size: 12px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\tuser-select: none;\r\n}\r\n\r\n.search-main .tag-selector {\r\n\tpadding-left: 5px;\r\n\tuser-select: none;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-label {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\talign-items: center;\r\n\twidth: 51px;\r\n\theight: 17px;\r\n\tborder-radius: 2px;\r\n\tbackground-color: var(--tag-backgrond-color);\r\n\tfont-size: 10px;\r\n\tfont-weight: var(--secondary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\tcursor: pointer;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-label .ff-tag {\r\n\twidth: 10px;\r\n\theight: 10px;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-label .label-text {\r\n\twidth: 22px;\r\n\theight: 13px;\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-content {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\twidth: 132px;\r\n\theight: 214px;\r\n\tborder-radius: 3px;\r\n\tbackground-color: var(--tag-backgrond-color);\r\n\ttext-overflow: ellipsis;\r\n\toverflow-y: auto;\r\n\tz-index: 1;\r\n\tposition: absolute;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-content .tag-selector-item {\r\n\twidth: 103px;\r\n\theight: 19px;\r\n\tfont-size: 11px;\r\n\tcolor: var(--catalog-font-color);\r\n\talign-self: center;\r\n}\r\n\r\n.search-main .tag-selector .tag-selector-content.hidden {\r\n\tdisplay: none;\r\n}\r\n\r\n.app-results .app-results-no-results {\r\n\theight: 21px;\r\n\tfont-size: 16px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\ttext-align: center;\r\n\tcolor: var(--catalog-font-color);\r\n\tuser-select: none;\r\n\tdisplay: flex;\r\n\tjustify-content: center;\r\n\tcursor: default;\r\n}\r\n\r\n.label-bar {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: flex-start;\r\n\tflex-wrap: wrap;\r\n\tmargin-top: 8px;\r\n}\r\n\r\n.app-results {\r\n\tpadding: 0 32px;\r\n\tdisplay: flex;\r\n\tjustify-content: center;\r\n}\r\n\r\n.app-showcase {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: center;\r\n\tfont-family: Roboto;\r\n}\r\n\r\n.app-showcase .app-warning {\r\n\tdisplay: flex;\r\n\talign-self: center;\r\n\theight: 16px;\r\n\tfont-size: 12px;\r\n\tfont-weight: var(--tertiary-font-weight);\r\n\tletter-spacing: normal;\r\n\tcolor: var(--secondary-negative-color);\r\n\tmargin-bottom: 8px\r\n}\r\n\r\n.app-showcase .ff-alert {\r\n\tfont-size: 14px;\r\n\tdisplay: flex;\r\n}\r\n\r\n.app-showcase .app-warning-wrapper {\r\n\tdisplay: flex;\r\n\talign-items: center;\r\n}\r\n\r\n.app-showcase .app-warning .app-warning-text {\r\n\tpadding: 0 5px;\r\n}\r\n\r\n.app-showcase .header {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: space-between;\r\n\tpadding: 5px 0;\r\n\tmargin: 0 49px;\r\n}\r\n\r\n.app-showcase .header .icon-title-container {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\talign-items: center;\r\n}\r\n\r\n.app-showcase .header .header-icon {\r\n\twidth: 31px;\r\n\theight: 31px;\r\n\tmargin-right: 8px;\r\n\tuser-select: none;\r\n}\r\n\r\n.app-showcase .header .appName {\r\n\tpadding-right: 12px;\r\n  \tfont-size: 14px;\r\n  \tfont-weight: var(--primary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n}\r\n\r\n.app-showcase .header .action-button-container {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tfont-size: 12px;\r\n\tfont-weight: var(--secondary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n}\r\n\r\n.app-showcase .header .action-button-container .remove-button {\r\n\theight: 16px;\r\n\tpadding: 5px 0;\r\n\tcursor: pointer;\r\n}\r\n\r\n.app-showcase .header .action-button {\r\n\twidth: 83px;\r\n\theight: 30px;\r\n\tmargin-left: 5px;\r\n\tbackground-color: var(--blue6);\r\n\tborder: none;\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n    justify-content: center;\r\n\talign-items: center;\r\n\tuser-select: none;\r\n\toutline: none;\r\n\ttransition: .2s ease-in;\r\n\tcursor: pointer;\r\n}\r\n\r\n.action-button .ff-plus {\r\n\tmargin-top: 3px;\r\n    padding-right: 2px;\r\n}\r\n\r\n.app-showcase .header .action-button.disabled {\r\n\tbackground-color: var(--catalog-disabled-button-background-color);\r\n}\r\n\r\n.app-showcase .header .action-button.remove {\r\n\tbackground-color: var(--red6);\r\n}\r\n\r\n.app-showcase .header .action-button.open:hover {\r\n\tbackground-color: var(--blue7);\r\n}\r\n\r\n.app-showcase .header .action-button.remove:hover {\r\n\tbackground-color: var(--red7);\r\n}\r\n\r\n.remove-button {\r\n  \tfont-size: 12px;\r\n  \tfont-weight: var(--primary-font-weight);\r\n\tcolor: var(--catalog-font-color);\r\n\tfont-family: Roboto;\r\n\tdisplay: flex;\r\n\tjustify-content: flex-end;\r\n\talign-items: center;\r\n\tcursor: pointer;\r\n\toutline: none;\r\n}\r\n\r\n.app-showcase .header .action-button-label {\r\n\tdisplay: flex;\r\n\talign-items: center;\r\n\twidth: 100%;\r\n\theight: 16px;\r\n\tfont-size: 12px;\r\n\tfont-weight: var(--primary-font-weight);\r\n\tfont-family: Roboto;\r\n\ttext-align: center;\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .image-carousel-container {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\tpadding: 5px 0;\r\n\tuser-select: none;\r\n}\r\n\r\n.app-showcase .image-carousel-image {\r\n\tpadding: 5px 0;\r\n\theight: 125px;\r\n\twidth: 125px;\r\n}\r\n\r\n.app-showcase .app-notes {\r\n\tdisplay: flex;\r\n\tflex-direction: column;\r\n\tjustify-content: flex-start;\r\n  \tfont-size: 12px;\r\n\tpadding: 5px 0;\r\n\tmargin: 0 28px 10px 28px;\r\n}\r\n\r\n.app-notes p {\r\n\tmargin: 0;\r\n}\r\n\r\n.app-showcase a {\r\n\tcolor: var(--blue2);\r\n}\r\n\r\n.app-showcase a:visited {\r\n\tcolor: var(--blue5);\r\n}\r\n\r\n.app-showcase .app-notes .developer-content {\r\n\talign-self: flex-start;\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .showcase-label {\r\n\tdisplay: flex;\r\n\twidth: 100%;\r\n\theight: 15px;\r\n\tfont-weight: var(--tertiary-font-weight);\r\n\tfont-size: 14px;\r\n\tcolor: var(--catalog-section-header-font-color);\r\n\tpadding-bottom: 5px;\r\n}\r\n\r\n.app-showcase .description-content {\r\n\twidth: 534px;\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .release-notes-content {\r\n\twidth: 540px;\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .version-content {\r\n\tcolor: var(--catalog-font-color);\r\n\twidth: 50%;\r\n}\r\n\r\n.app-showcase .updated-content {\r\n\tcolor: var(--catalog-font-color);\r\n\twidth: 50%;\r\n}\r\n\r\n.app-showcase .support-content {\r\n\tcolor: var(--catalog-font-color);\r\n\twidth: 50%;\r\n}\r\n\r\n.app-showcase .tags-content {\r\n\twidth: 50%;\r\n}\r\n\r\n.app-showcase .dev-notes {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: space-between;\r\n  \tfont-size: 12px;\r\n\tpadding: 5px 0;\r\n\tmargin-left: 28px;\r\n}\r\n\r\n.app-showcase .version {\r\n\twidth: 80px;\r\n  \theight: 15px;\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .updated {\r\n\twidth: 115px;\r\n\theight: 15px;\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .support-content .support {\r\n\tcolor: var(--catalog-font-color);\r\n\tpadding-right: 8px;\r\n\tpadding-left: 5px;\r\n}\r\n\r\n.app-showcase .tags {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tflex-wrap: wrap;\r\n}\r\n\r\n.app-showcase .tag-label {\r\n\twidth: auto;\r\n  \theight: auto;\r\n\tborder-radius: 2px;\r\n\tpadding: 3px 5px;\r\n\tbackground-color: var(--slate2);\r\n\tmargin: 0 4px 4px 0;\r\n\tuser-select: none;\r\n\tcursor: pointer;\r\n}\r\n\r\n.app-showcase .tag-label .label-content {\r\n\tfont-size: 10px;\r\n\tpadding: 5px;\r\n\tcolor: var(--catalog-font-color);\r\n}\r\n\r\n.modal {\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tleft: 0;\r\n\twidth: 100%;\r\n\theight: 100%;\r\n\tbackground: rgba(0, 0, 0, 0.6);\r\n}\r\n\r\n.modal-main {\r\n\tposition: fixed;\r\n\twidth: 80%;\r\n\theight: auto;\r\n\ttop: 50%;\r\n\tleft: 50%;\r\n\ttransform: translate(-50%, -50%)\r\n}\r\n\r\n.modal.open {\r\n\tdisplay: block;\r\n}\r\n\r\n.modal.closed {\r\n\tdisplay: none;\r\n}\r\n\r\n.modal .modal-image {\r\n\tdisplay: flex;\r\n\tjustify-content: center;\r\n\twidth: 453px;\r\n\theight: 311px;\r\n}", ""]);



/***/ }),

/***/ 45:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__modules_AppDirectory__ = __webpack_require__(84);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__modules_FDC3__ = __webpack_require__(85);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__appStore__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_path__ = __webpack_require__(112);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_path___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_path__);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/**
 * Async function to fetch apps from the FDC3 api (appD)
 */
let getApps = (() => {
	var _ref = _asyncToGenerator(function* () {
		let apps = yield appd.getAll(function (err, apps) {
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
				field: "apps",
				value: apps
			});
		});
		return apps;
	});

	return function getApps() {
		return _ref.apply(this, arguments);
	};
})();

/**
 * Call to appD to get the list of all tags
 */


let getTags = (() => {
	var _ref2 = _asyncToGenerator(function* () {
		let tags = yield appd.getTags(function (err, tags) {
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
				field: "tags",
				value: tags
			});
		});
		return tags;
	});

	return function getTags() {
		return _ref2.apply(this, arguments);
	};
})();

/**
 * Function to "install" an app. Adds the id to a list of installed apps
 * @param {string} name The name of the app
 */


let addApp = (() => {
	var _ref3 = _asyncToGenerator(function* (id) {
		let { activeApp, installed, apps } = data;
		const appID = id;
		let app = apps.find(function (app) {
			return app.appId === appID;
		});
		const folder = data.activeFolder;

		if (app === undefined) {
			console.warn("App not found.");
			return;
		}

		installed[appID] = {
			appID,
			tags: app.tags,
			name: app.title ? app.title : app.name,
			url: app.url,
			type: "component",
			component: {},
			window: {
				windowType: app.windowType || "OpenFinWindow"
			},
			foreign: {
				components: {
					"App Launcher": {
						"launchableByUser": true
					},
					"Window Manager": {
						title: app.title ? app.title : app.name
					}
				}
			}
		};

		const appConfig = installed[appID];
		let applicationRoot = "";
		if (appConfig.url && appConfig.url.includes("$applicationRoot")) {
			//we may use this if we put macros in the stored URLs on the FDC3 server. commented out for now.
			applicationRoot = (yield FSBL.Clients.ConfigClient.getValue({ field: "finsemble.applicationRoot" })).data;
			appConfig.url = appConfig.url.replace("$applicationRoot", "");
			appConfig.url = applicationRoot + appConfig.url;
			appConfig.window.url = appConfig.url;
		}

		if (typeof appConfig.url === "undefined") {
			//If there is no url, it will be set to the 'unknown component' inside of the Launcher.
			delete appConfig.url;
			delete appConfig.window.url;
		}

		if (typeof app.manifest !== "object") {
			appConfig.manifest = _extends({}, appConfig);
		}
		let MY_APPS = data.defaultFolder;
		let folders = data.folders;

		data.folders[MY_APPS].apps[appID] = appConfig;
		data.folders[folder].apps[appID] = appConfig;
		FSBL.Clients.LauncherClient.registerComponent({
			componentType: appConfig.name,
			manifest: appConfig.manifest
		}, function (err, response) {
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValues([{
				field: "activeApp",
				value: activeApp
			}, {
				field: "appDefinitions",
				value: installed
			}, {
				field: "appFolders.folders",
				value: folders
			}]);
		});
		/*FSBL.Clients.LauncherClient.addUserDefinedComponent(installed[appID], (compAddErr) => {
  	if (compAddErr && compAddErr.indexOf('already exists') === -1) {
             //TODO: We need to handle the error here. If the component failed to add, we should probably fall back and not add to launcher
             console.log('componentAddErr: ', compAddErr);
  		console.warn("Failed to add new app");
         } else {
             getStore().setValues([
                 {
                     field: 'activeApp',
                     value: activeApp
                 },
                 {
                     field: 'appDefinitions',
                     value: installed
                 },
                 {
                     field: 'appFolders.folders',
                     value: folders
                 }
             ]);
         }
  });*/
	});

	return function addApp(_x) {
		return _ref3.apply(this, arguments);
	};
})();

/**
 * Function to "uninstall" an app. Removes the id from a list of installed apps
 * @param {string} name The name of the app
 */


function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/*!
* Copyright 2018 by ChartIQ, Inc.
* All rights reserved.
*/




/* harmony default export */ __webpack_exports__["a"] = ({
	initialize,
	getApps,
	getFilteredApps,
	clearFilteredApps,
	searchApps,
	getActiveTags,
	getTags,
	addTag,
	removeTag,
	clearTags,
	addApp,
	removeApp,
	openApp,
	clearApp,
	getInstalledApps,
	getActiveApp
});

let ToolbarStore;
const data = {};
let FDC3Client;
let appd;

function initialize(done = Function.prototype) {
	FSBL.Clients.ConfigClient.getValue({ field: "finsemble.appDirectoryEndpoint" }, function (err, appDirectoryEndpoint) {
		FDC3Client = new __WEBPACK_IMPORTED_MODULE_1__modules_FDC3__["a" /* default */]({ url: appDirectoryEndpoint });
		appd = new __WEBPACK_IMPORTED_MODULE_0__modules_AppDirectory__["a" /* default */](FDC3Client);

		const store = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])();
		data.apps = store.values.apps;
		store.getValue({ field: "appFolders.folders" }, (err, folders) => {
			data.folders = folders;
			store.addListener({ field: "appFolders.folders" }, (err, dt) => data.folders = dt.value);
		});
		store.getValue({ field: "activeFolder" }, (err, active) => {
			data.activeFolder = active;
			store.addListener({ field: "activeFolder" }, (err, dt) => data.activeFolder = dt.value);
		});
		store.getValue({ field: "defaultFolder" }, (err, folder) => {
			data.defaultFolder = folder;
		});
		data.installed = store.values.appDefinitions;
		data.tags = store.values.tags;
		data.filteredApps = store.values.filteredApps;
		data.activeTags = store.values.activeTags;
		data.activeApp = store.values.activeApp;
		data.MY_APPS = store.values.defaultFolder;

		store.addListener({ field: "apps" }, (err, dt) => data.apps = dt.value);
		store.addListener({ field: "appDefinitions" }, (err, dt) => data.installed = dt.value);
		store.addListener({ field: "tags" }, (err, dt) => data.tags = dt.value);
		store.addListener({ field: "activeApp" }, (err, dt) => data.activeApp = dt.value);
		store.addListener({ field: "activeTags" }, (err, dt) => data.activeTags = dt.value);
		store.addListener({ field: "filteredApps" }, (err, dt) => data.filteredApps = dt.value);
		getToolbarStore(done);
	});
}

function getToolbarStore(done) {
	FSBL.Clients.DistributedStoreClient.getStore({ global: true, store: "Finsemble-Toolbar-Store" }, (err, toolbarStore) => {
		ToolbarStore = toolbarStore;
		done();
	});
}

/**
 * Private function to add an active tag. This will filter apps based on tags
 * NOTE: This will need to use search
 * @param {string} tag The name of the tag
 */
function _addActiveTag(tag) {

	let { apps, activeTags } = data;

	activeTags.push(tag);

	let newApps = apps.filter(app => {
		for (let i = 0; i < activeTags.length; i++) {
			let tag = activeTags[i].trim();
			if (app.tags.includes(tag)) {
				return true;
			}
		}
	});

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValues([{
		field: "filteredApps",
		value: newApps
	}, {
		field: "activeTags",
		value: activeTags
	}]);
}

/**
 * Private function to remove an active tag. This will filter apps based on tags
 * NOTE: This will need to use search
 * @param {string} tag The name of the tag
 */
function _removeActiveTag(tag) {

	let { activeTags, apps } = data;

	let newActiveTags = activeTags.filter(currentTag => {
		return currentTag !== tag;
	});

	let newApps = apps.filter(app => {
		for (let i = 0; i < newActiveTags.length; i++) {
			let tag = activeTags[i].trim();
			if (app.tags.includes(tag)) {
				return true;
			}
		}
	});

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValues([{
		field: "activeTags",
		value: newActiveTags
	}, {
		field: "filteredApps",
		value: newApps
	}]);
}

/**
 * Clears all active tags
 */
function _clearActiveTags() {
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
		field: "activeTags",
		value: []
	});
}function removeApp(id) {
	let { installed, folders } = data;

	ToolbarStore.removeValue({ field: "pins." + installed[id].name.replace(/[.]/g, "^DOT^") }, (err, res) => {
		if (err) {
			console.warn("Error removing pin for deleted app");
			return;
		}
		FSBL.Clients.LauncherClient.unRegisterComponent({ componentType: installed[id].name });
		for (const key in data.folders) {
			if (folders[key].apps[id]) {
				delete folders[key].apps[id];
			}
		}

		//Delete the app from the list
		delete installed[id];

		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValues([{
			field: "appDefinitions",
			value: installed
		}, {
			field: "appFolders.folders",
			value: folders
		}]);
	});
}

/**
 * Function to set the 'active app' for the catalog.
 * @param {string} id The app id to show as the actively showcasing app
 */
function openApp(id) {
	let apps = data.apps;

	let index = apps.findIndex(app => {
		return app.appId === id;
	});

	if (index > -1) {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
			field: "activeApp",
			value: id
		});
	}
}

function clearApp() {
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
		field: "activeApp",
		value: null
	});
}

function getActiveApp() {
	return data.activeApp;
}

/**
 * Retrieves a list of installed apps by id
 */
function getInstalledApps() {
	return data.installed;
}

/**
 * Gets the list of filtered apps (when searching/filtering by tags)
 */
function getFilteredApps() {
	return data.filteredApps;
}

/**
 * Clears the list of filtered apps
 */
function clearFilteredApps() {
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
		field: "filteredApps",
		value: []
	});
}

/**
 * Gets the list of active tags (these are tags that are actively filtering the content list)
 */
function getActiveTags() {
	return data.activeTags;
}

/**
 * Adds an 'active tag' to the list of filtered tags
 * @param {string} tag The tag name
 */
function addTag(tag) {
	_addActiveTag(tag);
}

/**
 * Removes an 'active tag' from the list of filtered tags
 * @param {string} tag The tag name
 */
function removeTag(tag) {
	_removeActiveTag(tag);
}

/**
 * Removes all tags from the active tags list
 */
function clearTags() {
	_clearActiveTags();
}

/**
 * Calls appD to search the directory of apps based on search text and tag names
 * @param {string} terms The search terms provided by the user
 */
function searchApps(terms, cb = Function.prototype) {
	if (!terms || terms.length === 0) {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
			field: "filteredApps",
			value: []
		});
		return cb();
	}
	let activeTags = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().getValue({
		field: "activeTags"
	}, err => {
		if (err) console.warn("Error getting active tags");
	});

	//TODO: The appd search endpoint returns all apps always
	appd.search({ text: terms, tags: activeTags }, (err, data) => {
		if (err) console.log("Failed to search apps");
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
			field: "filteredApps",
			value: data
		});
		cb();
	});
}

/**
 * Async function to call the launcher client to get a list of added apps
 */
function fetchInstalledApps() {
	let addedApps = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().getValue({
		field: "apps"
	});

	let installed = [];
	if (apps.length > 0) installed.push([apps[0].appId]);

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__appStore__["a" /* getStore */])().setValue({
		field: "installed",
		value: installed
	});
}

/***/ }),

/***/ 52:
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(2);

/***/ }),

/***/ 65:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(90);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {"hmr":true}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(7)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/dist/cjs.js!./style.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/dist/cjs.js!./style.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 67:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return createStore; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getStore; });
/*!
* Copyright 2018 by ChartIQ, Inc.
* All rights reserved.
*/


const defaultValues = [{
	field: "apps",
	value: []
}, {
	field: "filteredApps",
	value: []
}, {
	field: "activeTags",
	value: []
}, {
	field: "activeApp",
	value: null
}];

let appCatalogStore;

function createStore(cb) {
	FSBL.Clients.DistributedStoreClient.getStore({ store: "Finsemble-AppLauncher-Store", global: true }, (err, store) => {
		appCatalogStore = store;
		appCatalogStore.setValues(defaultValues);
		cb(null, appCatalogStore);
	});
}

function getStore() {
	return appCatalogStore;
}

/***/ }),

/***/ 7:
/***/ (function(module, exports, __webpack_require__) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var stylesInDom = {};

var	memoize = function (fn) {
	var memo;

	return function () {
		if (typeof memo === "undefined") memo = fn.apply(this, arguments);
		return memo;
	};
};

var isOldIE = memoize(function () {
	// Test for IE <= 9 as proposed by Browserhacks
	// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
	// Tests for existence of standard globals is to allow style-loader
	// to operate correctly into non-standard environments
	// @see https://github.com/webpack-contrib/style-loader/issues/177
	return window && document && document.all && !window.atob;
});

var getElement = (function (fn) {
	var memo = {};

	return function(selector) {
		if (typeof memo[selector] === "undefined") {
			var styleTarget = fn.call(this, selector);
			// Special case to return head of iframe instead of iframe itself
			if (styleTarget instanceof window.HTMLIFrameElement) {
				try {
					// This will throw an exception if access to iframe is blocked
					// due to cross-origin restrictions
					styleTarget = styleTarget.contentDocument.head;
				} catch(e) {
					styleTarget = null;
				}
			}
			memo[selector] = styleTarget;
		}
		return memo[selector]
	};
})(function (target) {
	return document.querySelector(target)
});

var singleton = null;
var	singletonCounter = 0;
var	stylesInsertedAtTop = [];

var	fixUrls = __webpack_require__(18);

module.exports = function(list, options) {
	if (typeof DEBUG !== "undefined" && DEBUG) {
		if (typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};

	options.attrs = typeof options.attrs === "object" ? options.attrs : {};

	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (!options.singleton && typeof options.singleton !== "boolean") options.singleton = isOldIE();

	// By default, add <style> tags to the <head> element
	if (!options.insertInto) options.insertInto = "head";

	// By default, add <style> tags to the bottom of the target
	if (!options.insertAt) options.insertAt = "bottom";

	var styles = listToStyles(list, options);

	addStylesToDom(styles, options);

	return function update (newList) {
		var mayRemove = [];

		for (var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];

			domStyle.refs--;
			mayRemove.push(domStyle);
		}

		if(newList) {
			var newStyles = listToStyles(newList, options);
			addStylesToDom(newStyles, options);
		}

		for (var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];

			if(domStyle.refs === 0) {
				for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();

				delete stylesInDom[domStyle.id];
			}
		}
	};
};

function addStylesToDom (styles, options) {
	for (var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];

		if(domStyle) {
			domStyle.refs++;

			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}

			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];

			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}

			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles (list, options) {
	var styles = [];
	var newStyles = {};

	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = options.base ? item[0] + options.base : item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};

		if(!newStyles[id]) styles.push(newStyles[id] = {id: id, parts: [part]});
		else newStyles[id].parts.push(part);
	}

	return styles;
}

function insertStyleElement (options, style) {
	var target = getElement(options.insertInto)

	if (!target) {
		throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
	}

	var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];

	if (options.insertAt === "top") {
		if (!lastStyleElementInsertedAtTop) {
			target.insertBefore(style, target.firstChild);
		} else if (lastStyleElementInsertedAtTop.nextSibling) {
			target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			target.appendChild(style);
		}
		stylesInsertedAtTop.push(style);
	} else if (options.insertAt === "bottom") {
		target.appendChild(style);
	} else if (typeof options.insertAt === "object" && options.insertAt.before) {
		var nextSibling = getElement(options.insertInto + " " + options.insertAt.before);
		target.insertBefore(style, nextSibling);
	} else {
		throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");
	}
}

function removeStyleElement (style) {
	if (style.parentNode === null) return false;
	style.parentNode.removeChild(style);

	var idx = stylesInsertedAtTop.indexOf(style);
	if(idx >= 0) {
		stylesInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement (options) {
	var style = document.createElement("style");

	options.attrs.type = "text/css";

	addAttrs(style, options.attrs);
	insertStyleElement(options, style);

	return style;
}

function createLinkElement (options) {
	var link = document.createElement("link");

	options.attrs.type = "text/css";
	options.attrs.rel = "stylesheet";

	addAttrs(link, options.attrs);
	insertStyleElement(options, link);

	return link;
}

function addAttrs (el, attrs) {
	Object.keys(attrs).forEach(function (key) {
		el.setAttribute(key, attrs[key]);
	});
}

function addStyle (obj, options) {
	var style, update, remove, result;

	// If a transform function was defined, run it on the css
	if (options.transform && obj.css) {
	    result = options.transform(obj.css);

	    if (result) {
	    	// If transform returns a value, use that instead of the original css.
	    	// This allows running runtime transformations on the css.
	    	obj.css = result;
	    } else {
	    	// If the transform function returns a falsy value, don't add this css.
	    	// This allows conditional loading of css
	    	return function() {
	    		// noop
	    	};
	    }
	}

	if (options.singleton) {
		var styleIndex = singletonCounter++;

		style = singleton || (singleton = createStyleElement(options));

		update = applyToSingletonTag.bind(null, style, styleIndex, false);
		remove = applyToSingletonTag.bind(null, style, styleIndex, true);

	} else if (
		obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function"
	) {
		style = createLinkElement(options);
		update = updateLink.bind(null, style, options);
		remove = function () {
			removeStyleElement(style);

			if(style.href) URL.revokeObjectURL(style.href);
		};
	} else {
		style = createStyleElement(options);
		update = applyToTag.bind(null, style);
		remove = function () {
			removeStyleElement(style);
		};
	}

	update(obj);

	return function updateStyle (newObj) {
		if (newObj) {
			if (
				newObj.css === obj.css &&
				newObj.media === obj.media &&
				newObj.sourceMap === obj.sourceMap
			) {
				return;
			}

			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;

		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag (style, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (style.styleSheet) {
		style.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = style.childNodes;

		if (childNodes[index]) style.removeChild(childNodes[index]);

		if (childNodes.length) {
			style.insertBefore(cssNode, childNodes[index]);
		} else {
			style.appendChild(cssNode);
		}
	}
}

function applyToTag (style, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		style.setAttribute("media", media)
	}

	if(style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		while(style.firstChild) {
			style.removeChild(style.firstChild);
		}

		style.appendChild(document.createTextNode(css));
	}
}

function updateLink (link, options, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	/*
		If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
		and there is no publicPath defined then lets turn convertToAbsoluteUrls
		on by default.  Otherwise default to the convertToAbsoluteUrls option
		directly
	*/
	var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

	if (options.convertToAbsoluteUrls || autoFixUrls) {
		css = fixUrls(css);
	}

	if (sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = link.href;

	link.href = URL.createObjectURL(blob);

	if(oldSrc) URL.revokeObjectURL(oldSrc);
}


/***/ }),

/***/ 83:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__stores_storeActions__ = __webpack_require__(45);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/


//data


/**
 * The card that displays on any page with information about an app. Clicking on it will lead to the AppShowcase or install (if the check is clicked)
 * @param {object} props Component props
 * @param {object} props...card The entire object that belongs to a single app. See FDC app directory.
 * @param {boolean} props.entitled If true, the app cannot be installed by this user, only viewed
 * @param {boolean} props.installed If true the app is installed on this local fsbl
 */
class AppCard extends __WEBPACK_IMPORTED_MODULE_0_react__["Component"] {
	constructor(props) {
		super(props);
		this.state = {
			checkShown: this.props.installed === true ? true : false,
			checkHighlighted: false,
			titleUnderlined: false,
			appName: this.props.title || this.props.name,
			id: this.props.appId,
			entitled: this.props.entitled ? this.props.entitled : false,
			tags: this.props.tags
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.toggleHighlight = this.toggleHighlight.bind(this);
		this.toggleTitleUnderline = this.toggleTitleUnderline.bind(this);
		this.showCheck = this.showCheck.bind(this);
		this.hideCheck = this.hideCheck.bind(this);
		this.openAppShowcase = this.openAppShowcase.bind(this);
		this.addApp = this.addApp.bind(this);
		this.removeApp = this.removeApp.bind(this);
		this.addTag = this.addTag.bind(this);
	}
	componentDidMount() {
		const list = this.tagNamesList;
		const footer = this.footer;
		if (list.offsetHeight >= footer.scrollHeight + 5) {
			let newTags = this.state.tags.slice(0, 2);
			newTags.push("more");
			this.setState({
				tags: newTags
			});
		}
	}
	/**
  * Toggles the highlight state of the check mark for installing an app
  */
	toggleHighlight() {
		this.setState({
			checkHighlighted: !this.state.checkHighlighted
		});
	}
	/**
  * Toggles the 'highlight' state of the app title. On mouse over, the title is underlined to show that its a link
  */
	toggleTitleUnderline() {
		this.setState({
			titleUnderlined: !this.state.titleUnderlined
		});
	}
	/**
  * Shows the check mark for adding/removing an app
  */
	showCheck() {
		this.setState({
			checkShown: true
		});
	}
	/**
  * Hides the check mark for adding/removing an app
  */
	hideCheck() {
		//Don't hide if installed. Stay green and showing
		if (this.props.installed === false) {
			this.setState({
				checkShown: false
			});
		}
	}
	/**
  * Calls parent passed function to open the app showcase for the supplied app
  */
	openAppShowcase() {
		this.props.viewAppShowcase(this.state.id);
	}
	/**
  * Prevents bubbling (which would open the app showcase), then calls to add an app
  * @param {object} e React Synthetic event
  */
	addApp(e) {
		e.preventDefault();
		e.stopPropagation();
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addApp(this.state.id);
	}
	/**
  * Prevents bubbling (which would open the app showcase), then calls to remove an app
  * @param {object} e React Synthetic event
  */
	removeApp(e) {
		e.preventDefault();
		e.stopPropagation();
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].removeApp(this.state.id);
	}
	/**
  * Prevents bubbling (which would open the app showcase), then calls to add a filtering tag
  * @param {string} name The tag name to add
  * @param {object} e React Synthetic event
  */
	addTag(name, e) {
		e.preventDefault();
		e.stopPropagation();
		__WEBPACK_IMPORTED_MODULE_1__stores_storeActions__["a" /* default */].addTag(name);
	}
	render() {
		let imageUrl = this.props.images !== undefined ? this.props.images[0].url : "../assets/placeholder.svg";

		let { appName, checkShown } = this.state;

		let imageIconClasses = "ff-check-circle";
		if (this.state.checkHighlighted || this.props.installed) imageIconClasses += " highlighted";else imageIconClasses += " faded";

		let titleClass = this.state.titleUnderlined ? "app-title highlighted" : "app-title";

		let entitled = this.state.entitled ? " entitled" : "";

		let appAction = this.props.installed ? this.removeApp : this.addApp;

		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			"div",
			{ className: "app-card", onClick: this.openAppShowcase, onMouseEnter: this.showCheck, onMouseLeave: this.hideCheck },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "app-image-container" },
				!entitled || !checkShown ? null : __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: imageIconClasses, onMouseEnter: this.toggleHighlight, onMouseLeave: this.toggleHighlight, onClick: appAction }),
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("img", { className: 'app-image' + entitled, src: imageUrl })
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: titleClass, onMouseEnter: this.toggleTitleUnderline, onMouseLeave: this.toggleTitleUnderline },
				appName
			),
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				"div",
				{ className: "footer", ref: el => {
						this.footer = el;
					} },
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
					"span",
					{ className: "app-tags" + entitled },
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement("i", { className: "ff-tag" }),
					__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						"span",
						{ className: "tag-names", ref: el => {
								this.tagNamesList = el;
							} },
						this.state.tags.map((tag, i) => {
							if (tag === "more") {
								return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
									"span",
									{ key: 3, className: "tag-name", style: { cursor: 'pointer', textDecoration: 'underline' }, onClick: this.openAppShowcase },
									"More"
								);
							}

							return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
								"span",
								{ key: i, className: "tag-name", onClick: this.addTag.bind(this, tag) },
								tag[0].toUpperCase() + tag.substring(1),
								i !== this.props.tags.length - 1 ? ", " : null
							);
						})
					)
				)
			)
		);
	}
}

/* harmony default export */ __webpack_exports__["a"] = (AppCard);

/***/ }),

/***/ 84:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

/**
 * Copyright 2018 by ChartIQ, Inc.
 * All rights reserved.
 * To be implemented..
 */
class AppDirectory {
    constructor(client) {
        return client;
    }

}
/* harmony export (immutable) */ __webpack_exports__["a"] = AppDirectory;


/***/ }),

/***/ 85:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * Copyright 2018 by ChartIQ, Inc.
 * All rights reserved.
 * 
 * FDC3 App directory client, I will be using fetch()
 * to make calls to the appd web service, even though I'm
 * not sure where did fetch() come from, will investigate later
 */
class FDC3 {
	constructor(config = {}, creds = {}) {
		if (!config.url) {
			throw new Error("Please specify the url of the app directory.");
		};
		this.creds = creds;
		this.config = {
			url: config.url.replace(/\/+$/, "")
		};
	}
	/**
     * Http get wrapper
     * @param {string} path The restful method path
     * @param {function} done The callback function
     */
	_get(path, done) {

		fetch(this.config.url + path, {
			method: "GET"
		}).then(response => {
			response.json().then(data => {
				// We are expecting 200 here for data
				if (response.status !== 200) {
					// We have a problem, data as error message
					done(data);
				} else {
					// All good, no problem
					done(null, data);
				}
			});
		}).catch(error => {
			done({
				message: `Request failed ${error.message}`
			});
		});
	}

	/**
     * 
     * @param {string} path The restful method path
     * @param {object} params The post data
     * @param {function} done The callback function
     */
	_post(path, params, done) {
		fetch(this.config.url + path, {
			method: "POST",
			body: JSON.stringify(params),
			headers: {
				"Content-Type": "application/json"
			}
		}).then(response => {
			response.json().then(data => {
				// We are expecting 200 here for data
				if (response.status !== 200) {
					// We have a problem, data as error message
					done(data);
				} else {
					// All good, no problem
					done(null, data);
				}
			});
		}).catch(error => {
			done({
				message: `Request failed ${error.message}`
			});
		});
	}
	/**
     * Returns all applications
     * @param {function} callback The optional callback function
     */
	getAll(callback) {
		return new Promise((resolve, reject) => {
			this._get("/apps/", (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data.applications);
				}
				if (callback) {
					callback(error, !error && data.applications);
				}
			});
		});
	}
	/**
     * Returns a single application in results
     * @param {string} appId The app id
     */
	get(appId, callback) {
		return new Promise((resolve, reject) => {
			this._get("/apps/" + appId, (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data.applications[0]);
				}
				if (callback) {
					callback(error, !error && data.applications[0]);
				}
			});
		});
	}
	/**
     * Returns unique tags
     * @param {function} callback The optional callback function
     */
	getTags(callback) {
		return new Promise((resolve, reject) => {
			this._get("/tags/", (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data.tags);
				}
				if (callback) {
					callback(error, !error && data.tags);
				}
			});
		});
	}
	/**
     * Returns a list of applications based on text and filter
     * @param {object} params The search criteria 
     * @param {function} callback The callback function
     * @example search({text: 'blah', filter: {tag: 'newrelease'}})
     */
	search(params, callback) {
		return new Promise((resolve, reject) => {
			this._post("/apps/search", params, (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data.applications);
				}
				if (callback) {
					callback(error, !error && data.applications);
				}
			});
		});
	}
}
/* harmony export (immutable) */ __webpack_exports__["a"] = FDC3;


/***/ }),

/***/ 86:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__style_css__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__style_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__style_css__);
/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/
/**
 * This component is the name of a component and a pin that will pin that component to all toolbars.
 *
 */




const Tag = props => {
	const remove = () => {
		props.removeTag(props.name);
	};

	return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
		'div',
		{ className: 'app-tag' },
		__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			'div',
			{ className: 'tag-content' },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				'div',
				{ className: 'tag-name' },
				props.name
			),
			'\xA0\xA0',
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement('i', { className: 'ff-close tag-delete', onClick: remove })
		)
	);
};

/* harmony default export */ __webpack_exports__["a"] = (Tag);

/***/ }),

/***/ 87:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__style_css__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__style_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__style_css__);
/*!
* Copyright 2018 by ChartIQ, Inc.
* All rights reserved.
*
*/





/**
* A reusable fly out component for tags and any other lists
* This component creates a button with a customizable label
* and an item click handler.
* Example: <TagsMenu label="Tags" align="left" list={list} onItemClick={handler}/>
**/
class TagsMenu extends __WEBPACK_IMPORTED_MODULE_0_react___default.a.Component {

	constructor(props) {
		super(props);
		this.state = {
			isVisible: false
			// Bind context
		};this.toggleMenu = this.toggleMenu.bind(this);
		this.onItemClick = this.onItemClick.bind(this);
		this.setWrapperRef = this.setWrapperRef.bind(this);
		this.handleClickOutside = this.handleClickOutside.bind(this);
	}

	componentDidMount() {
		document.addEventListener('mousedown', this.handleClickOutside);
	}

	componentWillUnmount() {
		document.removeEventListener('mousedown', this.handleClickOutside);
	}

	toggleMenu() {
		this.setState({
			isVisible: !this.state.isVisible
		});
	}

	onItemClick(item) {
		this.setState({
			isVisible: false
		});
		this.props.onItemClick(item);
	}

	setWrapperRef(node) {
		this.wrapperRef = node;
	}

	handleClickOutside(e) {
		if (this.wrapperRef && !this.wrapperRef.contains(e.target)) {
			this.setState({
				isVisible: false
			});
		}
	}

	renderList() {
		const items = this.props.list;
		const styles = this.props.align === 'right' ? { right: 0 } : { left: 0 };
		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			'div',
			{ className: 'tags-menu', style: styles },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				'ul',
				null,
				' ',
				items.sort().map((item, index) => {
					let active = this.props.active.includes(item);

					return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
						'li',
						{ key: index,
							onClick: () => this.onItemClick(item) },
						active ? __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement('i', { className: 'ff-check-mark' }) : __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
							'div',
							{ className: 'tags-checkmark-wrapper' },
							'\xA0'
						),
						'\xA0\xA0',
						item
					);
				}),
				' '
			)
		);
	}
	render() {
		return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
			'div',
			{ ref: this.setWrapperRef, className: 'tags-menu-wrapper', onClick: this.toggleMenu },
			__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(
				'span',
				null,
				__WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement('i', { className: 'ff-tag' }),
				this.props.label
			),
			this.state.isVisible && this.renderList()
		);
	}
}
/* harmony export (immutable) */ __webpack_exports__["a"] = TagsMenu;


/***/ }),

/***/ 9:
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(10);

/***/ }),

/***/ 90:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)(false);
// Module
exports.push([module.i, ".tags-menu-wrapper {\r\n\theight: 17px;\r\n\tborder-radius: 2px;\r\n\tbackground: var(--tag-background-color);\r\n\tcolor: var(--tag-font-color);\r\n\tpadding: 0 5px;\r\n\tdisplay: table;\r\n\tposition: absolute;\r\n\ttop: 1px;\r\n\tright: 1px;\r\n\tuser-select: none;\r\n\tfont-family: var(--font-family);\r\n\tfont-size: var(--menu-font-size);\r\n    font-weight: var(--menu-font-weight);\r\n}\r\n\r\n/* Different positioning for the catalog vs the launcher. */\r\n.appMarket .tags-menu-wrapper {\r\n\ttop: 11px;\r\n\tright: 9px;\r\n}\r\n.tags-menu-wrapper span {\r\n\tline-height: 17px;\r\n\tfont-size: 10px;\r\n\tcursor: pointer;\r\n}\r\n.tags-menu-wrapper span i {\r\n\tmargin-right: 5px;\r\n}\r\n.tags-menu {\r\n\tz-index: 11;\r\n    top: 22px;\r\n\tposition: absolute;\r\n\twidth: 130px;\r\n\tmax-height: 200px;\r\n\toverflow-y: auto;\r\n\tborder-radius: 3px;\r\n  \tbackground-color: var(--tag-background-color);\r\n\tpadding: 5px 0px;\r\n}\r\n.tags-menu ul {\r\n\tpadding: 0;\r\n\tmargin: 0;\r\n}\r\n.tags-menu li {\r\n\tcursor: pointer;\r\n\tline-height: 19px;\r\n\tfont-size: 11px;\r\n\tlist-style: none;\r\n\tcolor: var(--tag-font-color);\r\n\tpadding: 0 10px;\r\n\tdisplay: flex;\r\n\talign-items: center;\r\n}\r\n\r\n.tags-menu .ff-check-mark {\r\n\tcolor: var(--tag-checkmark-icon-color);\r\n}\r\n\r\n.tags-checkmark-wrapper {\r\n\twidth: 10px;\r\n}\r\n\r\n.app-tag {\r\n\theight: 17px;\r\n\tborder-radius: 2px;\r\n\tbackground-color: var(--tag-background-color);\r\n\tuser-select: none;\r\n\tmargin: 0 4px 4px 0;\r\n\tpadding: 4px 5px 0 5px;\r\n}\r\n\r\n.app-tag .tag-content {\r\n\tdisplay: flex;\r\n\tflex-direction: row;\r\n\tjustify-content: center;\r\n\talign-items: center;\r\n\tfont-size: 10px;\r\n\tfont-weight: var(--tag-font-weight);\r\n\tfont-family: var(--font-family);\r\n\tfont-style: normal;\r\n\tfont-stretch: normal;\r\n\tline-height: normal;\r\n\tletter-spacing: normal;\r\n\tcolor: var(--tag-font-color);\r\n\tcursor: default;\r\n}\r\n\r\n.tag-delete {\r\n\tcursor: pointer;\r\n\tpadding: 0 2px;\r\n\tfont-size: 8px;\r\n}\r\n\r\n.tag-delete:hover {\r\n\tcolor: var(--tag-close-icon-hover-color);\r\n}\r\n\r\n.tag-name {\r\n\tmargin-right: 2px;\r\n}", ""]);



/***/ })

/******/ });
//# sourceMappingURL=appCatalog.map.js