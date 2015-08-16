function relativeOffset(node, ancestor, offset, getRelativeToAncestor, count) {
	if(count){
		offset += node.textContent.length;
	}
	if(node !== ancestor) {
		if(node.previousSibling &&
				(getRelativeToAncestor || node.nodeType !== 1 || offset > node.textContent.length)) {
			if(node.previousSibling) {
				return relativeOffset(node.previousSibling, ancestor, offset, getRelativeToAncestor, true);
			} else {
				if(offset > node.textContent.length) {
					return { ref: node, offset: node.textContent.length };
				}
			}
		} else if((getRelativeToAncestor || node.nodeType !== 1) && node.parentNode) return relativeOffset(node.parentNode, ancestor, offset, getRelativeToAncestor, false);
	}
	return { ref: node, offset: offset };
}

function position(ancestor, isStart, getRelativeToAncestor) {
	var rng = s().getRangeAt(0);
	var ref = isStart ? rng.startContainer : rng.endContainer;
	var offset = isStart ? rng.startOffset : rng.endOffset;

	if(ref.textContent.length !== 0) {
		var node = ref;
		if(isStart && offset === node.textContent.length) {
			while(node && node !== ancestor) {
				if(node.nextSibling) {
					ref = node.nextSibling;
					offset = 0;
					break;
				} else node = node.parentNode;
			}
		} else if(!isStart && !rng.collapsed && offset === 0) {
			while(node && node !== ancestor) {
				if(node.previousSibling) {
					//obj = relativeOffset(node.previousSibling, ancestor, node.previousSibling.textContent.length, isStart, getRelativeToAncestor, false);
					ref = node.previousSibling;
					offset = node.previousSibling.textContent.length;
					break;
				} else node = node.parentNode;
			}
		}
	}
	

	var isAtStart = offset === 0;

	if(ancestor) {
		var tmp = relativeOffset(ref, ancestor, offset, getRelativeToAncestor, false);
		ref = tmp.ref;
		offset = tmp.offset;
	}
	return { ref: ref, offset: offset, isAtStart: isAtStart };
}

function check(node) {
	function isBlock(node) {
		return node && node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
	}
	var excludedTags = ['SCRIPT', 'STYLE'];
	// TODO figure out best way to exclude text nodes that only contain
	// whitespaces and are adjacent to block elements. (these text nodes
	// are just results from the developer using spaces or tabs to align their
	// HTML.
	return (node.nodeType === 1 && excludedTags.indexOf(node.nodeName) === -1) || 
		(node.nodeType === 3 && (!node.textContent.match(/^\s+$/) || (!isBlock(node.nextSibling) && !isBlock(node.previousSibling))));
}

function descendants(element, ufo, levels) {
	//if(ufo instanceof Node) checkNodes = [ ufo ];
	//else if(ufo instanceof NodeList || ufo instanceof Array) checkNodes = ufo ;
	//else if(typeof ufo === 'string') checkNodes = this.element.querySelectorAll(ufo);
	//else if(typeof ufo === 'number') {
	//	if(ufo === 1) checkNodes = this.element.querySelectorAll('*');
	//	else {
	//		// assume ufo === 3, text nodes
	//		// emulate standard behaviour of text nodes
	//		notPartlyContained = false;
	//		var n, walk=document.createTreeWalker(this.element, NodeFilter.SHOW_TEXT,null,false);
	//		while(n=walk.nextNode()) checkNodes.push(n);
	//	}
	//}

	
	// TODO implement with TreeWalker instead
	function recurse(node, level) {
		var children = nodeType === 1 ? node.children : node.childNodes;
		if(!children) return;
		for(var i = 0; i < children.length; i++) {
			if(check(children[i]) && (getAnyType || (!nodeType || children[i].nodeType === nodeType) && (!selector || (children[i].nodeType === 1 && children[i].matches(selector))))) nodes.push(children[i]);
			if (!levels || level < levels) {
				recurse(children[i], level + 1);
			}
		}
	}
	var getAnyType, nodeType, selector;

	if(typeof ufo === 'string') selector = ufo;
	else if(typeof ufo === 'number') {
		if(ufo === 0) getAnyType = true;
		else nodeType = ufo;
	} else nodeType = 1;

	var nodes = [];
	recurse(element, 1);

	return nodes;
}

var s = window.getSelection;

var Positron = function(positions, selectron) {
	this.selectron = selectron;
	for(var property in positions) {
		this[property] = positions[property];
	}
};

Positron.prototype = {
	restore: function() {
		this.selectron.set(this);
	},

	isCollapsed: function() {
		return this.start.ref === this.end.ref && this.start.offset === this.end.offset;
	},

	clone: function() {
		return new Positron({ start: this.start, end: this.end }, this.selectron );
	}
};

module.exports = {
	contained: function(element, ufo, levels, notPartlyContained) {
		// default behaviour of containsNode for textNodes
		if(ufo === 3) notPartlyContained = false;

		levels = levels || 0;

		var checkNodes, sel = s(), nodes = [];
		
		if(ufo instanceof Node) checkNodes = [ ufo ];
		else if(ufo instanceof NodeList || ufo instanceof Array) checkNodes = ufo;
		else checkNodes = descendants(element, ufo, levels);

		if(sel.containsNode) {
			checkNodes.forEach(function(node) {
				if(sel.containsNode(node, !notPartlyContained)) nodes.push(node);
			});
		} else {
			var rng = this.range();
			var startOffset = relativeOffset(rng.startContainer, element, rng.startOffset, true, false).offset;
			var endOffset = relativeOffset(rng.endContainer, element, rng.endOffset, true, false).offset;

			for(var j = 0; j < checkNodes.length; j++) {
				var node = checkNodes[j];
				var currentStartOffset = relativeOffset(node, element, 0, true, false).offset;
				var currentEndOffset = relativeOffset(node, element, node.textContent.length, true, false).offset;

				if(
						(currentStartOffset >= startOffset && currentEndOffset <= endOffset) ||
						(!notPartlyContained && 
						 ((rng.collapsed && startOffset >= currentStartOffset && startOffset <= currentEndOffset) || 
							(startOffset > currentStartOffset && startOffset < currentEndOffset) ||
							(endOffset > currentStartOffset && endOffset < currentEndOffset)
							))) {
					if(notPartlyContained || 
							(endOffset !== currentStartOffset && startOffset !== currentEndOffset) ||
							(node.textContent.length === 0 || node.nodeType !== 1 || getComputedStyle(node).display.match(/inline/)) || 
							(rng.collapsed && (rng.startContainer.closest(node, element))))
						nodes.push(node);
				}
			}
		}

		return nodes;
	},

	normalize: function() {
		this.set(this.get());
	},

	range: function() {
		var sel = s();
		if(sel.rangeCount > 0) return sel.getRangeAt(0);
		else return null;
	},

	get: function(element, ufo, getRelativeToAncestor) {
		var ancestor = element;
		var positions;
		if(this.countRanges() > 0) {
			if(ufo === true) getRelativeToAncestor = ufo;
			else if(ufo instanceof Node) ancestor = ufo;
			positions = { start: position(ancestor, true, getRelativeToAncestor), end: position(ancestor, false, getRelativeToAncestor) };
		} else {
			var ref = element.children[element.children.length - 1];
			var pos = { ref: ref, offset: ref.textContent.length, isAtStart: false };
			positions = {
				start: pos,
				end: pos
			};
		}
		var positron = new Positron(positions,this);
		return positron;
	},

	positron: function(positions) {
		return new Positron(positions,this);
	},

	select: function(node) {
		var children = node.offspring();
		var first = children[0];
		var last = children[children.length - 1];
		this.set(new Positron({
			start: { ref: first, offset: 0, isAtStart: true },
			end: { ref: last, offset: last.textContent.length, isAtStart: last.textContent.length === 0 }
		}, this));
	},

	set: function(ufo, startOffset, endNode, endOffset) {
		function recurse(node, offset, isStart) {
			if(!node) return null;
			var limit = isStart ? node.textContent.length - 1 : node.textContent.length;
			if(offset === 0 && node.textContent.length === 0) return { ref: node, offset: offset };
			else if(offset > limit && node.nextSibling) return recurse(node.nextSibling, offset - node.textContent.length, isStart);
			else if(node.firstChild) return recurse(node.firstChild, offset, isStart);
			else return { ref: node, offset: offset };
		}
		var start, end;
		if(ufo instanceof Positron) {
			start = recurse(ufo.start.ref, ufo.start.offset, ufo.start.isAtStart);
			end = recurse(ufo.end.ref, ufo.end.offset, ufo.end.isAtStart);
		} else if(ufo instanceof Node) {
			start = recurse(ufo, startOffset || 0);
			end = endNode instanceof Node ? recurse(endNode, endOffset || endNode.textContent.length) : start;
		}

		var rng = document.createRange();
		rng.setStart(start.ref, start.offset);
		rng.setEnd(end.ref, end.offset);

		s().removeAllRanges();
		s().addRange(rng);
	},

	countRanges: function() {
		return s().rangeCount;
	}
};
