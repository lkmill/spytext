/**
 * All the commands for Spytext
 *
 * @module spytext/commands
 */

import * as selektr from 'selektr'

import {
  $,
  $$,
  appendTo,
  closest,
  children,
  is,
  insertAfter,
  insertBefore,
  next,
  nextAll,
  prependTo,
  prevAll,
  text,
  unwrap,
  wrap,
} from 'domp'

import descendants from 'descendants'

import { head, last, invokeMap } from 'lowline'

const sectionTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI']

function listItemFilter(node) {
  /* this is to filter out LI with nested lists where only text in the nested
   * list is selected, not text in the actual LI tag siblings to the nested
   * <ul>).
   *
   * This is to fix error that occurs if you have selected LI from nested
   * list, but not any text nodes in the LI containing the nested list. The LI
   * containing
   */
  return (
    node.nodeName !== 'LI' ||
    children(node, 'UL,OL').length === 0 ||
    selektr.containsSome(Array.from(node.childNodes).slice(0, -1), true) ||
    selektr.isAtEndOfSection(node)
  )
}

/**
 * Uses inline CSS styles to set text-align property for
 * all blocks contained in current selection
 *
 * @static
 * @param {Element} element - Reference element to be used for selektr to fetch
 * elements contained in selection
 * @return {string} alignment
 */
export function align(element, alignment) {
  // we slice the sectionTags because we do not want to align LI tags
  selektr.contained(children(element, sectionTags.slice(0, -1).join()), true).forEach((child) => {
    // do not set text-align property on lists
    child.style.textAlign = alignment
  })
}

align.active = function (option, styles) {
  return !!styles.alignment && styles.alignment === option
}

align.disabled = function (option, styles) {
  return styles.blocks.length === 0
}
/**
 * Changes all (partly) contained sections in the current selection to (block
 * level) elements of tagName `tag`.
 *
 * @static
 * @param {Element} element - Reference element to be used for selektr to fetch
 * elements contained in selection
 * @return {string} tag - Tag to turn blocks into. Ie H1 or P
 */
export function block(element, tag) {
  // if(block.active(tag)) return;

  const sections = selektr.contained({ sections: true }, true).filter(listItemFilter)
  const newBlocks = []
  const startSection = head(sections)
  const endSection = last(sections)
  const positions = selektr.get()

  let ref

  /* `ref` is the DOM element which we place our new
   * blocks before. if it is undefined, new blocks will
   * be appended to `element`.
   */

  if (endSection.matches('LI')) {
    /* if `endSection` is a list item, we have to do some crazyness
     *
     * begin by getting a reference to the ancestor lists
     * NOTE: `startList` might not be a list. if `startSection` is not
     * a list item, the `startList` will be `startSection` (since all block
     * elements except LI are children of `element`
     */
    const endList = closest(startSection, element.children)
    // let startList;

    // if (startSection.matches('LI'))
    //  startList = closest(startSection, element.children);

    let secondList

    if (children(endSection, 'UL,OL').length > 0) {
      /* `endSection` has a nested list. Use that as our list.
       */

      secondList = children(endSection, 'UL,OL')[0]

      insertAfter(secondList, endList)
    }

    if (endSection.nextSibling) {
      /* `endSection` has following siblings. We need
       * to append them to secondList (which needs to be created
       * if `endSection` did not have a nested list.
       */
      if (!secondList) {
        secondList = $(`<${endList.tagName}>`)

        insertAfter(secondList, endList)
      }

      appendTo(nextAll(endSection), secondList)
    }

    if (secondList) {
      ref = secondList
    } else {
      /* `startList` is `endList` and last selected LI is last child and has no
       * nested list. simply place all new blocks after `startList`/`endList`, ie
       * before the next element
       */
      ref = next(endList)
    }
  } else {
    /* `endSection` is not a list, simply place
     * new elements after `endSection` next sibling
     */
    ref = next(endSection)
  }

  sections.forEach((child) => {
    const newBlock = $(`<${tag}>`)

    newBlock.style.cssText = child.style.cssText

    /* place `newBlock` before `ref`, or append it to `element`
     */
    if (ref) {
      insertBefore(newBlock, ref)
    } else {
      appendTo(newBlock, element)
    }

    appendTo(child.childNodes, newBlock)
    newBlocks.push(newBlock)

    /* remove parent if `child` has no siblings, otherwise simply remove the
     * child
     */
    if (!child.nextSibling && !child.previousSibling) {
      child.parentNode.remove()
    } else {
      child.remove()
    }
  })

  invokeMap($$(':empty:not(BR)', element), 'remove')

  // set the selection
  selektr.set(positions)
}

block.active = function (tag, styles) {
  return styles.blocks.length === 1 && styles.blocks[0] === tag.toUpperCase()
}

/**
 * Removes all empty text nodes adjacent to block level elements
 *
 * @static
 * @param {Element} element - Element which descendants to look for empty text nodes
 */
export function deleteEmptyTextNodes(element) {
  function isBlock(node) {
    return node && node.nodeType === 1 && !getComputedStyle(node).display.match(/inline/)
  }

  descendants(element, {
    nodeType: 3,
  }).forEach((textNode) => {
    if (isBlock(textNode.previousSibling) || isBlock(textNode.nextSibling)) {
      textNode.textContent = textNode.textContent.trim()

      if (textNode.textContent.match(/^\s*$/)) {
        // textNode is empty or only contains whitespaces
        textNode.parentNode.removeChild(textNode)
      } else if (textNode.parentNode === element) {
        // if textNode is a child of element, wrap it in <p> tag
        wrap(textNode, '<p>')
      }
    }
  })
}

/**
 * Removes all empty element nodes
 *
 * @static
 * @param {Element} element - Element which descendants to look for empty text nodes
 */
export function deleteEmptyElements(element) {
  $$(':empty:not(BR)', element).forEach((el) => {
    let parent

    // recurse up the DOM and delete all elements
    // until a non-empty $el is found
    while (el !== element && el.childNodes.length === 0) {
      parent = el.parentNode
      el.remove()
      el = parent
    }
  })
}

/**
 * Removes all empty text nodes adjacent to block level elements
 *
 * @static
 * @param {Element} element - Element which descendants to look for empty text nodes
 * @param {Range} [rng] -
 */
export function deleteRangeContents(element, rng) {
  // fetch range if rng is not set
  rng = rng || selektr.range()

  const startContainer = rng.startContainer
  // TODO should we really use sections: true instead of passing selectors?
  // containedSections = selektr.contained({ sections: true }, true),
  const containedSections = selektr.contained({ sections: true }, true).filter(listItemFilter)
  const startSection = head(containedSections)
  const endSection = last(containedSections)
  const position = selektr.get('start')

  // use native deleteContents to remove the contents of the selection,
  rng.deleteContents()

  if (startSection !== endSection) {
    /* if `startSection` is not `endSection`, we need to clean up any mess that
     * deleteContents has left and then append all childNodes of `endSection`
     * to `startSection`
     */

    if (endSection.matches('LI')) {
      // `endSection` is a list item... we might need to clear up a mess

      /* `list` will be the list to which we move any of `endSections` nested
       * lists and next siblings.
       */
      let list
      const nestedList = children(endSection, 'UL,OL')[0]

      if (startSection.matches('LI')) {
        // `startSection` is a listItem,

        // move listItems to `startSection`'s parent list)
        list = startSection.parentNode

        if (nestedList) {
          // append potential `nestedList` to `startSection`
          appendTo(nestedList, startSection)
        }
      } else if (nestedList) {
        /* `startSection` is not a listItem which means all `endSection`'s
         * previous listItems have been deleted. Move listItems to
         * `endSection` outermost containing list
         */
        list = nestedList

        insertAfter(nestedList, startSection)

        // append all `nestedList`'s children to `list`
        // appendTo(children(nestedList), list);
      } else {
        /* TODO clear up empty list items when deleting from a normal section
         * to nested list item without children (nested lists)
         */
        list = endSection.parentNode
      }

      if (list !== endSection.parentNode && endSection.nextSibling) {
        /* append all next siblings to `endSection`, but only if `list` is not
         * `endSection`'s parent (because then target and source will be same)
         */
        appendTo(nextAll(endSection), list)
      }
    }

    /* Move all childNodes from `endSection` to `startSection` by inserting
     * them after `startContainer` (should now be a at the end of
     * `startSection`).  `startContainer` is used instead of appending to
     * `startSection` in case a nested list has been appended to
     * `startSection`, otherwise the childNodes would be incorrectly placed
     * after this nested list.
     */
    if (startContainer.nodeType === 1) {
      prependTo(endSection.childNodes, startContainer)
    } else {
      insertAfter(endSection.childNodes, startContainer)
    }

    // remove the empty `endSection`
    endSection.remove()
  }

  startSection.normalize()

  setBR(startSection)

  deleteEmptyElements(element)

  selektr.set(position)
}

/**
 * Indents all list items (<LI>) contained in the current selection
 *
 * @static
 * @param {Element} element - Element which descendants to look for empty text nodes
 */
export function indent(element, isOutdent) {
  if (isOutdent) return outdent(element)

  const listItems = selektr.contained($$('li', element), true).filter(
    (node) =>
      listItemFilter(node) ||
      selektr.containsEvery(
        descendants(node, {
          nodeType: 1,
          filter: (node) => !node.previousSibling,
          onlyDeepest: true,
        }),
        true,
      ),
  )
  const positions = selektr.get()

  listItems.forEach((el) => {
    const prev = el.previousSibling

    if (prev) {
      // only allow indenting list items if they are not the head items in their list

      // try to fetch the current element's nested list
      let nestedList = children(prev, 'UL,OL')[0]

      if (!nestedList) {
        // if the previous list item has no nested list, create a new one
        const tagName = closest(el, 'OL,UL').tagName

        nestedList = $(`<${tagName}>`)

        appendTo(nestedList, prev)
      }
      /* append the list item itself to the previous list items nested list.
       * if the list item itself has a nested list, append all list items
       * on this nested list to the previous elements nested list
       */

      appendTo(el, nestedList)
      appendTo(children(children(el, 'UL,OL')[0]), nestedList)
    }
  })

  // restore the selection
  selektr.set(positions)
}

indent.disabled = function (option, styles) {
  return styles.lists.length === 0
}

/**
 * Join `section` with the previous section. Uses a treeWalker to determine
 * what the previous section will be
 *
 * @static
 * @param {Element} element - Element which is used as root for the TreeWalker
 * @param {Element} section - Element which should be join the the previous section
 */
export function joinPrev(element, section) {
  const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false)
  treeWalker.currentNode = section

  let prev = treeWalker.previousNode()

  while (prev && sectionTags.indexOf(prev.tagName) === -1) {
    prev = treeWalker.previousNode()
  }

  // prev should only be null or undefined if backspace is called at beginning of field
  if (prev) {
    return join(element, prev, section)
  }
}

/**
 * Join `section` with the next section. Uses a treeWalker to determine
 * which the next section is
 *
 * @static
 * @param {Element} element - Element which is used as root for the TreeWalker
 * @param {Element} section - Element which should be join the next section
 */
export function joinNext(element, section) {
  const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false)
  treeWalker.currentNode = section

  // delete
  let next = treeWalker.nextNode()
  while (next && sectionTags.indexOf(next.tagName) === -1) {
    next = treeWalker.nextNode()
  }

  // `next` should only be null or undefined if delete is called at beginning of field
  if (next) {
    return join(element, section, next)
  }
}

/**
 * Joins `node1` with `node2`.
 *
 * @static
 * @param {Element} element - Element which is used as root for the TreeWalker
 * @param {Element} node1 - First node to join
 * @param {Element} node2 - Second node to join
 */
export function join(element, node1, node2) {
  if (node1.firstChild && node1.firstChild.tagName === 'BR') node1.firstChild.remove()
  if (node1.lastChild && node1.lastChild.tagName === 'BR') node1.lastChild.remove()
  if (node2.lastChild && node2.lastChild.tagName === 'BR') node2.lastChild.remove()

  let nestedList
  let position

  if ((nestedList = children(node1, 'UL,OL')[0])) {
    /* `node1` has a nested list, and `node2` should
     * be the head list item in the nested list. this means
     * we can leave the nested list, and simply insert
     * `node2` children before the nested list in `node1`.
     *
     * update length to only be length of text in `node1` excluding length of
     * text in nested list, so selektr sets the position correctly
     * length = length - $nestedList.text().length;
     */

    position = {
      ref: node1,
      offset: selektr.count(node1, nestedList),
    }

    insertBefore(node2.childNodes, nestedList)
  } else if (!node1.matches('LI') && (nestedList = children(node2, 'UL,OL')[0])) {
    // `node1` is a not a list item, and `node2` has nested list. decrease the
    // nested list's level by moving all its children to after `node2`, then
    // remove the nested list.

    // insert `nestedList`'s list items after `node2`
    insertAfter(children(nestedList), node2)

    // remove the empty $nestedList
    nestedList.remove()
  }

  position = position || {
    ref: node1,
    offset: selektr.count(node1),
  }

  // append any childNodes of `node2` to `node1` (this will already be done if
  // `node1` had a nested list
  appendTo(node2.childNodes, node1)

  node1.normalize()
  setBR(node1)

  if (!node2.nextSibling && !node2.previousSibling) {
    // `node2` has no siblings, so remove parent
    node2.parentNode.remove()
  } else {
    // `node2` has at least one sibling, only remove `node2`
    node2.remove()
  }

  selektr.set(position)
}

/**
 * Formats text by wrapping text nodes in elements with tagName `tag`.
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 * @param {string|Element} [tag] - Tag to format text with. If tag is omited,
 * `removeFormat` will be called instead
 */
export function format(element, tag) {
  function _unwrap(el) {
    $$(tag, el).forEach((el) => {
      if (el.firstChild) {
        unwrap(el)
      } else {
        el.remove()
      }
    })
  }

  // TODO need to find a better way to removeFormat
  // if(format.active(tag)) return removeFormat(element, tag);

  const rng = selektr.range()
  const wrapper = $(`<${tag}>`)

  if (!rng.collapsed) {
    const positions = selektr.get()
    const absolutePositions = selektr.get(true)
    const sections = selektr.contained({ sections: true }, true).filter(listItemFilter)
    const startSection = head(sections)
    const endSection = last(sections)
    let contents
    let clone

    sections.slice(1, -1).forEach((section) => {
      _unwrap(section)
      let childNodes = Array.from(section.childNodes)

      if (is(last(childNodes), 'UL,OL')) {
        childNodes = Array.from(childNodes).slice(0, -1)
      }

      clone = wrapper.cloneNode()
      prependTo(clone, section)

      appendTo(childNodes, clone)
    })

    if (startSection !== endSection) {
      selektr.set(
        {
          start: {
            ref: endSection,
            offset: 0,
          },
          end: absolutePositions.end,
        },
        false,
      )
      clone = wrapper.cloneNode()
      contents = selektr.range().extractContents()
      _unwrap(contents)
      prependTo(clone, endSection)
      appendTo(contents.childNodes, clone)

      endSection.normalize()
      deleteEmptyElements(endSection)
      tidy(endSection)
      endSection.normalize()

      selektr.set(
        {
          start: absolutePositions.start,
          end: {
            ref: startSection,
            offset: is(last(startSection.childNodes), 'UL,OL')
              ? startSection.childNodes.length - 1
              : startSection.childNodes.length,
          },
        },
        false,
      )
    }

    contents = selektr.range().extractContents()
    _unwrap(contents)
    clone = wrapper.cloneNode()
    rng.insertNode(clone)
    appendTo(contents.childNodes, clone)

    startSection.normalize()
    deleteEmptyElements(startSection)
    tidy(startSection)
    startSection.normalize()

    // restore the selection
    selektr.set(positions)
  } else {
    rng.insertNode(wrapper)
    selektr.set({ ref: wrapper }, false)
  }
}

format.active = function (option, styles) {
  return !!option && styles.formats.indexOf(option.toLowerCase()) > -1
}

/**
 * Formats text by wrapping text nodes in elements with tagName `tag`.
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 * @param {string|Element} [tag] - Tag to format text with. If tag is omited,
 * `removeFormat` will be called instead
 */
export function link() {
  const sel = window.getSelection()
  let node = sel.focusNode.parentNode
  if (node.tagName.toLowerCase() !== 'a') {
    node = sel.anchorNode.parentNode
    if (node.tagName.toLowerCase() !== 'a') {
      node = null
    }
  }

  let href = 'http://'

  if (node) {
    const range = document.createRange()
    range.selectNodeContents(node)
    href = node.attributes.href.value
    sel.removeAllRanges()
    sel.addRange(range)
  }

  // eslint-disable-next-line
  const result = prompt('Link address:', href)

  if (result !== '') {
    document.execCommand('createLink', null, result)
  } else {
    document.execCommand('unlink')
  }
}

/**
 * Turns block elements into list items
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 * @param {string} tag - The type of list tag, unordered (<UL>) or ordered (<OL>) lists.
 */
export function list(element, tag) {
  /* TODO we might have to reimplement the commented line below. currently this
   * works fine because the list button is disabled when active, but if one
   * calls the list command on the same kind of list, it will probably split it
   * into a new, same kind list
   */

  // if(list.active(tag)) return;

  const sections = selektr.contained({ sections: true }, true).filter(listItemFilter)
  const listItems = []
  const positions = selektr.get()
  const startSection = head(sections)
  const endSection = last(sections)

  let list

  /* `list` is a reference to the list all new list items should be appended to.
   * Essentially, after the next block of conditionals we should be able to
   * append all contained sections to `list` and not have to worry about
   * remaining lists
   */

  if (startSection.matches('LI')) {
    /* `startList` and `endList` should reference lists furthest up the DOM, ie children of
     * the fields element
     */
    const startList = closest(startSection, element.children)
    let endList

    if (endSection.matches('LI')) {
      endList = closest(endSection, element.children)
    }

    if (startList.matches(tag)) {
      /* `startList` is already the correct list type
       * simply append all new list items to this
       */
      list = startList

      if (endList && startList === endList) {
        /* we have only selected one list and that list
         * is already the correct list type, so do nothing
         */
        return
      }
    } else {
      /* `startList` is the wrong list type, we need to create a new list
       * and insert it after `startList`
       */
      list = $(`<${tag}>`)

      insertAfter(list, startList)
    }

    if (endList && !endList.matches(tag)) {
      /* `endSection` is a listItem, and `endList` is of the wrong type.
       * If endSection has nested lists or follwing siblings we need to do some stuff.
       *
       * the important part here is that `endSection` has either next siblings
       * or nested lists. if it did not,
       * endList would be empty at the end of the call to list and thus removed automatically
       *
       * if `endSection` is also a list, all sections inbetween `startSection`
       * and `endSection` will be selected, thus moved into `list` and `list`
       * will eventually become previousSibling to `endSection`
       */
      let secondList

      if (children(endSection, 'UL,OL').length > 0) {
        /* `endSection` has a nested list. Use that as our list.
         */

        secondList = children(endSection, 'UL,OL')[0]

        insertAfter(secondList, list)
      }

      if (endSection.nextSibling) {
        /* `endSection` has following siblings. We need
         * to append them to secondList (which needs to be created
         * if `endSection` did not have a nested list.
         */
        if (!secondList) {
          secondList = $(`<${endList.tagName}>`)

          insertAfter(secondList, list)
        }

        appendTo(nextAll(endSection), secondList)
      }
    }
  } else {
    /* If `startSection` is not a list we need to create a new
     * list that we can append all new list items to.
     * insert this new list before `startSection`
     */
    list = $(`<${tag}>`)

    insertBefore(list, startSection)
  }

  sections.forEach((child) => {
    let listItem

    if (child.tagName === 'LI') {
      /* the child is itself a list item, we can simply
       * move it around and do not need a new element
       */
      listItem = child

      if (list !== closest(listItem, element.children)) {
        /* only move the listItem if it is not already contained within `list`
         *
         * recurse essentially appends the list items to `list`, but
         * also correctly handles nested lists of the wrong type.
         */
        ;(function recurse(listItem, ref) {
          /* TODO do not do this if target and soruce list are the same type
           * ie. all nested lists are already the correct list type
           *
           * remove any nested list and save a reference to it
           */
          const oldNestedList = children(listItem, 'UL,OL')

          invokeMap(oldNestedList, 'remove')

          /* append `listItem` to `ref` (which will be the target list
           * if we are on head level
           */
          appendTo(listItem, ref)

          // check if we had found (and removed) any nested lists
          if (oldNestedList.length > 0) {
            // create a new nested list and append it to the `listItem`
            const nestedList = $(`<${tag}>`)

            // TODO check if append is right
            appendTo(nestedList, listItem)

            /* recurse through all of the old nested lists list items
             * and add them to the new nested list
             */
            $$(oldNestedList[0].children).forEach((li) => {
              recurse(li, nestedList)
            })
          }
        })(listItem, list)
      }
    } else {
      /* `child` is not a list item, create a new list item
       * and append all of `child`'s childNodes to it
       */
      listItem = $('<li>')

      appendTo(listItem, list)
      appendTo(child.childNodes, listItem)

      if (!child.previousSibling && !child.nextSibling) {
        // remove `child`'s parent if `child` is only sibling
        child.parentNode.remove()
      } else {
        // remove only `child` if it has no siblings
        child.remove()
      }
    }
    /* we save a reference to all listItems so we can use
     * them to correctly restore the selection
     */
    listItems.push(listItem)
  })

  // remove empty elements
  invokeMap($$(':empty:not(BR)', element), 'remove')

  selektr.set(positions)
}

list.active = function (option, styles) {
  return styles.blocks.length === 0 && styles.lists.length === 1 && is(styles.lists[0], option)
}

/**
 * Creates a new section (same type as the type of section the caret is currently in.)
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 * @param {string|Element} [tag] - Tag to format text with. If tag is omited,
 * `removeFormat` will be called instead
 */
export function newSection(element) {
  const rng = selektr.range()
  const section = closest(rng.startContainer, sectionTags.join(','), element)

  if (section.matches('LI') && section.textContent.length - text(children(section, 'UL,OL')).length === 0) {
    // we are in an empty list item (could have a nested list though)

    if (is(section.parentNode, element.children)) {
      // list items containing list is child of element... no levels to outdent
      // so create a new
      block(element, 'P')
    } else {
      // list item of level greater than 1, outdent
      outdent(element)
    }
    return
  }

  /* create a new block with the same tag as blockElement, insert it before
   * blockElement and append
   * the contents of the extracted range to it's end
   */
  // const $el = $('<' + $section[0].tagName + '>').attr('style',
  // $section.attr('style')).insertAfter($section);
  const el = $(`<${!section.matches('LI') && selektr.isAtEndOfSection() ? 'p' : section.tagName}>`)

  el.style.cssText = section.style.cssText

  insertAfter(el, section)

  if (children(section, 'UL,OL').length || !selektr.isAtEndOfSection()) {
    /* Select everything from the start of blockElement to the caret. This
     * includes everything that will be moved into the new block placed before
     * the current
     */
    selektr.set(
      {
        start: {
          ref: rng.startContainer,
          offset: rng.startOffset,
        },
        end: {
          ref: section,
          offset: section.childNodes.length,
        },
      },
      false,
    )

    // extract the contents
    const contents = selektr.range().extractContents()

    deleteEmptyElements(section)
    appendTo(contents.childNodes, el)
  }

  // normalize any textnodes
  el.normalize()
  section.normalize()

  // ensure correct BR on both affected elements
  setBR([el, section])

  selektr.set(
    {
      ref: el,
    },
    false,
  )
}

/**
 * Outdents all list items contained in the selection one level
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 */
export function outdent(element) {
  const listItems = selektr.contained(element.querySelectorAll('li'), true).filter(listItemFilter)
  const positions = selektr.get()

  // we outdent in the reverse order from indent
  listItems.reverse().forEach((li) => {
    if (!li.matches('LI') || is(li.parentNode, element.children)) {
      // do nothing if not a list item, or if list item
      // is already top level (level 1), ie if it's parent is a child
      // of element
      return
    }

    if (li.nextSibling) {
      /* `li` has following siblings, we need
       * to move them into a new or existing nested list
       */

      // attempt to selected a nested list
      let nestedList = children(li, 'UL,OL')[0]

      if (!nestedList) {
        // if there is no nested list, create a new one
        const tagName = closest(li, 'OL,UL').tagName

        nestedList = $(`<${tagName}>`)

        appendTo(nestedList, li)
      }

      // append all `li`'s next siblings to `nestedlist`
      appendTo(nextAll(li), nestedList)
    }

    const parent = li.parentNode

    // actual outdenting. Place the list item after its closest LI ancestor
    insertAfter(li, li.parentNode.parentNode)

    if (!parent.firstElementChild) parent.remove()
  })

  selektr.set(positions)
}

/**
 * Pastes the data of the dataTransfer. Deletes range contents if selection is
 * not collapsed
 *
 * @static
 * @param {Element} element - Element which is used as root for selektr.
 * @param {DataTransfer} dataTransfer - Must have a getData method which returns pure text string
 */
export function paste(element, dataTransfer) {
  let rng = selektr.range()
  const textBlocks = dataTransfer
    .getData('Text')
    .replace(/</g, '&lt;')
    .replace(/>/, '&gt;')
    .replace(/[\n\r]+$/g, '')
    .split(/[\n\r]+/)

  if (!rng.collapsed) {
    // delete range contents if not collapsed
    deleteRangeContents(element, rng)
    rng = selektr.range()
  }

  if (textBlocks.length > 0) {
    const section = closest(rng.startContainer, sectionTags.join(','), element)

    /* Select everything from the caret to the end of section and extract the
     * contents. this is so we can to append the head text block to the current
     * section (where the extracted content will have been), and insert the
     * extracted contents after the last text block. if we are only pasting one
     * text block, we could have simply split the current node and inserted the
     * contents inbetween, but i decided for a tiny performance loss vs no code
     * duplication
     */
    selektr.set(
      {
        start: selektr.get('start', true),
        end: { ref: section, offset: section.childNodes.length },
      },
      false,
    )

    const contents = selektr.range().extractContents()

    // will be used to place new sections into the DOM
    const ref = section.nextSibling
    // if no next sibling, save reference to parent
    const parent = section.parentNode

    let textNode
    let el

    for (let i = 0; i < textBlocks.length; i++) {
      textNode = document.createTextNode(textBlocks[i])

      if (i === 0) {
        if (section.lastChild && section.lastChild.nodeName === 'BR') {
          // remove the last item if it is a line break
          section.lastChild.remove()
        }

        /* since this is the head text Block,
         * simply append the textNode to the section
         */
        appendTo(textNode, section)
      } else {
        // create a new section
        el = $(`<${section.tagName}>`)

        appendTo(textNode, el)

        if (ref) {
          // insert before the ref
          insertBefore(el, ref)
        } else {
          // append to parent if we have no ref
          appendTo(el, parent)
        }
      }
    }
    /* append any contents extracted from the range prevously to the
     * last inserted new section, or section if only
     * one text block was pasted
     */
    appendTo(contents.childNodes, el || section)

    // set the range to end of last inserted textnode
    selektr.set(
      {
        ref: textNode,
        offset: textNode.textContent.length,
      },
      false,
    )
  }
}

/**
 * Removes inline formatting of selection
 *
 * @static
 * @param {Element} element - Only used to normalize text nodes
 */
export function removeFormat(element, tag) {
  function _unwrap(el) {
    $$(tag, el).forEach((el) => {
      if (el.firstChild) {
        unwrap(el)
      } else {
        el.remove()
      }
    })
  }

  if (!tag) {
    document.execCommand('removeFormat')
    element.normalize()
  } else {
    let rng = selektr.range()

    if (!rng.collapsed) {
      const positions = selektr.get(element)
      const absolutePositions = selektr.get(true)
      const sections = selektr.contained({ sections: true }, true).filter(listItemFilter)
      const startSection = head(sections)
      const endSection = last(sections)

      let contents

      sections.slice(1, -1).forEach(_unwrap)

      if (startSection !== endSection) {
        selektr.set(
          {
            start: {
              ref: endSection,
              offset: 0,
            },
            end: absolutePositions.end,
          },
          false,
        )
        contents = selektr.range().extractContents()
        _unwrap(contents)
        prependTo(contents.childNodes, endSection)

        endSection.normalize()
        deleteEmptyElements(endSection)
        tidy(endSection)
        endSection.normalize()

        selektr.set(
          {
            start: absolutePositions.start,
            end: {
              ref: startSection,
              offset: is(last(startSection.childNodes), 'UL,OL')
                ? startSection.childNodes.length - 1
                : startSection.childNodes.length,
            },
          },
          false,
        )
      }

      contents = selektr.range().extractContents()
      _unwrap(contents)
      if (startSection !== endSection) {
        if (is(last(startSection.childNodes), 'UL,OL')) {
          insertBefore(contents.childNodes, last(startSection.childNodes))
        } else {
          appendTo(contents.childNodes, startSection)
        }
      } else {
        selektr.set(absolutePositions.start, false)
        rng = selektr.range()
        let ref = rng.endContainer
        const tagElement = closest(ref, tag, element)

        if (tag) {
          selektr.set(
            {
              start: {
                ref,
                offset: rng.endOffset,
              },
              end: {
                ref,
                offset: tag.childNodes.length,
              },
            },
            false,
          )
          const newContents = selektr.range().extractContents()
          _unwrap(newContents)

          const el = $(`<${tag}>`)

          insertAfter(el, tagElement)

          appendTo(newContents.childNodes, el)
          ref = tagElement
        }
        insertAfter(contents.childNodes, ref)
      }

      startSection.normalize()
      deleteEmptyElements(startSection)
      tidy(startSection)
      startSection.normalize()

      // restore the selection
      selektr.set(positions)
    }
  }
}

/**
 * Removes trailing <BR>s
 *
 * @static
 * @param {Element} element - Element whos descendants need to be checked of extraneous BR tags
 */
export function setBR(element) {
  if (Array.isArray(element)) {
    return element.forEach(setBR)
  }

  if (
    !element.firstChild ||
    (is(element.lastChild, 'UL,OL') &&
      element.textContent.length - element.lastChild.textContent.length === 0 &&
      prevAll(element.lastChild, 'br').length === 0 &&
      $$('br', prevAll(element.lastChild)).length === 0)
  ) {
    prependTo($('<br>'), element)
  } else {
    $$('BR:last-child', element).forEach((br) => {
      if (br.nextSibling) return

      while (br.previousSibling && br.previousSibling.tagName === 'BR') {
        br.previousSibling.remove()
      }

      if (br.previousSibling) {
        br.remove()
      }
    })
  }
}

export function tidy(element) {
  // deleteEmptyElements should be called head so we do not have to worrry about empty elements
  $$('STRONG,U,EM,STRIKE', element).forEach((el) => {
    $$(el.tagName, el).forEach((el) => {
      if (el.firstChild) {
        unwrap(el)
      }
    })

    const next = el.nextSibling

    if (next && next.nodeType === 1) {
      if (next.tagName === el.tagName) {
        appendTo(next.childNodes, el)
        next.remove()
      } else {
        let ref = next
        // TODO check if this does what it is supposed to do (looks off)
        while (ref.firstChild && ref.firstChild === ref.lastChild) {
          ref = ref.firstChild
          if (ref.tagName === el.tagName) {
            unwrap(el)
            appendTo(next.childNodes, el)
            next.remove()
            break
          }
        }
      }
    }
  })
}
