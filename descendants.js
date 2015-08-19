// ufo can to be a nodeType (1 or 3) or a selector string
module.exports = function descendants(element, ufo, levels) {
	// IE fix... IE will try to call filter property directly,
	// while good browsers (correctly) tries to call filter.acceptNode
	function filter(node) {
		return filters.every(function(fnc) {
			return fnc(node);
		}) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	}

	var filters = [],
		nodeType,
		selector;

	filters.push(function(node) {
		for(var i = 0; i < levels; i++) {
			node = node.parentNode;
			if(node === element)
				return true;
		}

		// return false if levels is set and we have
		// made it through entire loop
		return !levels;
	});

	if(_.isString(ufo)) {
		selector = ufo;
		filters.push(function(node) {
			return node.matches(selector);
		});
	} else if(_.isNumber(ufo)) {
		nodeType = ufo;
	}

	switch((nodeType = nodeType || 1)) {
		case 1:
			filters.push(function(node) {
				return ['SCRIPT', 'STYLE'].indexOf(node.tagName) === -1;
			});
			whatToShow = NodeFilter.SHOW_ELEMENT;
			break;
		case 3:
			// TODO do we need to worry about textnodes that only contain whitespaces
			// and are adjacent to block elements.
			whatToShow = NodeFilter.SHOW_TEXT;
			break;
	}

	filter.acceptNode = filter;

	var tw = document.createTreeWalker(element, whatToShow, filter, false),
		nodes = [];

	while((node = tw.nextNode())) {
		nodes.push(node);
	}

	return nodes;
};
