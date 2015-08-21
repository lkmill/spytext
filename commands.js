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
	var contained = selectron.contained(element, blockTags.join(','), null, true),
		newBlocks = [];
	
	contained = contained.filter(function(node) {
		// this is to filter out LI with nested lists where only text in the nested
		// list is selected, not text in the actual LI tag ((previous) siblings to the nested <ul>)
		return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(descendants(node, 3, 1));
	});

	var $startBlock = $(_.first(contained)),
		$endBlock = $(_.last(contained)),
		startOffset = selectron.getOffset($startBlock[0], 'start'),
		endOffset = selectron.getOffset($endBlock[0], 'end'),
		$ref;
	
	if($endBlock.is('LI')) {
		var $startList = $startBlock.closest('.spytext-field > *'),
			$endList = $endBlock.closest('.spytext-field > *');

		if(!$startList.is($endList)) {
			$ref = $endList;
		} if($endBlock[0].nextSibling || $endBlock.children('UL,OL').length > 0) {
			$ref = $('<' + $endList[0].tagName + '>').insertAfter($startList).append($endBlock.children('UL,OL').children()).append($endBlock.nextAll());
		} else {
			$ref = $endList.next();
		}
	} else {
		$ref = $endBlock.next();
	}

	contained.forEach(function(child,i){
		var $newBlock = $('<' + tag + '>');

		if($ref.length > 0) 
			$ref.before($newBlock);
		else
			$(element).append($newBlock);

		newBlocks.push($newBlock.append(child.childNodes)[0]);

		if($(child).parent().is(':empty'))
			$(child).parent().remove();
		else
			$(child).remove();
	});

	$(':empty:not("BR")', element).remove();
	
	selectron.set({
		start: {
			ref: _.first(newBlocks),
			offset: startOffset
		},
		end: {
			ref: _.last(newBlocks),
			offset: endOffset
		},
	});
}

function clearTextNodes(element) {
	function isBlock(node) {
		return node && node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
	}
	descendants(element, 3).forEach(function(textNode) {
		if(isBlock(textNode.previousSibling) || isBlock(textNode.nextSibling)) {
			textNode.textContent = textNode.textContent.trim();
			if(textNode.textContent.match(/^\s*$/)) {
				$(textNode).remove();
			} else if(textNode.parentNode.nodeName !== 'LI') {
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
	var length = node1.textContent.length;

	if($(node1).is('LI') && $(node2).is('LI')) {
		// both nodes to join are listitems...
		var $list1 = $(node1).closest('.spytext-field > *');
		var $list2 = $(node2).closest('.spytext-field > *');
		if(!$list1.is($list2)) {
			// we are joining two lists.
			$list1.append($list2.children());
			return;
		}
	}

	if(node1.lastChild.tagName === 'BR') node1.removeChild(node1.lastChild);
	$(node1).append(node2.childNodes);

	setBR(node1);

	if(!node2.nextSibling && !node2.previousSibling)
		$(node2).parent().remove();
	else
		$(node2).remove();

	selectron.set({
		ref: node1,
		offset: length
	});
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

function list(element, tag) {
	var contained = selectron.contained(element, blockTags.join(','), null, true),
		listItems = [];
	
	contained = contained.filter(function(node) {
		// this is to filter out LI with nested lists where only text in the nested
		// list is selected, not text in the actual LI tag ((previous) siblings to the nested <ul>)
		return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(descendants(node, 3, 1));
	});

	var $startBlock = $(_.first(contained)),
		$endBlock = $(_.last(contained)),
		startOffset = selectron.getOffset($startBlock[0], 'start'),
		endOffset = selectron.getOffset($endBlock[0], 'end'),
		$list;
	
	if($startBlock.is('LI')) {
		var $startList = $startBlock.closest('.spytext-field > *'),
			$endList;

		if($endBlock.is('LI'))
			$endList = $endBlock.closest('.spytext-field > *');

		if($startList.is(tag)) {
			$list = $startList;

			if($endList && $startList.is($endList))
				return;
		} else {
			$list = $('<' + tag + '>').insertAfter($startList);

			if($endList && $startList.is($endList) && ($endBlock[0].nextSibling || $endBlock.children('UL,OL').length > 0)) {
				$('<' + $endList[0].tagName + '>').insertAfter($list).append($endBlock.children('UL,OL').children()).append($endBlock.nextAll());
			}
		}
	} else {
		$list = $('<' + tag + '>').insertBefore($startBlock);
	}

	contained.forEach(function(child,i){
		var $listItem;

		if(child.tagName === 'LI') {
			$listItem = $(child);

			if(!$list.is($listItem.closest('.spytext-field > *'))) {
				(function recurse($listItem, $ref) {
					var $children = $listItem.children("UL,OL").remove();

					$ref.append($listItem);

					if($children.length > 0) {
						var $nestedList = $('<' + tag + '>').appendTo($listItem);
						$children.children().each(function() {
							recurse($(this), $nestedList);
						});
					}
				})($listItem, $list);
			}
		} else {
			$listItem = $('<li>');
			$list.append($listItem);
			$listItem.append(child.childNodes);

			if($(child).parent().is(':empty'))
				$(child).parent().remove();
			else
				$(child).remove();
		}
		listItems.push($listItem[0]);
	});

	$(':empty:not("BR")', element).remove();

	if($list.next()[0].tagName === $list[0].tagName) {
		// merge new list with next element if it is a list
		// of the same type
		$list.append($list.next().children());
		$list.next().remove();
	}

	
	selectron.set({
		start: {
			ref: _.first(listItems),
			offset: startOffset
		},
		end: {
			ref: _.last(listItems),
			offset: endOffset
		},
	});
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
	if(_.isArray(element)) 
		return element.forEach(setBR);
	
	if(element.firstChild && element.firstChild.tagName !== 'BR' && element.textContent.length === 0)
		$(element).empty();

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
