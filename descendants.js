/**
 * Method to 
 *
 * @module spytext/descendants 
 */

require('jquery-ancestors');
/**
 * Uses TreeWalker to traverse `element`s DOM subtree and collect all descendants
 * that match different filters
 *
 * @param	{Element} element - Root element to whos descenants we want to collect
 * @param	{Object} [opts] - 
 * @param	{number} [opts.levels] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
 * @param	{number} [opts.nodeType] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
 * @param	{string} [opts.selector] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
 * @param	{Function|Function[]} [opts.filter] - Boolean to determine whether only deepest level of nodes should be collected, ie reject all nodes ancestor nodes.
 * @param	{boolean} [opts.onlyDeepest] - Boolean to determine whether only deepest level of nodes should be collected, ie reject all nodes ancestor nodes.
 * @return {Node[]}	An array containing all matched descendants
 */

module.exports = function descendants(element, opts) {
	opts = opts || {};

	var filters = [],
		nodeType = opts.nodeType;

	if(opts.levels) {
		// add default filter for ensuring we only traverse
		// the correct number of levels
		filters.push(function(node) {
			// count number of steps it takes to
			// go up the DOM to reach `element`
			for(var i = 0; i < opts.levels; i++) {
				node = node.parentNode;
				if(node === element)
					return true;
			}

			// return false if `levels` is set and we have
			// made it through entire loop
			return false;
		});
	}

	if(opts.filter)
		filters = filters.concat(opts.filter);

	if(opts.selector) {
		// only test Element nodes
		nodeType = 1;
		
		// add selector filter
		filters.push(function(node) {
			return $(node).is(opts.selector);
		});
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

	var filter;
	if(filters.length > 0) {
		filter = function(node) {
			return filters.every(function(fnc) {
				return fnc(node);
			}) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		};

		// IE fix... IE will try to call filter property directly,
		// while good browsers (correctly) tries to call filter.acceptNode
		filter.acceptNode = filter;
	}

	var tw = document.createTreeWalker(element, whatToShow, filter, false),
		nodes = [];

	while((node = tw.nextNode())) {
		if((!opts.levels || opts.levels > 1) && opts.onlyDeepest) {
			// we are traversing more than one level, and only want the deepest nodes
			// to be returned so remove all ancestor nodes to `node` from `nodes`
			nodes = _.without.apply(null, [ nodes ].concat($(node).ancestors(selector, element).toArray()));
		}
		nodes.push(node);
	}

	return nodes;
};
