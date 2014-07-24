var selectron = {
	getContainingElement: function(selector) {
        selector = selector || '*';
        var element = document.getSelection().anchorNode;
		return this.getContainingElementRecursive(selector, element);
	},
    getContainingElementRecursive: function(selector, element) {
        if(!element || element.nodeName.toLowerCase() === 'body') {
            return undefined;
        } else if(element.nodeType === 1 && element.matches(selector)) {
            return element;
        }
        return this.getContainingElementRecursive(selector, element.parentNode);
    },
	getSurroundingNode: function() {
		return window.getSelection().focusNode.parentElement;
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

	getContainedNodes: function(element, partlyContained) {
		partlyContained = partlyContained || false;
		var sel = window.getSelection();
		var nodes;
		if (sel.containsNode) {
			nodes = [];
			_.each(element.querySelectorAll('*'), function (el) {
				if (sel.containsNode(el, partlyContained)) {
					nodes.push(el);
				}
			});
		} else {
            console.log(this);
			var anchorNode = this.getElementChild(sel.anchorNode, element);
			var focusNode = this.getElementChild(sel.focusNode, element);
			if (anchorNode === focusNode) {
				nodes =  $(anchorNode).add($(anchorNode).find('*')).get();
			} else {
				var $children = $(element).children();
				var one = $children.index(anchorNode);
				var two = $children.index(focusNode);
				nodes = $children.slice(Math.min(one, two), Math.max(one, two)).get();
			}
		}
		return nodes;
	},

	// traverses up the DOM. returns 
	getElementChild: function(node, element) {
		if (node === null || node === element || node.nodeName.toLowerCase() === 'body') {
			return null;
		} else if ($(element).children().index(node) > -1) {
			return node;
		} else {
			return this.getElementChild(node.parentNode, element);
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
	selectNodeContents: function(el) {
		var range = document.createRange();
		range.selectNodeContents(el);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	},
	setCaretAtEndOfElement: function(element) {
		var range = document.createRange();
		if (element.childNodes.length > 0) {
			if (_.last(element.childNodes).nodeName.toLowerCase() === 'br') {
				range.setStartBefore(_.last(element.childNodes));
				range.setEndBefore(_.last(element.childNodes));
			} else {
				range.setStartAfter(_.last(element.childNodes));
				range.setEndAfter(_.last(element.childNodes));
			}
		} else {
			range.setStartAfter(element);
			range.setEndAfter(element);
		}
		var selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	},
};
