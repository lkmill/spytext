var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

var p = Element.prototype;

function isBlock(node) {
	return node.nodeType === 1 && blockTags.indexOf(node.tagName) !== -1;
	//return node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
}

function count(root, ref, countAll) {
	var node,
		off = 0,
		tw,
		prev;

	if(root !== ref) {
		tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null, false);

		while((node = tw.nextNode())) {
			var nodeType = node.nodeType;

			if(prev && (isBlock(node) || countAll && !(nodeType === 1 && prev === node.parentNode || prev === node.previousSibling)))
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

function offset(element, caret, countAll) {
	if(!element) throw new Error('element needs to be defined');

	var rng = s().getRangeAt(0),
		ref = rng[(caret || 'start') + 'Container'],
		off = rng[(caret || 'start') + 'Offset'];

	return count(element, ref, countAll) + off;
}

function restore(root, offset, countAll) {
	var tw = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null, false),
		prev,
		node;

	while(offset > 0 && (node = tw.nextNode())) {
		var nodetype = node.nodeType;

		if(prev && (isBlock(node) || countAll && !(nodeType === 1 && prev === node.parentNode || prev === node.previousSibling)))
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
	
	contained: function(element, ufo, levels, partlyContained, onlyDeepest) {
		var _selectron = this,
			nodes = [];
			
		if(ufo instanceof NodeList)
			ufo = _.toArray(ufo);
			
		var check = _.isArray(ufo)? ufo : descendants(element, ufo, levels, onlyDeepest);

		check.forEach(function(node) {
			if(_selectron.contains(node, partlyContained))
				nodes.push(node);
		});

		return nodes;
	},

	contains: function(node, partlyContained) {
		// default, unoverridable behaviour of Selection.containsNode() for textNodes
		if(node.nodeType === 3) partlyContained = true;

		var sel = s();

		if(sel.containsNode) {
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

	containsEvery: function(nodes, partlyContained) {
		var that = this;

		return _.toArray(nodes).every(function(node) {
			return that.contains(node, partlyContained);
		});
	},

	containsSome: function(nodes, partlyContained) {
		var that = this;

		return _.toArray(nodes).some(function(node) {
			return that.contains(node, partlyContained);
		});

	},

	normalize: function(element) {
		this.set(this.get(element));
	},

	range: function() {
		var sel = s();

		if(sel.rangeCount > 0)
			return sel.getRangeAt(0);
		else
			return null;
	},

	isAtEnd: function() {
		var rng = this.range();

		var $block = $(rng.startContainer).closest(blockTags.join(','));
		var off = offset($block[0], 'start');

		return $block.text().length === 0 || off === count($block[0]) - count($block.children('UL,OL')[0]);
	},


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

	select: function(node) {
		var children = node.offspring();
		var first = children[0];
		var last = children[children.length - 1];
		this.set({
			start: { ref: first, offset: 0, isAtStart: true },
			end: { ref: last, offset: last.textContent.length, isAtStart: last.textContent.length === 0 }
		});
	},

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
