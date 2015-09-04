/**
 * Selectron assists in counting selection caret's offset in relation to
 * different DOM elements, and saving and restoring selection ranges. Saving
 * and restoring of selection/ranges will work across heavy DOM manipulation if used correctly.
 *
 * @module spytext/selectron 
 */

/**
 * Position of a caret (start or end)
 *
 * @typedef {Object} Position
 * @property {Node} ref - Reference node to count `offset` from
 * @property {number} offset - Steps from start of `ref`
 */

/**
 * Positions of start and end caret
 *
 * @typedef {Object} Positions
 * @property {Position} start - Position of start caret
 * @property {Position} end - Position of end caret
 */

var sectionTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

/**
 * Tests whether `node` is a section element, ie if it is of nodeType 1
 * and its tagName is in `sectionTags`.
 *
 * @param	{Node} node - The node to check if it is a section element
 * @return {boolean}
 */
function isSection(node) {
	return node.nodeType === 1 && sectionTags.indexOf(node.tagName) !== -1;
	//return node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
}

function getLastPosition(node) {
	var ref = node.lastChild;
		
	while(ref) {
		if(ref.nodeType === 3)
			break;

		ref = ref.lastChild || ref.previousSibling;
	}

	return {
		ref: ref || node,
		offset: ref ? ref.textContent.length : 0
	}
}

function filter(node) {
	return (node.nodeName !== 'BR' || node.nextSibling && !$(node.nextSibling).is('UL,OL')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
}

filter.acceptNode = filter;

/**
 * Uses a TreeWalker to traverse and count the offset from `root` to `ref`
 *
 * This is essentially the inverse of restore
 *
 * @static
 * @param	{Node} root - Element to count relative
 * @param	{Node} ref - Element to reach
 * @param	{boolean} [countAll] - Boolean parameter to determine whether to count all steps
 * @return {number}	The total offset of the caret relative to element
 */
function count(root, ref, countAll) {
	var node,
		off = 0,
		tw;

	if(root !== ref) {
		tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, countAll ? null : filter, false);

		while((node = tw.nextNode())) {
			if(countAll || isSection(node) || node.nodeName === 'BR')
				off++;

			if(node === ref)
				break;
	
			if(node.nodeType === 3)
				off = off + node.textContent.length;
		}
	}

	return off;
}

/**
 * Return the total offset for a caret (start or end) of a range relative to a
 * specific element
 *
 * @static
 * @param	{Element} element - Containing element to count offset relative to
 * @param	{string} [caret=start] - Parameter that determines whether we should fetch start or endContainer
 * @param	{boolean} [countAll] - Boolean parameter to determine whether to count all elements
 * @return {number}	The total offset of the caret relative to `element`
 * @see count	
 */
function offset(element, caret, countAll) {
	var rng = s().getRangeAt(0),
		ref = rng[(caret || 'start') + 'Container'],
		off = rng[(caret || 'start') + 'Offset'];

	element = element || $(ref).closest(sectionTags.join(','))[0];

	if(ref.nodeType === 1 && off > 0) {
		ref = ref.childNodes[off - 1];
		off = ref.textContent.length;
	}

	return count(element, ref, countAll) + off;
}

/**
 * Uses `root` and `offset` to traverse the DOM to find the innermost element
 * where the caret should be placed.
 *
 * This is essentially the inverse of count
 *
 * @static
 * @param	{Element} root
 * @param	{number} offset
 * @param	{boolean} [countAll] - Boolean parameter to determine whether to count all elements
 * @return {Position}
 */
function restore(root, offset, countAll) {
	var tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, countAll ? null : filter, false),
		node,
		ref = root;

	while(node = tw.nextNode()) {
		if(countAll || isSection(node) || node.nodeName === 'BR') {
			if(offset === 0)
				break;

			offset--;
		}

		if(!$(node).is('UL,OL'))
			ref = node;

		if(node.nodeType === 3) {
			if(offset > node.textContent.length)
				offset = offset - node.textContent.length;
			else
				break;
		}
	}

	return {
		ref: ref,
		offset: offset
	};
}

var descendants = require('./descendants');

var s = window.getSelection;

module.exports = {
	restore: restore,

	count: count,

	offset: offset,

	/**
	 * Returns all elements contained by the current selection
	 *
	 * @param	{Element} element - Element to count relative
	 * @param	{Node[]|NodeList|string|number|function} [ufo] - Filters
	 * @param	{number} [levels] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
	 * @param	{boolean} [partlyContained] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
	 * @param	{boolean} [onlyDeepest] - How many levels of descendants should be collected. If `levels` is not set, all levels will be traversed
	 * @return {Node[]}	Array contained all contained nodes
	 */
	contained: function(element, opts, partlyContained) {
		var _selectron = this,
			check,
			nodes = [];

		if(_.isArray(opts))
			check = opts;
		else if(opts instanceof NodeList || opts instanceof HTMLCollection || opts instanceof jQuery)
			check = _.toArray(opts);
		else
			check = descendants(element, opts);
			
		// loop through all nodes and check if
		// they are contained by the current selection
		check.forEach(function(node) {
			if(_selectron.contains(node, partlyContained))
				nodes.push(node);
		});

		// return any contained nodes
		return nodes;
	},

	/**
	 * Tests whether `node` is contained by the current selection
	 *
	 * @param	{Node} node - Element to count relative
	 * @param	{boolean} [partlyContained] - Return nodes that are not completely contained by selection
	 * @return {boolean}
	 */
	contains: function(node, partlyContained) {
		// default, unoverridable behaviour of Selection.containsNode() for textNodes
		// is to always test partlyContained = true
		partlyContained = node.nodeType === 3 ? true : !!partlyContained;

		var sel = s();

		if(sel.containsNode) {
			// simply use Selection objects containsNode native function if it exists
			return sel.containsNode(node, partlyContained);
		} else {
			var rng = sel.getRangeAt(0),
				element = rng.commonAncestorContainer;

			if(element.nodeType !== 1) {
				element = element.parentNode;
			}

			if(element !== node && !$.contains(element, node)) {
				return partlyContained && $.contains(node,element);
			}
			
			var rangeStartOffset = offset(element, 'start', true),
				rangeEndOffset = offset(element, 'end', true),
				startOffset = count(element, node, true),
				endOffset = node.nodeType === 1 ? startOffset + count(node, null, true) + 1 : startOffset + node.textContent.length;

			return (startOffset >= rangeStartOffset && endOffset <= rangeEndOffset ||
					(partlyContained && ((rangeStartOffset >= startOffset && rangeStartOffset <= endOffset) || (rangeEndOffset >= startOffset && rangeEndOffset <= endOffset))));
		}
	},

	/**
	 * Tests whether all `nodes` are contained by the current selection
	 *
	 * @param	{Node[]} nodes - nodes to test if they are contained
	 * @param	{boolean} [partlyContained] - Return nodes that are not completely contained by selection
	 * @return {boolean}
	 * @see contains
	 */
	containsEvery: function(nodes, partlyContained) {
		var that = this;

		return _.toArray(nodes).every(function(node) {
			return that.contains(node, partlyContained);
		});
	},

	/**
	 * Tests whether any of `nodes` are contained by the current selection
	 *
	 * @param	{Node[]} nodes - nodes to test if they are contained
	 * @param	{boolean} [partlyContained] - Return nodes that are not completely contained by selection
	 * @return {boolean}
	 * @see contains
	 */
	containsSome: function(nodes, partlyContained) {
		var that = this;

		return _.toArray(nodes).some(function(node) {
			return that.contains(node, partlyContained);
		});

	},

	normalize: function() {
		var rng = this.range(),
			$container = $(rng.endContainer);

		if(!rng.collapsed) {
			if($container.is(sectionTags.join(','))) {
				var ref = $container[0];

				while(!ref.previousSibling)
					ref = ref.parentNode;

				this.set({
					start: {
						ref: rng.startContainer,
						offset: rng.startOffset
					},
					end: getLastPosition(ref.previousSibling)
				});
			}
		} else {
			var section = $container.closest(sectionTags.join(','))[0];
			this.set({
				ref: section,
				offset: offset(section, 'start')
			});
		}
	},

	/**
	 * Return the current selection's (first) range
	 *
	 * @return {Range}
	 */
	range: function() {
		// retrieve the current selection
		var sel = s();

		if(sel.rangeCount > 0)
			// selection has at least one range, return the first
			return sel.getRangeAt(0);
		else
			// selection has no range, return null
			return null;
	},

	/**
	 * Tests whether the caret is currently at the end of a section
	 *
	 * @return {boolean}
	 */
	isAtEndOfSection: function(section) {
		var endContainer = this.range().endContainer,
			$section;
		if(section) {
			if(section !== endContainer && !$.contains(section,endContainer))
				return false;

			$section = $(section);
		} else {
			$section = $(endContainer).closest(sectionTags.join(','));
		}

		if($section.text().length === 0)
			return true;

		var off = offset($section[0], 'end'),
			$nestedList = $section.children('UL,OL'),
			result = $nestedList.length > 0 ? count($section[0], $nestedList[0]) : count($section[0]);

		return  off === result;
	},

	/**
	 * Tests whether the caret is currently at the end of a section
	 *
	 * @return {boolean}
	 */
	isAtStartOfSection: function(section) {
		var $section = $(section || this.range().startContainer).closest(sectionTags.join(','));

		return offset($section[0], 'start') === 0;
	},

	/**
	 * Get Positions of start and end caret of current selection
	 *
	 * @param {Element} [element=document.body] - The reference node (to count the offset from)
	 * @param	{boolean} [countAll] - Boolean parameter to determine whether to count all steps
	 * @return {Positions} ref element of both start and end Position will be `element`
	 */
	get: function(element, countAll) {
		element = element || document.body;

		return {
			start: {
				ref: element,
				offset: offset(element, 'start', countAll)
			},
			end: {
				ref: element,
				offset: offset(element, 'end', countAll)
			}
		};
	},

	getLastPosition: getLastPosition,

	/**
	 * Sets the current selection to contain `node`
	 *
	 * @param {Node} node - The node to select
	 */
	select: function(node) {
		var textNodes = node.nodeType === 3 ? [ node ] : descendants(node, { nodeType: 3 });

		if(textNodes.length === 0) {
			this.set({ ref: node, offset: 0 });
		} else {
			var first = _.first(textNodes),
				last = _.last(textNodes);

			this.set({
				start: {
					ref: first,
					offset: 0
				},
				end: {
					ref: last,
					offset: last.textContent.length,
				}
			});
		}
	},

	/**
	 * Sets the selection to `position`
	 *
	 * @param {Position|Positions} position - If a Position, a collapsed range will be set with start and end caret set to `position`
	 */
	set: function(position) {
		if(position.ref) {
			position = {
				start: position
			};
		}

		var start = restore(position.start.ref, position.start.offset || 0),
			end = position.end ? restore(position.end.ref, position.end.offset || 0) : start,
			rng = document.createRange(),
			sel = s();

		if(start.ref.nodeName === 'BR') {
			rng.setStartAfter(start.ref);
		} else {
			rng.setStart(start.ref, start.offset);
		}

		if(end.ref.nodeName === 'BR') {
			rng.setEndAfter(end.ref);
		} else {
			rng.setEnd(end.ref, end.offset);
		}

		sel.removeAllRanges();
		sel.addRange(rng);
	}
};
