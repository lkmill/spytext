var selectron = {
	getContainingElement: function(selector) {
		selector = selector || '*';
		var element = document.getSelection().anchorNode;
		return recurse(element);

		function recurse(element) {
			if(!element || element.nodeName.toLowerCase() === 'body') {
				return undefined;
			} else if(element.nodeType === 1 && element.matches(selector)) {
				return element;
			}
			return recurse(element.parentNode);
		}
	},
	getContainedChildElements: function(element, partlyContained) {
		partlyContained = partlyContained || false;
		var sel = window.getSelection();
		var nodes = [];
		if (sel.containsNode) {
			_.each(element.children, function (el) {
				if (sel.containsNode(el, partlyContained)) {
					nodes.push(el);
				}
			});
		} else {
			var anchorNode = this.getElementChild(sel.anchorNode, element);
			var focusNode = this.getElementChild(sel.focusNode, element);
			if (anchorNode === focusNode) {
				nodes.push(anchorNode);
			} else {
				var children = element.children;
				var anchorIndex = _.indexOf(children, anchorNode);
				var focusIndex = _.indexOf(children, focusNode);
				for(var i = Math.min(anchorIndex, focusIndex); i <= Math.max(anchorIndex, focusIndex); i++) {
					nodes.push(children.item(i));
				}
			}
		}
		return nodes;
	},
	getContainedNodes: function(element, partlyContained) {
		partlyContained = partlyContained || false;
		var sel = window.getSelection();
		var nodes;
		if (sel.containsNode) {
			nodes = [];
			_.each(element.querySelectorAll('*'), function (descendant) {
				if (sel.containsNode(descendant, partlyContained)) {
					nodes.push(descendant);
				}
			});
		} else {
			var anchorNode = this.getElementChild(sel.anchorNode, element);
			var focusNode = this.getElementChild(sel.focusNode, element);
			if (anchorNode === focusNode) {
				nodes =  $(anchorNode).add($(anchorNode).find('*')).get();
			} else {
				// TODO currently this only returns children
				var $children = $(element).children();
				var one = $children.index(anchorNode);
				var two = $children.index(focusNode);
				nodes = $children.slice(Math.min(one, two), Math.max(one, two)).get();
			}
		}
		return nodes;
	},
	intersectsTags: function(tags, topElement) {
		topElement = topElement || document.querySelector('body');
		var nodes = this.getContainedNodes(topElement, true);
		for (var i = 0; i < nodes.length; i++) {
			if (tags.indexOf(nodes[i].nodeName.toLowerCase()) > -1) {
				return true;
			}
		}
		return false;
	},
	getAnchorAncestorElement: function(selector) {
		var anchor = window.getSelection().anchorNode;
		return recurse(anchor);
		function recurse(node) {
			if(node === null) {
				return null;
			} else if (node.nodeType === 1) {
				if(selector) {
					if(node.matches(selector)) {
						return node;
					}
				} else {
					return node;
				}
			}
			return recurse(node.parentNode);
		}
	},
	selectNodes: function(nodes) {
		var sel = window.getSelection();
		var range = document.createRange();
		range.setStartBefore(_.first(nodes));
		range.setEndAfter(_.last(nodes));
		sel.removeAllRanges();
		sel.addRange(range);
	},
	setCaretAtEndOfElement: function(element) {
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.selectAllChildren(element);
		sel.collapseToEnd();
	},
	setCaretAtStartOfElement: function(element) {
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.selectAllChildren(element);
		sel.collapseToStart();
	},

	// selection oriented per say
	getElementChild: function(node, element) {
		if (node === null || node === element || node.nodeName.toLowerCase() === 'body') {
			return null;
		} else if (_.contains(element.children, node)) {
			return node;
		} else {
			return this.getElementChild(node.parentNode, element);
		}
	}
};
