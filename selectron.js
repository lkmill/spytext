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

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

/**
 * Tests whether `node` is a block element, ie if it is of nodeType 1
 * and its tagName is in `blockTags`.
 *
 * @param	{Node} node - The node to check if it is a block element
 * @return {boolean}
 */
function isBlock(node) {
	return node.nodeType === 1 && blockTags.indexOf(node.tagName) !== -1;
	//return node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
}

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
		tw,
		prev;

	if(root !== ref) {
		tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null, false);

		while((node = tw.nextNode())) {
			var nodeType = node.nodeType;

			if(prev && (isBlock(node) || node.nodeName === 'BR' || countAll && !(nodeType === 1 && prev === node.parentNode || prev === node.previousSibling)))
				off++;

			if(node === ref) 
				break;

			if(node.nodeType === 3)
				off = off + node.textContent.length;

			prev = node;
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
 * @throws {TypeError} Throws an error if `element` is undefined
 */
function offset(element, caret, countAll) {
	if(!element) throw new TypeError('element needs to be defined');

	var rng = s().getRangeAt(0),
		ref = rng[(caret || 'start') + 'Container'],
		off = rng[(caret || 'start') + 'Offset'];

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
	var tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null, false),
		prev,
		node;

	while(offset > 0 && (node = tw.nextNode())) {
		var nodetype = node.nodeType;

		if(prev && (isBlock(node) || node.nodeName === 'BR' || countAll && !(nodeType === 1 && prev === node.parentNode || prev === node.previousSibling)))
			offset--;

		prev = node;

		if(node.nodeType === 3) {
			if(offset > node.textContent.length)
				offset = offset - node.textContent.length;
			else
				break;
		}
	}

	return {
		ref: prev || root,
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
	contained: function(element, ufo, levels, partlyContained, onlyDeepest) {
		var _selectron = this,
			nodes = [];
			
		if(ufo instanceof NodeList)
			// convert NodeList to Array
			ufo = _.toArray(ufo);
			
		// create array with all nodes to test if they are contained by the selection
		var check = _.isArray(ufo)? ufo : descendants(element, ufo, levels, onlyDeepest);

		// loop through all nodes to check
		check.forEach(function(node) {
			if(_selectron.contains(node, partlyContained))
				// node is contained by selection, add it to `nodes`
				nodes.push(node);
		});

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
		if(node.nodeType === 3) partlyContained = true;

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

			if(element !== node && !$.contains(element, node))
				return false;

			var rangeStartOffset = offset(element, 'start', true),
				rangeEndOffset = offset(element, 'end', true),
				startOffset = count(element, node, true),
				endOffset = node.nodeType === 1 ? startOffset + count(node, null, true) + 2 : startOffset + node.textContent.length;

			return (startOffset >= rangeStartOffset && endOffset <= rangeEndOffset ||
					partlyContained && ((rangeStartOffset >= startOffset && rangeStartOffset <= endOffset) || (rangeEndOffset >= startOffset && rangeEndOffset <= endOffset)));

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

	normalize: function(element) {
		this.set(this.get(element));
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
	 * Tests whether the caret is currently at the end of a block
	 *
	 * @return {boolean}
	 */
	isAtEnd: function() {
		var rng = this.range();

		var $block = $(rng.startContainer).closest(blockTags.join(','));
		var off = offset($block[0], 'start');

		return $block.text().length === 0 || off === count($block[0]) - count($block.children('UL,OL')[0]);
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

	/**
	 * Sets the current selection to contain `node`
	 *
	 * @param {Node} node - The node to select
	 */
	select: function(node) {
		var textNodes = node.nodeType === 3 ? [ node ] : descendants(node, 3);

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

		position.start.offset = position.start.offset || 0;

		var start = position.start.offset === 0 ? position.start : restore(position.start.ref, position.start.offset);

		var end = position.end ? restore(position.end.ref, position.end.offset) : start,
			rng = document.createRange(),
			sel = s();

		rng.setStart(start.ref, start.offset);
		rng.setEnd(end.ref, end.offset);

		sel.removeAllRanges();
		sel.addRange(rng);
	}
};
