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
	var contained = selectron.contained(element, blockTags.join(','), null, true).filter(function(node) {
			// this is to filter out LI with nested lists where only text in the nested
			// list is selected, not text in the actual LI tag siblings to the nested <ul>)
			//
			// this is to fix error that occurs if you have selected LI from nested list, but not any text
			// nodes in the LI containing the nested list. The LI containing 
			return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(_.initial(node.childNodes), true);
		}),
		newBlocks = [],
		$startBlock = $(_.first(contained)),
		$endBlock = $(_.last(contained)),
		startOffset = selectron.offset($startBlock[0], 'start'),
		endOffset = selectron.offset($endBlock[0], 'end'),
		$ref;

	// $ref is the DOM element which we place our new
	// blocks before. if it is undefined, new blocks will
	// be appended to 'element'.
	
	if($endBlock.is('LI')) {
		// if endblock is in a list, we have to do some crazyness
		
		// begin by getting a reference to the ancestor lists
		// NOTE: $startList might not be a list. if $startBlock is not
		// a list, the $startList will be $startBlock (since all block
		// elements except LI are children of 'element'
		var $startList = $startBlock.closest('.spytext-field > *'),
			$endList = $endBlock.closest('.spytext-field > *');

		if(!$startList.is($endList)) {
			// if $startList and $endList are not the same
			// we place all new blocks before $endList
			$ref = $endList;
		} else if($endBlock[0].nextSibling || $endBlock.children('UL,OL').length > 0) {
			// if endBlock has following siblings or has a nested list,
			// create a new list and place it after startList.
			// place all new blocks before this new list
			$ref = $('<' + $endList[0].tagName + '>').insertAfter($startList).append($endBlock.children('UL,OL').children()).append($endBlock.nextAll());
		} else {
			// $startList is $endList and last selected LI is last child and has no 
			// nested list. simply place all new blocks after $startList/endList, ie
			// before the next element
			$ref = $endList.next();
		}
	} else {
		// $endBlock is not a list, simply place
		// new elements after $endBlocks next sibling
		$ref = $endBlock.next();
	}

	contained.forEach(function(child,i){
		var $newBlock = $('<' + tag + '>');

		// place the newBlock before the reference,
		// or append it to element
		if($ref.length > 0) 
			$ref.before($newBlock);
		else
			$(element).append($newBlock);


		newBlocks.push($newBlock.append(child.childNodes)[0]);

		// remove parent if child has no siblings,
		// otherwise simply remove the child
		if(!child.nextSibling && !child.previousSibling)
			$(child).parent().remove();
		else
			$(child).remove();
	});

	$(':empty:not("BR")', element).remove();
	
	// set the selection
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

	element.normalize();

	setBR(element);
}

function deleteRangeContents(element, rng) {
	rng = rng || selectron.range();


	var $startContainer = $(rng.startContainer),
		$startBlock = $startContainer.closest(blockTags.join(','), element),
		$endBlock = $(rng.endContainer).closest(blockTags.join(','), element),
		startPosition = {
			ref: $startBlock[0],
			offset: selectron.offset($startBlock[0], 'start')
		};

	rng.deleteContents();

	if(!$startBlock.is($endBlock)) {
		if($endBlock.is('LI')) {
			var $list;
			
			if($startBlock.is('LI')) {
				$list = $startBlock.parent();
			} else {
				$list = $endBlock.closest('.spytext-field > *');
			}

			var $nestedList = $endBlock.children('UL,OL');
			if($nestedList.length === 1) {
				if($startBlock.is('LI'))
					$startBlock.append($nestedList);
				else
					$list.append($nestedList.children());
			}

			if(!$list.is($endBlock.parent()) && $endBlock[0].nextSibling) {
				$list.append($endBlock.nextAll());
			}
		} 

		$startContainer.after($endBlock[0].childNodes);

		$endBlock.remove();
	}

	setBR($startBlock[0]);

	// deleteRangeContents will leave empty LI and UL. remove them.
	$(':empty:not("BR")', element).each(function() {
		var $el = $(this);
		var $parent;
		while($el.is(':empty')) {
			$parent = $el.parent();
			$el.remove();
			$el = $parent;
		}
	});

	selectron.set(startPosition);
}

function indent(element, outdent){
	var blocks = selectron.contained(element, blockTags.join(','), null, true).filter(function(node) {
			return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(_.initial(node.childNodes), true) || selectron.containsEvery(descendants(node, function(node) { return node.nodeType === 1 && !node.previousSibling; }, null, true), true);
		}),
		startBlock = _.first(blocks),
		endBlock = _.last(blocks),
		startOffset = selectron.offset(startBlock, 'start'),
		endOffset = selectron.offset(endBlock, 'end');

	blocks.forEach(function(el) {
		if(!$(el).is('LI')) return;

		var $prev = $(el).prev();

		if($prev.length === 1) {
			var $nestedList = $prev.children('UL,OL');
			if($nestedList.length === 0) {
				var tagName = $(el).closest('OL,UL')[0].tagName;
				$nestedList = $('<' + tagName + '>').appendTo($(el).prev());
			}
			$nestedList.append(el).append($(el).children('UL,OL').children());
		}
	});

	selectron.set({
		start: {
			ref: startBlock,
			offset: startOffset
		},
		end: {
			ref: endBlock,
			offset: endOffset
		},
	});
}

function joinPrev(element, block) {
	var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false);
	treeWalker.currentNode = block;

	var prev = treeWalker.previousNode();
	while(prev && blockTags.indexOf(prev.tagName) === -1) { 
		prev = treeWalker.previousNode();
	}

	// prev should only be null or undefined if backspace is called at beginning of field
	if(prev)
		return join(element, prev, block);
}

function joinNext(element, block) {
	var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false);
	treeWalker.currentNode = block;

	// delete
	var next = treeWalker.nextNode();
	while(next && blockTags.indexOf(next.tagName) === -1) { 
		next = treeWalker.nextNode();
	}

	// next should only be null or undefined if delete is called at beginning of field
	if(next)
		return join(element, block, next);
}

function join(element, node1, node2) {
	var length = node1.textContent.length;

	if(node1.firstChild && node1.firstChild.tagName === 'BR') $(node1.firstChild).remove();
	if(node1.lastChild && node1.lastChild.tagName === 'BR') $(node1.lastChild).remove();
	if(node2.lastChild && node2.lastChild.tagName === 'BR') $(node2.lastChild).remove();

	var $nestedList;

	if(($nestedList = $(node1).children('UL,OL')).length === 1) {
		// we have found a nested list in node1. this should
		// mean node2 is the first LI in the nested list
		// place all node2 childNOdes BEFORE the nested list
		// instead of appending to node1
		//
		// also update length to only be length of
		// text in node1 excluding length of text in nested list
		length = length - $nestedList.text().length;
		$nestedList.before(node2.childNodes);
	} else if(!$(node1).is('LI') && ($nestedList = $(node2).children('UL,OL')).length === 1) {
		// if first node is a normal block tag like P or H1,
		// and node2 is a list item with nested list
		$(node2).after($nestedList.children());
		$nestedList.remove();
	}

	if(node2.firstChild)
		$(node1).append(node2.childNodes);

	setBR(node1);

	if(!node2.nextSibling && !node2.previousSibling)
		// node2 has no siblings, IE parent is empty except
		// for node2. So remove parent
		$(node2).parent().remove();
	else
		// node2 has at least one sibling, only remove node2
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
		// list is selected, not text in the actual LI tag siblings to the nested <ul>)
		//
		// this is to fix error that occurs if you have selected LI from nested list, but not any text
		// nodes in the LI containing the nested list. The LI containing 
		return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(_.initial(node.childNodes), true);
	});

	var $startBlock = $(_.first(contained)),
		$endBlock = $(_.last(contained)),
		startOffset = selectron.offset($startBlock[0], 'start'),
		endOffset = selectron.offset($endBlock[0], 'end'),
		$list;

	// $list is a reference to the list all new
	// list items should be appended to
	
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

	var next = $list.next()[0];

	if(next && next.tagName === $list[0].tagName) {
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
	var $blockElement = $(rng.startContainer).closest(blockTags.join(','), element);

	if($blockElement.is('LI') && $blockElement.text().length - $blockElement.children('UL,OL').text().length === 0) {
		// TODO check if there is ancestor LI, if so outdent instead
		if($blockElement.parent().is($(element).children())) {
			block(element, 'P');
		} else {
			outdent(element);
		}
		return;
	}

	var position = selectron.get($blockElement[0]);
	var contents;

	var $el = $('<' + $blockElement[0].tagName + '>').append('<BR>');

	$blockElement.before($el);

	if(position.end.offset !== 0) {
		position.start = { ref: $blockElement[0], offset: 0 };
		selectron.set(position);
		contents = selectron.range().extractContents();
	}

	while(contents && contents.lastChild) 
		$el.prepend(contents.lastChild);

	$el[0].normalize();
	$blockElement[0].normalize();

	setBR([ $el[0], $blockElement[0] ]);

	selectron.set({
		ref: $blockElement[0]
	});
}

function outdent(element){
	var blocks = selectron.contained(element, blockTags.join(','), null, true).filter(function(node) {
			// this is to filter out LI with nested lists where only text in the nested
			// list is selected, not text in the actual LI tag siblings to the nested <ul>)
			//
			// this is to fix error that occurs if you have selected LI from nested list, but not any text
			// nodes in the LI containing the nested list. The LI containing 
			return node.nodeName !== 'LI' || $(node).children('UL,OL').length === 0 || selectron.containsSome(_.initial(node.childNodes), true);
		}),
		startOffset = selectron.offset(_.first(blocks), 'start'),
		endOffset = selectron.offset(_.last(blocks), 'end');

	blocks.reverse().forEach(function(el, i) {
		if(!$(el).is('LI') || $(el).parent().is($(element).children())) {
			return;
		} else {
			if(el.nextSibling) {
				var $nestedList = $(el).children('UL,OL');
				if($nestedList.length === 0) {
					var tagName = $(el).closest('OL,UL')[0].tagName;
					$nestedList = $('<' + tagName + '>').appendTo(el);
				}
				$nestedList.append($(el).nextAll());
			}
			$(el).parent().parent().after(el);
		}
	});

	selectron.set({
		start: {
			ref: _.last(blocks),
			offset: startOffset
		},
		end: {
			ref: _.first(blocks),
			offset: endOffset
		},
	});
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

	if(!element.firstChild || $(element.firstChild).is('UL,OL'))
		$(element).prepend('<BR>');
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
	joinPrev: joinPrev,
	joinNext: joinNext,
	link: link,
	list: list,
	newline: newline,
	outdent: outdent,
	paste: paste,
	removeFormat: removeFormat,
	setBR: setBR
};
