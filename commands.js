require('jquery-ancestors');

var selectron = require('./selectron');

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

var descendants = require('./descendants');

function align(element, alignment) {
	var containedChildren = selectron.contained(element, 1, 1, true);
	containedChildren.forEach(function(child) {
		if(!$(child).is('ul, ol')) $(child).css('text-align', alignment);
	});
}

function block(element, tag) {
	function _block(node, ref) {
		var $newBlock = $('<' + tag + '>');
		if(ref)
			$(ref).before($newBlock);
		else
			$(element).append($newBlock);

		$newBlock.append(node.childNodes);
		$(node).remove();
		setBR($newBlock[0]);
		blocks.push($newBlock[0]);
	}
	var contained = selectron.contained(element, blockTags.join(','), null, true),
		startOffset = selectron.getOffset(_.first(contained), 'start'),
		endOffset = selectron.getOffset(_.last(contained), 'end'),
		blocks = [];
	
	contained.forEach(function(child){
		if(child.nodeName === 'LI') {
			var $list = $(child.parentNode);
			_block(child, child.previousSibling ? $list[0].nextSibling : $list[0]);

			if(!$list[0].firstChild) $(child).remove();
		} else {
			_block(child, child);
		}
	});
	
	selectron.set({
		start: {
			ref: _.first(blocks),
			offset: startOffset
		},
		end: {
			ref: _.last(blocks),
			offset: endOffset
		},
	});
}

function clearTextNodes(element) {
	function isBlock(node) {
		return node && node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
	}
	descendants(element, 3).forEach(function(textNode) {
		if(textNode.previousSibling || isBlock(textNode.nextSibling)) {
			if(textNode.textContent.match(/^\s+$/)) {
				$(textNode).remove();
			} else {
				$(textNode).text(textNode.textContent.trim());
				$(textNode).wrap('<p>');
			}
		}
	});

	if(!element.firstChild) {
		$(element).append('<p><br /></p>');
	}

	setBR(element);
}

function deleteRangeContents(element, rng) {
	var commonAncestor = rng.commonAncestorContainer;

	// Test if we can just call deleteRange contents. basically it checks if we have selected more than
	// one block element.
	if(commonAncestor === element || (commonAncestor.nodeType === 1 && $(commonAncestor).is('UL, OL'))) {
		var $startBlock = $(rng.startContainer).closest(blockTags.join(','), element);

		var $completelyContainedBlocks = $(selectron.contained(element, blockTags.join(',')));

		var $endBlock = $(rng.endContainer).closest(blockTags.join(','), element);

		var startPosition = {
			ref: $startBlock[0],
			offset: selectron.getOffset($startBlock[0], 'start')
		};

		var endPosition = {
			ref: $endBlock[0],
			offset: selectron.getOffset($endBlock[0], 'end')
		};

		selectron.set({
			start: startPosition,
			end: {
				ref: $startBlock[0],
				offset: $startBlock[0].textContent.length
			}
		});

		selectron.range().deleteContents();

		selectron.set({
			start: {
				ref: $endBlock[0],
				offset: 0
			},
			end: endPosition
		});

		selectron.range().deleteContents();

		$completelyContainedBlocks.remove();

		$startBlock.append($endBlock[0].childNodes);

		var $parent = $endBlock.parent();

		if($startBlock.is('li') && $endBlock.is('li')) {
			$startBlock.parent().append($parent.children());
		}

		$endBlock.remove();


		setBR($startBlock[0]);

		selectron.set(startPosition);
	} else {
		rng.deleteContents();
	}
}

function indent(element, outdent){
	var allLi = selectron.contained(element, 'li', null, true);
	var position = selectron.get(element);
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
	selectron.set(position);
}

function join(element, node1, node2) {
	var position = selectron.get(element);
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

	if(!node2.firstChild || node2.textContent.length === 0)
		$(node2).remove();
	else
		setBR(node2);

	if(!pa.firstChild)
		$(pa).remove();

	setBR(node1);
	selectron.set(position);
}

function format(element, tag){
	if(!tag) return removeFormat(element);
	var position = selectron.get(element);
	var containedTextNodes = selectron.contained(element, 3, null, true);
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
	selectron.contained(element, 1, 1, true).forEach(function(contained) {
		contained.normalize();
	});

	selectron.set(position);
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
	var position = selectron.get(element);
	var containedChildren = selectron.contained(element, 1, 1, true);

	if(containedChildren.length === 1 && containedChildren[0].tagName === tag) return;

	$(containedChildren[0]).before($list);

	containedChildren.forEach(function(child){
		if(child.nodeName === 'UL' || child.nodeName === 'OL') {
			var li = $(child).children('li').toArray();
			var containedLi = selectron.contained(element, li, null, true);
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
	selectron.set(position);
}

function newline(element) {
	var rng = selectron.range();
	var blockElement = rng.startContainer.nodeType === 1 && $(rng.startContainer).is(blockTags.join(',')) ? rng.startContainer : $(rng.startContainer).closest(blockTags.join(','), element)[0];

	if($(blockElement).is('LI') && blockElement.textContent.length === 0) {
		// TODO check if there is ancestor LI, if so outdent instead
		block(element, 'P');
	} else {
		var position = selectron.get(element);
		var contents;

		var $el = $('<' + blockElement.tagName + '>');

		$(blockElement).after($el);

		if(position.end.offset !== position.end.ref.textContent.length) {
			position.end = { ref: blockElement, offset: blockElement.textContent.length };
			selectron.set(position);
			contents = selectron.range().extractContents();
		}

		while(contents && contents.firstChild) 
			$el.append(contents.firstChild);

		setBR([ $el[0], blockElement ]);

		selectron.set({
			ref: $el[0]
		});
	}
}

function paste(element, dataTransfer) {
	var rng = selectron.range();

	var str = dataTransfer.getData('Text');
	str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+$/g, '');
	var arr = str.split(/[\n\r]+/);

	var blockElement = rng.startContainer.nodeType === 1 && $(rng.startContainer).is(blockTags.join(',')) ? rng.startContainer : $(rng.startContainer).closest(blockTags.join(','), element)[0];
	var position = selectron.get(element);
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
		position.start.offset = position.start.offset + textNode.textContent.length;
		position.end = position.start;
	} else {
		position.end = { ref: blockElement, offset: blockElement.textContent.length };
		selectron.set(position);

		var contents = selectron.range().extractContents();
		for(var i = arr.length - 1; i >= 0; i--) {
			textNode = document.createTextNode(arr[i]);
			if(i === 0) {
				if(blockElement.lastChild.nodeName === 'BR')
					$(blockElement.lastChild).remove();
				$(blockElement).append(textNode);
			} else {
				var $el = $('<' + blockElement.tagName + '>');
				$el.append(textNode);
				if(i === arr.length - 1) {
					while(contents.firstChild) {
						$el.append(contents.firstChild);
					}
					position.start = { ref: $el[0], offset: textNode.textContent.length, isAtStart: false };
					position.end = position.start;
				}
				$(blockElement).after($el);
			}
		}
	}
	selectron.set(position);

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
