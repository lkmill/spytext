/**
 * Exposes a single function which assists in fetcing a list of all descendants
 * to an element that match certain filters.
 *
 * @module spytext/descendants 
 */

require('jquery-ancestors');

/**
 * Uses TreeWalker to traverse `element`s DOM subtree and collect all descendants
 * that match different filters
 *
 * @param	{Element} element - Root element to whos descenants we want to collect
 * @param	{string|number|function} [ufo] - Used to decide what descendant elements will be returned. 
 * @param	{number} [levels] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
 * @param	{boolean} [onlyDeepest] - Boolean to determine whether only deepest level of nodes should be collected, ie reject all nodes ancestor nodes.
 * @return {Node[]}	An array containing all matched descendants
 */
module.exports = function descendants(element, ufo, levels, onlyDeepest) {
	// the function that tests all filters in the filters array
	function filter(node) {
		return filters.every(function(fnc) {
			return fnc(node);
		}) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	}

	var filters = [],
		nodeType,
		selector;

	// add default filter for ensuring we only traverse
	// the correct number of levels
	filters.push(function(node) {
		// count number of steps it takes to go up the DOM to reach `element`
		// return true if element is reached in less steps than `levels`
		for(var i = 0; i < levels; i++) {
			node = node.parentNode;
			if(node === element)
				return true;
		}

		// return true if levels is falsy or if levels
		// is set and we have made it through the for loop
		return !levels;
	});

	if(_.isFunction(ufo)) {
		// if ufo is a function, add it as a filter
		filters.push(ufo);
	} else if(_.isString(ufo)) {
		// ufo is a selector string
		selector = ufo;
		
		// only traverse Element nodes
		nodeType = 1;
		
		// add selector filter
		filters.push(function(node) {
			return $(node).is(selector);
		});
	} else if(_.isNumber(ufo)) {
		// ufo is a number
		nodeType = ufo;
	}

	switch(nodeType) {
		case 1:
			// only traverse Element nodes
			whatToShow = NodeFilter.SHOW_ELEMENT;
			
			// ignore SCRIPT and STYLE tags.
			filters.push(function(node) {
				return ['SCRIPT', 'STYLE'].indexOf(node.tagName) === -1;
			});
			break;
		case 3:
			// only traverse textNodes
			whatToShow = NodeFilter.SHOW_TEXT;
			break;
		default:
			// No nodeType has been set, traverse all nodes
			whatToShow = NodeFilter.SHOW_ALL;
			break;
	}

	// IE fix... IE will try to call filter property directly,
	// while good browsers (correctly) tries to call filter.acceptNode
	filter.acceptNode = filter;

	var tw = document.createTreeWalker(element, whatToShow, filter, false),
		nodes = [];

	while((node = tw.nextNode())) {
		if((!levels || levels > 1) && onlyDeepest) {
			// we are traversing more than one level, and only want the deepest nodes
			// to be returned so remove all ancestor nodes to `node` from `nodes`
			nodes = _.without.apply(null, [ nodes ].concat($(node).ancestors(selector, element).toArray()));
		}
		nodes.push(node);
	}

	return nodes;
};
