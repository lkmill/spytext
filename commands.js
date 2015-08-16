require('jquery-ancestors');

var selectron = require('./selectron');

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

function align(alignment) {
	var containedChildren = selectron.contained(element, 1,1);
	containedChildren.forEach(function(child) {
		if(!$(child).is('ul, ol')) $(child).css('text-align', alignment);
	});
}

function block(element, tag) {
	function _block(node, insert) {
		var $tmp = $wrapper.clone();
		if(insert !== false) {
			$(node).before($tmp);
		}
		while(node.firstChild) {
			$tmp.append(node.firstChild);
		}
		$(node).remove();
		setBR($tmp[0]);
		blocks.push($tmp[0]);
	}
	var that = this;
	var positron = selectron.get(element, true);
	var $wrapper = $('<' + tag + '></' + tag + '>');

	var blocks = [];

	selectron.contained(element, 1, 1).forEach(function(child){
		if(child.nodeName === 'UL' || child.nodeName === 'OL') {
			var li = $(child).children('li').toArray();
			var containedLi = that.currentField.selectron.contained(li);
			var startIndex = li.indexOf(containedLi[0]);
			containedLi.forEach(function(element) {
				_block(element, false);
			});

			if(startIndex > 0 && startIndex < child.childNodes.length - 1) {
				var $bottomList = $('<' + child.tagName + '><' + child.tagName + '/>');
				$(child).after($bottomList);
				while(startIndex < child.childNodes.length) {
					$bottomList.prepend(child.lastChild);
				}
			}

			$(child).after(blocks);
			if(!child.firstChild) $(child).remove();
		} else {
			_block(child);
		}
	});
	positron.restore();
}

function clearTextNodes(element) {
	var children = [];
	for(var i = 0; i < element.childNodes.length; i++) {
		children.push(element.childNodes[i]);
	}
	for(i in children) {
		if(children[i].nodeType !== 3) continue;
		if(children[i].textContent.match(/^\s+$/)) {
			$(children[i]).remove();
		} else {
			$(children[i]).text(children[i].textContent.trim());
			$(children[i]).wrap('<p></p>');
		}
	}

	if(!element.firstChild) {
		$(element).append('<p><br /></p>');
	}
	setBR(element);
}

function deleteRangeContents(element, rng) {
	function removeNodes(node, startNode) {
		startNode = startNode || node;
		var next;
		var tmp = node;
		while(!next && tmp && tmp !== startBlock) {
			if(tmp.nextSibling) next = tmp.nextSibling;
			else tmp = tmp.parentNode;
		}
		if(node && startNode !== node) {
			$(node).remove();
		}
		if(next) removeNodes(next, startNode);
	}

	function appendNodes(node, startNode) {
		startNode = startNode || node;
		var next;
		var tmp = node;
		while(!next && tmp && tmp !== endBlock) {
			if(tmp.nextSibling) next = tmp.nextSibling;
			else tmp = tmp.parentNode;
		}
		
		if(node && startNode !== node) {
			startBlock.appendChild(node);
		}
		if(next) appendNodes(next, startNode);
	}

	var commonAncestor = rng.commonAncestorContainer;

	if(commonAncestor === element || (commonAncestor.nodeType === 1 && $(commonAncestor).is('UL, OL'))) {
		var positron = selectron.get(element);
		var firstNode, lastNode;

		var startAncestors = $(rng.startContainer).ancestors(null, element);
		var startBlock = startAncestors.length > 0 ? startAncestors[startAncestors.length - 1] : element.firstChild;
		var completelyContainedBlocks = selectron.contained(element, 1, 1, true);

		if(selectron.contained(element, startBlock, null, true).length > 0) {
			startBlock.empty();
		} else {
			if(startBlock.firstChild.tagName === 'LI') {
				$(selectron.contained(element, startBlock.childNodes, null, true)).remove();
				startBlock = rng.startContainer.closest('LI', endBlock);
			}

			node = rng.startContainer;

			while(node && node.nodeType !== 3) node = node.firstChild;

			if(node) {
				node.splitText(rng.startOffset);
				firstNode = node;
				removeNodes(node);
			}
		}

		var endAncestors = ancestors(rng.endContainer, null, element).toArray();
		var endBlock = endAncestors[endAncestors.length - 1];

		if(endBlock && selectron.contained(element, M(endBlock), null, true).length < 1) {
			var block;
			if(endBlock.firstChild.tagName === 'LI') {
				block = rng.endContainer.closest('LI', endBlock);
				$(selectron.contained(element, endBlock.childNodes, null, true)).remove();
			} else block = endBlock;

			var tmpPositron = positron.clone();
			tmpPositron.start = { ref: block, offset: 0, isAtStart: true };
			tmpPositron.restore();

			selectron.range().deleteContents();

			while(block.firstChild) {
				startBlock.appendChild(block.firstChild);
			}

			$(block).remove();
			//positron.start = { ref: startBlock, offset: startBlock.textContent.length, isAtStart: startBlock.textContent.length === 0 };
			//positron.end = positron.start;
		}

		if(!startBlock.firstChild || startBlock.firstChild.textContent.length === 0 || startBlock.firstChild.textContent.match(/^\s+$/)) {
			if(startBlock.firstChild && (startBlock.firstChild.textContent.length === 0 || startBlock.firstChild.textContent.match(/^\s+$/))) {
				$(startBlock.firstChild).remove();
			}
			if($(startBlock).is('UL, OL')) {
				var p = $('<p>')[0];
				$(startBlock).before(p);
				$(startBlock).remove();
				startBlock = p;
			}
			setBR(startBlock);
			positron.start = { ref: startBlock, offset: 0, isAtStart: true };
		}
		//completelyContainedBlocks = completelyContainedBlocks.toArray();
		//completelyContainedBlocks.shift();
		$(completelyContainedBlocks).remove();
		positron.end = positron.start;
		positron.restore();
	} else {
		rng.deleteContents();
	}
}

function indent(element, outdent){
	var allLi = selectron.contained(element, 'li');
	var positron = selectron.get(element, null, true);
	for(var i = 0; i < allLi.length; i++) {
		//var add = allLi[i].closest('li', element);
		var listTag = allLi[i].closest('ul, ol', element).tagName;

		var prev = allLi[i].previousSibling;
		if(prev) {
			var nested = $(prev).children(listTag)[0];
			var list = nested || $('<' + listTag + '></' + listTag + '>')[0];

			if(list !== nested) $(prev).append(list);

			$(list).append(allLi[i]);
		}
		//if(!add) add = allLi[i];
		//
		//if(li.indexOf(add) === -1) li.push
		//var prev = listItems[i].previousSibling;
		//if(prev) {
		//}
	}
	positron.restore();
}

function join(element, node1, node2) {
	var positron = selectron.get(element, true);
	var pa = node2.parentNode;
	if($(node1).is('LI') && $(node2).is('LI') && $(node1).closest('UL,OL')[0] !== $(node2).closest('UL, OL')[0]) {
		$(node1).after(pa.children.slice(0));
		$(pa).remove();
	} else {
		if(node1.lastChild.tagName === 'BR') node1.removeChild(node1.lastChild);
		if(node2.nodeType === 1 && $(node2).is('UL, OL')) node2 = node2.firstChild;
		while(node2.firstChild) 
			node1.appendChild(node2.firstChild);
	}
	setBR(node1);
	if(!node2.firstChild || node2.textContent.length === 0) $(node2).remove();
	else setBR(node2);
	if(!pa.firstChild) $(pa).remove();
	setBR(node1);
	positron.restore();
}

function format(element, tag){
	var positron = selectron.get(element, null, true);
	var containedTextNodes = selectron.contained(element, 3);
	var rng = selectron.range();

	if(rng.endOffset < rng.endContainer.textContent.length) {
		node = rng.endContainer;

		while(node.firstChild && node.nodeType !== 3) node = node.firstChild;

		if(node) node.splitText(rng.endOffset);
	}
	if(rng.startOffset > 0) {
		node = rng.startContainer;

		while(node && node.nodeType !== 3) node = node.firstChild;

		if(node) containedTextNodes.splice(0, 1, node.splitText(rng.startOffset));
	}

	var $wrapper = _.isString(tag) ? $('<' + tag + '></' + tag + '>') : $(tag).clone();

	$(containedTextNodes).wrap($wrapper);

	// TODO: Tidy, ie <b>Hello <b>Again</b><b>. It continues.</b></b> >> <b>Hello Again. It continues.</b>
	//M(this.currentField.selectron.contained(1, 1)).tidy(options.container ? options.container.tagName : options.tag);
	selectron.contained(element, 1, 1).forEach(function(contained) {
		contained.normalize();
	});

	positron.restore();
}

function link(element, attribute) {
	var sel = window.getSelection();
	var node = sel.focusNode.parentNode;
	if (node.tagName.toLowerCase() !== 'a') {
		node = sel.anchorNode.parentNode;
		if (node.tagName.toLowerCase() !== 'a') {
			node = null;
		}
	}

	var href = 'http://';
	if (node) {
		var range = document.createRange();
		range.selectNodeContents(node);
		href = node.attributes.href.value;
		sel.removeAllRanges();
		sel.addRange(range);
	}
	var result = prompt('Link address:', href);

	if (result !== '') {
		document.execCommand('createLink', null, result);
	} else {
		document.execCommand('unlink');
	}
}

function list(element, tag){
	var that = this;
	var tags = {
		ordered: 'OL',
		unordered: 'UL'
	};
	var $list = $('<' + tag + '></' + tag + '>');
	var positron = selectron.get(null, true);
	var containedChildren = selectron.contained(element, 1, 1);

	if(containedChildren.length === 1 && containedChildren[0].tagName === tag) return;

	$(containedChildren[0]).before($list);

	containedChildren.forEach(function(child){
		if(child.nodeName === 'UL' || child.nodeName === 'OL') {
			var li = $(child).children('li').toArray();
			var containedLi = that.currentField.selectron.contained(li);
			var startIndex = li.indexOf(containedLi[0]);

			containedLi.forEach(function(innerChild) {
					$list.append(innerChild);
			});

			if(!child.firstChild) $(child).remove();

			else if(startIndex > 0) {
				var $bottomList = $('<' + child.tagName + '><' + child.tagName + '/>');
				while(startIndex < child.childNodes.length) {
					$(child).after($bottomList);
					$bottomList.prepend(child.lastChild);
				}
				$(child).after($list);
			}
		} else {
			var $listItem = $('<li></li>');
			$list.append($listItem);
			while(child.firstChild) {
				$listItem.append(child.firstChild);
			}
			$list.append($listItem);
			$(child).remove();
		}
	});
	positron.restore();
}

function newline(element) {
	var rng = selectron.range();
	var block = rng.startContainer.nodeType === 1 && $(rng.startContainer).is(blockTags.join(',')) ? rng.startContainer : $(rng.startContainer).closest(blockTags.join(','), element)[0];

	var positron = selectron.get(element, block, true);
	var contents;

	if($(block).is('LI') && block.textContent.length === 0) {
		// TODO check if there is ancestor LI, if so outdent instead
		this.actions.block.call(this, { tag: 'P' });
	} else {
		var $el = $('<' + block.tagName + '>');
		$(block).after($el);
		if(positron.end.offset !== positron.end.ref.textContent.length) {
			positron.end = { ref: block, offset: block.textContent.length };
			positron.restore();
			contents = selectron.range().extractContents();
		}

		while(contents && contents.firstChild) 
			$el.append(contents.firstChild);

		setBR([ $el[0], block ]);

		selectron.set($el[0], 0);
	}
}

function paste(element, dataTransfer) {
	var rng = selectron.range();

	var str = dataTransfer.getData('Text');
	str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+$/g, '');
	var arr = str.split(/[\n\r]+/);

	var block = rng.startContainer.nodeType === 1 && $(rng.startContainer).is(blockTags.join(',')) ? rng.startContainer : $(rng.startContainer).closest(blockTags.join(','), element)[0];
	var positron = selectron.get(element, block);
	var textNode;
	if(arr.length === 0) {
		return;
	} else if (arr.length === 1) {
		textNode = document.createTextNode(arr[0]);
		if(rng.startOffset === 0) {
			if(rng.startContainer.nodeType === 1) {
				if(rng.startContainer.lastChild.nodeName === 'BR')
					$(rng.startContainer.lastChild).remove();
				$(rng.startContainer).prepend(textNode);
			} else $(rng.startContainer.parentNode).prepend(textNode);
		} else if (rng.startOffset === rng.startContainer.textContent.length) {
			if(rng.startContainer.nodeType === 1) $(rng.startContainer).append(textNode);
			else $(rng.startContainer.parentNode).append(textNode);
		} else {
			var node = rng.startContainer;
			node.splitText(rng.endOffset);
			$(node).after(textNode);
		}
		positron.start.offset = positron.start.offset + textNode.textContent.length;
		positron.end = positron.start;
	} else {
		positron.end = { ref: block, offset: block.textContent.length };
		positron.restore();

		var contents = selectron.range().extractContents();
		for(var i = arr.length - 1; i >= 0; i--) {
			textNode = document.createTextNode(arr[i]);
			if(i === 0) {
				if(block.lastChild.nodeName === 'BR')
					$(block.lastChild).remove();
				$(block).append(textNode);
			} else {
				var $el = $('<' + block.tagName + '>');
				$el.append(textNode);
				if(i === arr.length - 1) {
					while(contents.firstChild) {
						$el.append(contents.firstChild);
					}
					positron.start = { ref: $el[0], offset: textNode.textContent.length, isAtStart: false };
					positron.end = positron.start;
				}
				$(block).after($el);
			}
		}
	}
	positron.restore();

	//document.execCommand('insertText', null, str);
}

function removeFormat(element) {
	document.execCommand('removeFormat');
	element.normalize();
}

function setBR(element) {
	if(element instanceof Array) 
		return element.forEach(setBR);
	
	if(element.firstChild && element.firstChild === element.lastChild && element.firstChild.nodeType === 3 && element.firstChild.textContent.length === 0)
		element.removeChild(element.firstChild);

	if(!element.firstChild) $(element).append('<BR>');
	else {
		var br = element.getElementsByTagName('BR');
		var length = br.length;
		for(var i = 0; i < length; i++) {
			if(br[i].previousSibling) {
				$(br[i]).remove();
				i--;
				length--;
			}
		}
	}
}

module.exports = {
	align: align,
	block: block,
	clearTextNodes: clearTextNodes,
	deleteRangeContents: deleteRangeContents,
	format: format,
	indent: indent,
	join: join,
	link: link,
	list: list,
	newline: newline,
	paste: paste,
	removeFormat: removeFormat,
	setBR: setBR
};
