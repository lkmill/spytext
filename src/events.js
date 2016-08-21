/**
 * Events for SpytextField view
 *
 * @module spytext/events
 */

import { closest, trigger } from 'dollr';
import * as selektr from 'selektr';
import * as commands from './commands';

const sectionTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];

export function keypress(e) {
  /* The keypress event is fired when a key is pressed down and that key
   * normally produces a character value (use input instead).  Firefox will
   * fire keypress for some other keys as well, but they will have
   * charCode === 0.
   */

  const rng = selektr.range(),
    container = rng.startContainer;

  if (e.charCode > 0) {
    if (e.charCode !== 13 && container.nodeType === 1) {
      e.preventDefault();

      const c = String.fromCharCode(e.charCode);
      const textNode = document.createTextNode(c);

      rng.insertNode(textNode);
      const offset = 1;

      selektr.set({
        ref: textNode,
        offset: offset
      });
    }
    trigger(this.el, 'input');
  }
}

export function keyup(e) {
  // TODO make sure we cover all different kinds of navigation keys, such as
  // home and end
  switch (e.keyCode) {
    case 8: //backspace
    case 46:// delete
      trigger(this.el, 'input');
      break;
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
      // navigation keys... set new (initial) position in snapback
      // clear timeout (if any) and register undo (if any) will already have been done in keydown
      selektr.normalize();
      this.snapback.store();
      this.toolbar.setActiveStyles();
      break;
  }
}

/**
 * The keydown event listeners are used to override default behaviours
 * in the contentEditable elements
 */
export function keydown(e) {
  // simple helper function to determine if a number is inbetween two values
  function inbetween(a, b) {
    const num = e.keyCode;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return num >= min && num <= max;
  }

  if (e.ctrlKey || e.metaKey) {
    // prevent all ctrl key bindings
    // NOTE paste events are handled directly

    switch (e.keyCode) {
      case 8: //backspace
      case 46: // delete
        e.preventDefault();
        break;
      case 66://b
      case 73://i
      case 85://u
        e.preventDefault();
        const arr = [];
        arr[66] = 'strong';
        arr[73] = 'em';
        arr[85] = 'u';
        this.command('format', arr[e.keyCode]);
        break;
      case 89://y
        e.preventDefault();
        this.snapback.redo();
        this.toolbar.setActiveStyles();
        break;
      case 90://z
        e.preventDefault();
        // make sure selektr has updated after last key stroke.
        // ie if next line is omitted the stored selektr position
        // might be wrong if the user very quickly presses undo
        // after typing
        if (e.shiftKey) {
          this.snapback.redo();
        } else {
          this.snapback.undo();
        }
        this.toolbar.setActiveStyles();
        break;
      case 65://a
        e.preventDefault();
        selektr.select(this.el.children.length === 1 ? this.el.firstChild : this.el);
        this.snapback.store();
        this.toolbar.setActiveStyles();
        break;
    }
  } else {
    const rng = selektr.range();

    if (rng && !rng.collapsed && (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 13 || inbetween(65, 90) || inbetween(48, 57) || inbetween(186, 222) || inbetween(96, 111))) {
      // the range is not collapsed, IE the user has selected some text AND
      // a manipulation button has been pressed. We delete the range contents, but
      // only preventDefault if backspace or delete.
      // not sure if we really need to register snapback... should already
      // have been sorted on mouseup events when user made the selection
      this.snapback.register();
      this.command('deleteRangeContents', rng);

      if (e.keyCode === 8 || e.keyCode === 46) {
        // if backspace or delete only delete the range contents. do nothing more
        return e.preventDefault();
      }
    }

    // By now we never have a non-collapsed range
    switch (e.keyCode) {
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
        // navigation keys... clear timeout (if any) and register undo (if any)
        // position of selection will be a set on keyup
        clearTimeout(this.timeout);
        this.snapback.register();
        return;
      case 8: //backspace
      case 46: // delete
        const section = closest(rng.startContainer, sectionTags.join(','));

        // join lines if backspace and start of section, or delete and end of section
        if (e.keyCode === 8 && selektr.isAtStartOfSection(section)) {
          // backspace at the start of a section, join with previous
          e.preventDefault();
          this.command('joinPrev', section);
        } else if (e.keyCode === 46 && selektr.isAtEndOfSection(section)) {
          // delete and at the end of section, join with next
          e.preventDefault();
          this.command('joinNext', section);
        }
        break;
      case 13:
        if (!e.shiftKey) {
          // only override default behaviour if shift-key is not pressed. all
          // tested browser seems to do correct behaviour for Shift-Enter, namely
          // insert a <BR>
          e.preventDefault();
          commands.newSection(this.el);
        }
        break;
    }

    // only register an undo if user has not typed for 300 ms
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.snapback.register();
      this.toolbar.setActiveStyles();
    }, 300);
  }
}

export function paste(e) {
  e.preventDefault();

  // handle jQuery events
  if (e.originalEvent)
    e = e.originalEvent;

  // TODO check what browsers this works in
  this.command('paste', e.clipboardData);
}
