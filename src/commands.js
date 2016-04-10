'use strict';
/**
 * All the commands for Spytext
 *
 * @module spytext/commands
 */

const selektr = require('selektr'),
	children = require('dollr/children'),
	is = require('dollr/is'),
	descendants = require('descendants'),
	sectionTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];

const initial = require('lodash/initial'),
	head = require('lodash/head'),
	last = require('lodash/last'),
	isArray = require('lodash/isArray'),
	toArray = require('lodash/toArray');


function listItemFilter(node) {
	// this is to filter out LI with nested lists where only text in the nested
	// list is selected, not text in the actual LI tag siblings to the nested <ul>)
	//
	// this is to fix error that occurs if you have selected LI from nested list, but not any text
	// nodes in the LI containing the nested list. The LI containing
	return node.nodeName !== 'LI' ||
		$(node).children('UL,OL').length === 0 ||
		selektr.containsSome(initial(node.childNodes), true) ||
		selektr.isAtEndOfSection(node);
}

/**
 * Uses inline CSS styles to set text-align property for
 * all blocks contained in current selection
 *
 * @static
 * @param	{Element} element - Reference element to be used for selektr to fetch elements contained in selection
 * @return {string} alignment
 */
function align(element, alignment) {
	selektr.contained(children(element, sectionTags.join())).forEach(function (child) {
		// do not set text-align property on lists
		$(child).css('text-align', alignment);
	});
}

align.active = function (option, styles) {
	return !!styles.alignment && styles.alignment === option;
};

align.disabled = function (option, styles) {
	return styles.blocks.length === 0;
};
/**
 * Changes all (partly) contained sections in the current selection to (block
 * level) elements of tagName `tag`.
 *
 * @static
 * @param	{Element} element - Reference element to be used for selektr to fetch elements contained in selection
 * @return {string} tag - Tag to turn blocks into. Ie H1 or P
 */
function block(element, tag) {
	//if(block.active(tag)) return;

	const sections = selektr.contained({ sections: true }, true).filter(listItemFilter),
		newBlocks = [],
		$startSection = $(head(sections)),
		$endSection = $(last(sections)),
		positions = selektr.get();

	let $ref;

	// $ref is the DOM element which we place our new
	// blocks before. if it is undefined, new blocks will
	// be appended to 'element'.

	if ($endSection.is('LI')) {
		// if endSection is a list item, we have to do some crazyness

		// begin by getting a reference to the ancestor lists
		// NOTE: $startList might not be a list. if $startSection is not
		// a list item, the $startList will be $startSection (since all block
		// elements except LI are children of 'element'
		const $startList = $startSection.closest(element.children),
			$endList = $endSection.closest(element.children);

		if (!$startList.is($endList)) {
			// if $startList and $endList are not the same
			// we place all new blocks before $endList
			$ref = $endList;
		} else if ($endSection[0].nextSibling || $endSection.children('UL,OL').length > 0) {
			// if endSection has following siblings or has a nested list,
			// create a new list and place it after startList.
			// place all new blocks before this new list
			$ref = $('<' + $endList[0].tagName + '>').insertAfter($startList).append($endSection.children('UL,OL').children()).append($endSection.nextAll());
		} else {
			// $startList is $endList and last selected LI is last child and has no
			// nested list. simply place all new blocks after $startList/endList, ie
			// before the next element
			$ref = $endList.next();
		}
	} else {
		// $endSection is not a list, simply place
		// new elements after $endSection next sibling
		$ref = $endSection.next();
	}

	sections.forEach(function (child, i) {
		const $newBlock = $('<' + tag + '>').attr('style', $(child).attr('style'));

		// place the newBlock before the reference,
		// or append it to element
		if ($ref.length > 0)
			$ref.before($newBlock);
		else
			$(element).append($newBlock);


		newBlocks.push($newBlock.append(child.childNodes)[0]);

		// remove parent if child has no siblings,
		// otherwise simply remove the child
		if (!child.nextSibling && !child.previousSibling)
			$(child).parent().remove();
		else
			$(child).remove();
	});

	$(':empty:not("BR")', element).remove();

	// set the selection
	selektr.restore(positions, true);
}

block.active = function (tag, styles) {
	return styles.blocks.length === 1 && styles.blocks[0] === tag.toUpperCase();
};

/**
 * Removes all empty text nodes adjacent to block level elements
 *
 * @static
 * @param	{Element} element - Element which descendants to look for empty text nodes
 */
function deleteEmptyTextNodes(element) {
	function isBlock(node) {
		return node && node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/);
	}

	descendants(element, {
		nodeType: 3
	}).forEach(function (textNode) {
		if (isBlock(textNode.previousSibling) || isBlock(textNode.nextSibling)) {
			textNode.textContent = textNode.textContent.trim();

			if (textNode.textContent.match(/^\s*$/)) {
				// textNode is empty or only contains whitespaces
				textNode.parentNode.removeChild(textNode);
			} else if (textNode.parentNode === element) {
				// if textNode is a child of element, wrap it in <p> tag
				$(textNode).wrap('<p>');
			}
		}
	});
}

/**
 * Removes all empty element nodes
 *
 * @static
 * @param	{Element} element - Element which descendants to look for empty text nodes
 */
function deleteEmptyElements(element) {
	$(':empty:not(BR)', element).each(function () {
		let $el = $(this);

		let $parent;

		// recurse up the DOM and delete all elements
		// until a non-empty $el is found
		while (!$el.is(element) && $el.is(':empty')) {
			$parent = $el.parent();
			$el.remove();
			$el = $parent;
		}
	});
}

/**
 * Removes all empty text nodes adjacent to block level elements
 *
 * @static
 * @param	{Element} element - Element which descendants to look for empty text nodes
 * @param	{Range} [rng] -
 */
function deleteRangeContents(element, rng) {
	// fetch range if rng is not set
	rng = rng || selektr.range();

	const $startContainer = $(rng.startContainer),
		$startSection = $(head(selektr.contained({ sections: true }, true))),
		$endSection = $(last(selektr.contained({ sections: true }, true))),
		position = selektr.get('start');

	// use native deleteContents to remove the contents of the selection,
	rng.deleteContents();

	if (!$startSection.is($endSection)) {
		// if $startSection is not $endSection, we need to clean up any mess that
		// deleteContents has left and then append all childNodes of $endSection to $startSection

		if ($endSection.is('LI')) {
			// $endSection is a list item... we might need to clear up a mess

			// $list will be the list to which we move any nested lists of $endSection
			// to and any of $endSection's next siblings
			let $list;
			const $nestedList = $endSection.children('UL,OL');

			if ($startSection.is('LI')) {
				// $startSection is a listItem,

				// move listItems to $startSection's parent list)
				$list = $startSection.parent();

				// append potential $nestedList to $startSection
				$startSection.append($nestedList);
			} else {
				// $startSection is not a listItem which means all $endSection's previous listItems
				// have been selected. Move listItems to $endSection outermost containing list
				$list = $endSection.closest(element.children);

				// append all $nestedList's children to $list
				$list.append($nestedList.children());
			}

			if (!$list.is($endSection.parent()) && $endSection[0].nextSibling) {
				// append all next siblings to $endSection, but only
				// if $list is not $endSection's parent (because then target
				// and source will be same)
				$list.append($endSection.nextAll());
			}
		}

		// Move all childNodes from $endSection to $startSection by inserting them
		// after $startContainer (should now be a at the end of $startSection).
		// $startContainer is used instead of appending to $startSection in case a nested list
		// has been appended to $startSection, otherwise the childNodes would be
		// incorrectly placed after this nested list.
		if ($startContainer[0].nodeType === 1)
			$startContainer.prepend($endSection[0].childNodes);
		else
			$startContainer.after($endSection[0].childNodes);

		// remove the empty $endSection
		$endSection.remove();
	}

	$startSection[0].normalize();

	setBR($startSection[0]);

	deleteEmptyElements(element);

	selektr.restore(position, true);
}

/**
 * Indents all list items (<LI>) contained in the current selection
 *
 * @static
 * @param	{Element} element - Element which descendants to look for empty text nodes
 */
function indent(element, isOutdent) {
	if (isOutdent) return outdent(element);

	const listItems = selektr.contained(element.querySelectorAll('li'), true).filter(function (node) {
			return listItemFilter(node) ||
				selektr.containsEvery(descendants(node, {
					nodeType: 1,
					filter: function (node) { return !node.previousSibling; },
					onlyDeepest: true
				}), true);
		}),
		positions = selektr.get();

	listItems.forEach(function (el) {
		const $prev = $(el).prev();

		if ($prev.length === 1) {
			// only allow indenting list items if they are not the head items in their list

			// try to fetch the current element's nested list
			let $nestedList = $prev.children('UL,OL');
			if ($nestedList.length === 0) {
				// if the previous list item has no nested list, create a new one
				const tagName = $(el).closest('OL,UL')[0].tagName;
				$nestedList = $('<' + tagName + '>').appendTo($(el).prev());
			}
			// append the list item itself to the previous list items nested list.
			// if the list item itself has a nested list, append all list items
			// on this nested list to the previous elements nested list
			$nestedList.append(el).append($(el).children('UL,OL').children());
		}
	});

	// restore the selection
	selektr.restore(positions, true);
}

indent.disabled = function (option, styles) {
	return styles.lists.length === 0;
};

/**
 * Join `section` with the previous section. Uses a treeWalker to determine
 * what the previous section will be
 *
 * @static
 * @param	{Element} element - Element which is used as root for the TreeWalker
 * @param	{Element} section - Element which should be join the the previous section
 */
function joinPrev(element, section) {
	const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false);
	treeWalker.currentNode = section;

	let prev = treeWalker.previousNode();

	while (prev && sectionTags.indexOf(prev.tagName) === -1) {
		prev = treeWalker.previousNode();
	}

	// prev should only be null or undefined if backspace is called at beginning of field
	if (prev)
		return join(element, prev, section);
}

/**
 * Join `section` with the next section. Uses a treeWalker to determine
 * which the next section is
 *
 * @static
 * @param	{Element} element - Element which is used as root for the TreeWalker
 * @param	{Element} section - Element which should be join the next section
 */
function joinNext(element, section) {
	const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false);
	treeWalker.currentNode = section;

	// delete
	let next = treeWalker.nextNode();
	while (next && sectionTags.indexOf(next.tagName) === -1) {
		next = treeWalker.nextNode();
	}

	// next should only be null or undefined if delete is called at beginning of field
	if (next)
		return join(element, section, next);
}

/**
 * Joins `node1` with `node2`.
 *
 * @static
 * @param	{Element} element - Element which is used as root for the TreeWalker
 * @param	{Element} node1 - First node to join
 * @param	{Element} node2 - Second node to join
 */
function join(element, node1, node2) {
	if (node1.headChild && node1.headChild.tagName === 'BR') $(node1.headChild).remove();
	if (node1.lastChild && node1.lastChild.tagName === 'BR') $(node1.lastChild).remove();
	if (node2.lastChild && node2.lastChild.tagName === 'BR') $(node2.lastChild).remove();

	let $nestedList,
		position;

	if (($nestedList = $(node1).children('UL,OL')).length === 1) {
		// `node1` has a nested list, and `node2` should
		// be the head list item in the nested list. this means
		// we can leave the nested list, and simply insert
		// `node2` children before the nested list in `node1`.

		// update length to only be length of text in `node1` excluding length of
		// text in nested list, so selektr sets the position correctly
		//length = length - $nestedList.text().length;

		position = {
			ref: node1,
			offset: selektr.count(node1, $nestedList[0])
		};

		$nestedList.before(node2.childNodes);
	} else if (!$(node1).is('LI') && ($nestedList = $(node2).children('UL,OL')).length === 1) {
		// `node1` is a not a list item, and `node2` has nested list. decrease the
		// nested list's level by moving all its children to after `node2`, then
		// remove the nested list.

		// insert $nestedList's list items after `node2`
		$(node2).after($nestedList.children());

		// remove the empty $nestedList
		$nestedList.remove();
	}

	position = position || {
		ref: node1,
		offset: selektr.count(node1)
	};

	// append any childNodes of `node2` to `node1` (this will already be done if `node1` had a nested list
	$(node1).append(node2.childNodes);

	node1.normalize();
	setBR(node1);

	if (!node2.nextSibling && !node2.previousSibling)
		// `node2` has no siblings, so remove parent
		$(node2).parent().remove();
	else
		// `node2` has at least one sibling, only remove `node2`
		$(node2).remove();

	selektr.restore(position, true);
}

/**
 * Formats text by wrapping text nodes in elements with tagName `tag`.
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 * @param	{string|Element} [tag] - Tag to format text with. If tag is omited, `removeFormat` will be called instead
 */
function format(element, tag) {
	function unwrap(el) {
		$(tag, el).each(function () {
			if (this.headChild)
				$(this.headChild).unwrap();
			else
				$(this.remove());
		});
	}

	// TODO need to find a better way to removeFormat
	//if(format.active(tag)) return removeFormat(element, tag);

	const rng = selektr.range(),
		$wrapper = $('<' + tag + '>');

	if (!rng.collapsed) {
		const positions = selektr.get(),
			absolutePositions = selektr.get(true),
			sections = selektr.contained({ sections: true }, true).filter(listItemFilter),
			startSection = head(sections),
			endSection = last(sections);
		let contents,
			$clone;

		sections.slice(1, -1).forEach(function (section) {
			unwrap(section);
			let childNodes = toArray(section.childNodes);

			if ($(last(childNodes)).is('UL,OL'))
				childNodes = initial(childNodes);

			$clone = $wrapper.clone();
			$(section).prepend($clone);
			$clone.append(childNodes);
		});

		if (startSection !== endSection) {
			selektr.set({
				start: {
					ref: endSection,
					offset: 0
				},
				end: absolutePositions.end
			});
			$clone = $wrapper.clone();
			contents = selektr.range().extractContents();
			unwrap(contents);
			$(endSection).prepend($clone);
			$clone.append(contents.childNodes);

			endSection.normalize();
			deleteEmptyElements(endSection);
			tidy(endSection);
			endSection.normalize();

			selektr.set({
				start: absolutePositions.start,
				end: {
					ref: startSection,
					offset: $(last(startSection.childNodes)).is('UL,OL') ? startSection.childNodes.length - 1 : startSection.childNodes.length
				}
			});
		}

		contents = selektr.range().extractContents();
		unwrap(contents);
		$clone = $wrapper.clone();
		rng.insertNode($clone[0]);
		$clone.append(contents.childNodes);

		startSection.normalize();
		deleteEmptyElements(startSection);
		tidy(startSection);
		startSection.normalize();

		// restore the selection
		selektr.restore(positions, true);
	} else {
		rng.insertNode($wrapper[0]);
		selektr.set({ ref: $wrapper[0] }, true);
	}
}

format.active = function (option, styles) {
	return !!option && styles.formats.indexOf(option.toLowerCase()) > -1;
};

/**
 * Formats text by wrapping text nodes in elements with tagName `tag`.
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 * @param	{string|Element} [tag] - Tag to format text with. If tag is omited, `removeFormat` will be called instead
 */
function link(element, attribute) {
	const sel = window.getSelection();
	let node = sel.focusNode.parentNode;
	if (node.tagName.toLowerCase() !== 'a') {
		node = sel.anchorNode.parentNode;
		if (node.tagName.toLowerCase() !== 'a') {
			node = null;
		}
	}

	let href = 'http://';

	if (node) {
		const range = document.createRange();
		range.selectNodeContents(node);
		href = node.attributes.href.value;
		sel.removeAllRanges();
		sel.addRange(range);
	}

	const result = prompt('Link address:', href);

	if (result !== '') {
		document.execCommand('createLink', null, result);
	} else {
		document.execCommand('unlink');
	}
}

/**
 * Turns block elements into list items
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 * @param	{string} tag - The type of list tag, unordered (<UL>) or ordered (<OL>) lists.
 */
function list(element, tag) {
	// TODO we might have to reimplement the commented line below. currently this works fine
	// because the list button is disabled when active, but if one calls the list command
	// on the same kind of list, it will probably split it into a new, same kind list
	//if(list.active(tag)) return;

	const sections = selektr.contained({ sections: true }, true).filter(listItemFilter),
		listItems = [],
		positions = selektr.get();

	const $startSection = $(head(sections)),
		$endSection = $(last(sections));
	let $list;

	// $list is a reference to the list all new
	// list items should be appended to. Essentially,
	// after the next block of conditionals
	// we should be able to append all contained sections
	// to $list and not have to wrorry about remaining lists

	if ($startSection.is('LI')) {
		// $startList and $endList should reference lists furthest up the DOM, ie children of
		// the fields element
		const $startList = $startSection.closest(element.children);
		let $endList;

		if ($endSection.is('LI'))
			$endList = $endSection.closest(element.children);

		if ($startList.is(tag)) {
			// $startList is already the correct list type
			// simply append all new list items to this
			$list = $startList;

			if ($endList && $startList.is($endList)) {
				// we have only selected one list and that list
				// is already the correct list type, so do nothing
				return;
			}
		} else {
			// $startList is the wrong list type, we need to create a new list
			// and insert it after $startList
			$list = $('<' + tag + '>').insertAfter($startList);

			if ($endList && $startList.is($endList) && ($endSection[0].nextSibling || $endSection.children('UL,OL').length > 0)) {
				// $endSection is a listItem, $startList is the same as $endList and is
				// the wrong list type AND $endSection either has following siblings or
				// has a nested list. Thus, we need to create a new list, place it
				// after $list and append siblings and nested lists of $endSection to it
				//
				// the important part here is that $endSection has either next siblings or nested lists. if it did not,
				// $endList would be empty at the end of the call to list and thus removed automatically
				$('<' + $endList[0].tagName + '>').insertAfter($list).append($endSection.children('UL,OL').children()).append($endSection.nextAll());
			}
		}
	} else {
		// if $startSection is not a list we need to create a new
		// list that we can append all new list items to.
		// insert this new list before $startSection
		//
		// if $endSection is also a list, all sections inbetween $startSection
		// and $endSection will be selected, thus moved into $list and $list
		// will eventually become previousSibling to $endSection
		$list = $('<' + tag + '>').insertBefore($startSection);
	}

	sections.forEach(function (child, i) {
		let $listItem;

		if (child.tagName === 'LI') {
			// the child is itself a list item, we can simply
			// move it around and do not need a new element
			$listItem = $(child);

			if (!$list.is($listItem.closest(element.children))) {
				// only move the listItem if it is not already
				// contained within the target $list

				// recurse essentially appends the list items to the
				// target $list, but also correctly handles nested lists
				// of the wrong type.
				(function recurse($listItem, $ref) {
					// TODO do not do this if target and soruce list are the same type
					// ie. all nested lists are already the correct list type
					//
					// remove any nested list and save a reference to it
					const $children = $listItem.children('UL,OL').remove();

					// append $listItem to $ref (which will be the target list
					// if we are on head level
					$ref.append($listItem);

					// check if we had found (and removed) any nested lists
					if ($children.length > 0) {
						// create a new nested list and append it to the $listItem
						const $nestedList = $('<' + tag + '>').appendTo($listItem);

						// recurse through all of the old nested lists list items
						// and add them to the new nested list
						$children.children().each(function () {
							recurse($(this), $nestedList);
						});
					}
				})($listItem, $list);
			}
		} else {
			// child is not a list item, create a new list item
			// and append all of child's childNodes to it
			$listItem = $('<li>').appendTo($list).append(child.childNodes);

			if (!child.previousSibling && !child.nextSibling)
				// remove child's parent if child is only sibling
				$(child).parent().remove();
			else
				// remove only child if it has no siblings
				$(child).remove();
		}
		// we save a reference to all listItems so we can use
		// them to correctly restore the selection
		listItems.push($listItem[0]);
	});

	// remove empty elements
	$(':empty:not("BR")', element).remove();

	selektr.restore(positions, true);
}

list.active = function (option, styles) {
	return styles.blocks.length === 0 && styles.lists.length === 1 && is(styles.lists[0], option);
};

/**
 * Creates a new section (same type as the type of section the caret is currently in.)
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 * @param	{string|Element} [tag] - Tag to format text with. If tag is omited, `removeFormat` will be called instead
 */
function newSection(element) {
	const rng = selektr.range();
	const $section = $(rng.startContainer).closest(sectionTags.join(','), element);

	if ($section.is('LI') && ($section.text().length - $section.children('UL,OL').text().length === 0)) {
		// we are in an empty list item (could have a nested list though)

		if ($section.parent().is($(element).children())) {
			// list items containing list is child of element... no levels to outdent
			// so create a new
			block(element, 'P');
		} else {
			// list item of level greater than 1, outdent
			outdent(element);
		}
		return;
	}

	// create a new block with the same tag as blockElement, insert it before blockElement and append
	// the contents of the extracted range to it's end
	//const $el = $('<' + $section[0].tagName + '>').attr('style', $section.attr('style')).insertAfter($section);
	const $el = $('<' + (!$section.is('LI') && selektr.isAtEndOfSection() ? 'p' : $section[0].tagName) + '>').attr('style', $section.attr('style')).insertAfter($section);

	if ($section.children().is('UL,OL') || !selektr.isAtEndOfSection()) {
		// Select everything from the start of blockElement to the caret. This
		// includes everything that will be moved into the new block placed before the current
		selektr.set({
			start: {
				ref: rng.startContainer,
				offset: rng.startOffset
			},
			end: {
				ref: $section[0],
				offset: $section[0].childNodes.length
			}
		});

		// extract the contents
		const contents = selektr.range().extractContents();

		deleteEmptyElements($section[0]);
		$el.append(contents.childNodes);
	}

	// normalize any textnodes
	$el[0].normalize();
	$section[0].normalize();

	// ensure correct BR on both affected elements
	setBR([ $el[0], $section[0] ]);

	selektr.set({
		ref: $el[0]
	}, true);
}

/**
 * Outdents all list items contained in the selection one level
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 */
function outdent(element) {
	const listItems = selektr.contained(element.querySelectorAll('li'), true).filter(listItemFilter),
		positions = selektr.get();

	// we outdent in the reverse order from indent
	listItems.reverse().forEach(function (li, i) {
		if (!$(li).is('LI') || $(li).parent().is($(element).children())) {
			// do nothing if not a list item, or if list item
			// is already top level (level 1), ie if it's parent is a child
			// of element
			return;
		}

		if (li.nextSibling) {
			// the list item has following siblings, we need
			// to move them into a new or existing nested list

			// attempt to selected a nested list
			let $nestedList = $(li).children('UL,OL');

			if ($nestedList.length === 0) {
				// if there is no nested list, create a new one
				const tagName = $(li).closest('OL,UL')[0].tagName;
				$nestedList = $('<' + tagName + '>').appendTo(li);
			}

			// append all list item's next siblings to the nestedlist
			$nestedList.append($(li).nextAll());
		}

		// actual outdenting. Place the list item after its closest LI ancestor
		$(li).parent().parent().after(li);
	});

	selektr.restore(positions);
}

/**
 * Pastes the data of the dataTransfer. Deletes range contents if selection is
 * not collapsed
 *
 * @static
 * @param	{Element} element - Element which is used as root for selektr.
 * @param	{DataTransfer} dataTransfer - Must have a getData method which returns pure text string
 */
function paste(element, dataTransfer) {
	let rng = selektr.range();
	const textBlocks = dataTransfer.getData('Text').replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+$/g, '').split(/[\n\r]+/);

	if (!rng.collapsed) {
		// delete range contents if not collapsed
		deleteRangeContents(element, rng);
		rng = selektr.range();
	}


	if (textBlocks.length > 0) {
		const section = $(rng.startContainer).closest(sectionTags.join(','), element)[0];

		// Select everything from the caret to the end of section and
		// extract the contents. this is so we can to append the head text block
		// to the current section (where the extracted content will have been), and insert the extracted contents after the
		// last text block. if we are only pasting one text block, we could
		// have simply split the current node and inserted the contents inbetween,
		// but i decided for a tiny performance loss vs no code duplication
		selektr.set({
			start: selektr.get('start', true),
			end: { ref: section, offset: section.childNodes.length }
		});

		const contents = selektr.range().extractContents();

		// will be used to place new sections into the DOM
		const ref = section.nextSibling;
		// if no next sibling, save reference to parent
		const parent = section.parentNode;

		let textNode,
			$el;

		for (let i = 0; i < textBlocks.length; i++) {
			textNode = document.createTextNode(textBlocks[i]);

			if (i === 0) {
				if (section.lastChild && section.lastChild.nodeName === 'BR')
					// remove the last item if it is a line break
					$(section.lastChild).remove();

				// since this is the head text Block,
				// simply append the textNode to the section
				$(section).append(textNode);
			} else {
				// create a new section
				$el = $('<' + section.tagName + '>').append(textNode);

				if (ref)
					// insert before the ref
					$(ref).before($el);
				else
					// append to parent if we have no ref
					$(parent).append($el);
			}
		}
		// append any contents extracted from the range prevously to the
		// last inserted new section, or section if only
		// one text block was pasted
		($el || $(section)).append(contents.childNodes);

		// set the range to end of last inserted textnode
		selektr.set({
			ref: textNode,
			offset: textNode.textContent.length,
		}, true);
	}
}


/**
 * Removes inline formatting of selection
 *
 * @static
 * @param	{Element} element - Only used to normalize text nodes
 */
function removeFormat(element, tag) {
	function unwrap(el) {
		$(tag, el).each(function () {
			if (this.headChild)
				$(this.headChild).unwrap();
			else
				$(this.remove());
		});
	}

	if (!tag) {
		document.execCommand('removeFormat');
		element.normalize();
	} else {
		let rng = selektr.range();

		if (!rng.collapsed) {
			const positions = selektr.get(element),
				absolutePositions = selektr.get(true),
				sections = selektr.contained({ sections: true }, true).filter(listItemFilter),
				startSection = head(sections),
				endSection = last(sections);

			let contents;

			sections.slice(1, -1).forEach(unwrap);

			if (startSection !== endSection) {
				selektr.set({
					start: {
						ref: endSection,
						offset: 0
					},
					end: absolutePositions.end
				});
				contents = selektr.range().extractContents();
				unwrap(contents);
				$(endSection).prepend(contents.childNodes);

				endSection.normalize();
				deleteEmptyElements(endSection);
				tidy(endSection);
				endSection.normalize();

				selektr.set({
					start: absolutePositions.start,
					end: {
						ref: startSection,
						offset: $(last(startSection.childNodes)).is('UL,OL') ? startSection.childNodes.length - 1 : startSection.childNodes.length
					}
				});
			}

			contents = selektr.range().extractContents();
			unwrap(contents);
			if (startSection !== endSection)
				if ($(last(startSection.childNodes)).is('UL,OL'))
					$(last(startSection.childNodes)).before(contents.childNodes);
				else
					$(startSection).append(contents.childNodes);
			else {
				selektr.set(absolutePositions.start);
				rng = selektr.range();
				let ref = rng.endContainer;
				const $tag = $(ref).closest(tag, element);

				if ($tag.length === 1) {
					selektr.set({
						start: {
							ref: ref,
							offset: rng.endOffset
						},
						end: {
							ref: $tag[0],
							offset: $tag[0].childNodes.length
						}
					});
					const newContents = selektr.range().extractContents();
					unwrap(newContents);
					$('<' + tag + '>').insertAfter($tag).append(newContents.childNodes);
					ref = $tag[0];
				}
				$(ref).after(contents.childNodes);
			}

			startSection.normalize();
			deleteEmptyElements(startSection);
			tidy(startSection);
			startSection.normalize();

			// restore the selection
			selektr.restore(positions);
		}
	}
}

/**
 * Removes trailing <BR>s
 *
 * @static
 * @param	{Element} element - Element whos descendants need to be checked of extraneous BR tags
 */
function setBR(element) {
	if (isArray(element))
		return element.forEach(setBR);

	if (!element.firstChild ||
		($(element.lastChild).is('UL,OL') && $(element).text().length - $(element.lastChild).text().length === 0 &&
			$(element.lastChild).prevAll('br').length === 0 && $(element.lastChild).prevAll().find('br').length === 0)) {
		$(element).prepend('<BR>');
	} else {
		$('BR:last-child', element).each(function (i, br) {
			if (br.nextSibling) return;

			while (br.previousSibling && br.previousSibling.tagName === 'BR') {
				$(br.previousSibling).remove();
			}

			if (br.previousSibling)
				$(br).remove();
		});
	}
}

function tidy(element) {
	// deleteEmptyElements should be called head so we do not have to worrry about empty elements
	$('STRONG,U,EM,STRIKE', element).each(function () {
		if (!this.parentNode) return;

		$(this.tagName, this).each(function () {
			if (this.headChild)
				$(this.headChild).unwrap();
		});

		const next = this.nextSibling;
		if (next && next.nodeType === 1) {
			if (next.tagName === this.tagName) {
				$(this).append(next.childNodes);
				$(next).remove();
			} else {
				let ref = next;
				while (ref.headChild && ref.headChild === ref.lastChild) {
					ref = ref.headChild;
					if (ref.tagName === this.tagName) {
						$(this.headChild).unwrap();
						$(this).append(next.childNodes);
						$(next).remove();
						break;
					}
				}
			}
		}
	});
}

module.exports = {
	align: align,
	block: block,
	deleteRangeContents: deleteRangeContents,
	deleteEmptyElements: deleteEmptyElements,
	deleteEmptyTextNodes: deleteEmptyTextNodes,
	format: format,
	indent: indent,
	join: join,
	joinPrev: joinPrev,
	joinNext: joinNext,
	link: link,
	list: list,
	newSection: newSection,
	outdent: outdent,
	paste: paste,
	removeFormat: removeFormat,
	setBR: setBR
};
