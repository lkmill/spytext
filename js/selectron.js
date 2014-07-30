var selectron = {
	getContainingElement: function(selector) {
		selector = selector || '*';
		var element = document.getSelection().anchorNode;
		return element.closest(selector);
	},
	getContainedChildElements: function(element, partlyContained, selector) {
		return this.getContainedNodes(element, partlyContained, selector, true, true);
	},
	getContainedNodes: function(element, partlyContained, selector, onlyElements, onlyChildren) {
		partlyContained = partlyContained || false;
		onlyElements = onlyElements || false;
		onlyChildren = onlyChildren || false;
		var sel = window.getSelection();
		var nodes = [];
		if (sel.containsNode) {
			_.each(onlyChildren ? element.childNodes : element.querySelector('*'), function (child) {
				if ((!onlyElements || child.nodeType === 1) && sel.containsNode(child, partlyContained)) {
					if(!selector || child.matches(selector)) {
						nodes.push(child);
					}
				}
			});
		} else {
			// IE fixes
			// TODO implement not partlyContained for IE
			var anchorNode = this.getElementChild(sel.anchorNode, element);
			var focusNode = this.getElementChild(sel.focusNode, element);
			if (anchorNode === null) {
				// anchorNode === null in internet explorer when selecting all (Ctrl + A)
				if(onlyChildren) {
					console.log('only children');
					nodes = onlyElements ? element.childs() : element.content();
				} else {
					nodes = element.find();
				}
			} else if (anchorNode === focusNode) {
				if(onlyChildren) {
					nodes.push(anchorNode);
				} else {
					nodes.push(element);
					// TODO implemented !onlyElements
					var tmp = onlyElements ? element.find() : element.find();
					for(var i = 0; i < tmp.length; i++) {
						nodes.push(tmp[i]);
					}
				}
			} else {
				var children = element.children;
				var anchorIndex = _.indexOf(children, anchorNode);
				var focusIndex = _.indexOf(children, focusNode);
				for(var j = Math.min(anchorIndex, focusIndex); j <= Math.max(anchorIndex, focusIndex); j++) {
					nodes.push(children.item(j));
				}
			}
		}
		return MOD(nodes);
	},
	intersectsTags: function(tags, topElement) {
		topElement = topElement || document.querySelector('body');
		var nodes = this.getContainedChildElements(topElement, true);
		if(!nodes.isList) return tags.indexOf(nodes.nodeName.toLowerCase()) > -1;
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
		if(nodes instanceof Node) {
			return this.selectNode(nodes);
		}
		var sel = window.getSelection();
		var rng = document.createRange();
		rng.setStartBefore(_.first(nodes));
		rng.setEndAfter(_.last(nodes));
		sel.removeAllRanges();
		sel.addRange(rng);
	},
	selectNode: function(element) {
		var sel = window.getSelection();
		var rng = document.createRange();
		rng.selectNode(element);
		sel.removeAllRanges();
		sel.addRange(rng);
	},
	selectNodeContents: function(element) {
		var sel = window.getSelection();
		var rng = document.createRange();
		if(element.firstChild) {
			var node = element;
			while(node.firstChild) {
				node = node.firstChild;
			}
			rng.setStartBefore(node);
			node = element.lastChild;
			while(node.lastChild) {
				node = node.lastChild;
			}
			rng.setEndAfter(node);
		} else {
			rng.selectNodeContents(element);
		}
		sel.removeAllRanges();
		sel.addRange(rng);
		//sel.selectAllChildren(element);
	},
	setCaretAtEndOfElement: function(element) {
		element = element instanceof Node ? element : _.last(element);
		var sel = window.getSelection();
		while(element.lastChild) {
			element = element.lastChild;
		}
		sel.removeAllRanges();
		var rng = document.createRange();
		rng.selectNodeContents(element);
		sel.addRange(rng);
		sel.collapseToEnd();
	},
	setCaretAtStartOfElement: function(element) {
		element = element instanceof Node ? element : _.first(element);
		var sel = window.getSelection();
		while(element.firstChild) {
			element = element.firstChild;
		}
		sel.removeAllRanges();
		var rng = document.createRange();
		rng.selectNodeContents(element);
		sel.addRange(rng);
		sel.collapseToStart();
	},
	save: function() {
		return window.getSelection().getRangeAt(0);
	},
	restore: function(range) {
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
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
