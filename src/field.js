'use strict';

/**
 * A Backbone.View for Spytext fields.
 *
 * @module spytext/field
 */

const Snapback = require('snapback');
const SpytextToolbar = require('./toolbar');

const selektr = require('selektr');
const commands = require('./commands');

const assign = require('object-assign'),
  dollr = require('dollr/dollr').$,
  $$ = require('dollr/dollr').$$,
  on = require('dollr/on'),
  off = require('dollr/off'),
  trigger = require('dollr/trigger'),
  appendTo = require('dollr/appendTo'),
  forEach = require('lodash/forEach'),
  tail = require('lodash/tail');
/**
 * @readonly
 */
//const blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];

function Field(options) {
  this.el = dollr(options.el);

  this.el.classList.add('spytext-field');
  this.el.setAttribute('contentEditable', 'true');

  commands.deleteEmptyTextNodes(this.el);
  commands.deleteEmptyElements(this.el);
  if (this.el.childNodes.length === 0) {
    appendTo(dollr('<p>'), this.el);
  }
  commands.setBR($$(this.el.children));

  this.originalValue = this.el.innerHTML;

  this.toolbar = new SpytextToolbar();

  appendTo(this.toolbar.el, document.body);

  this.snapback = new Snapback(this.el, {
    /**
     * Saves and returns the positions of the current selection
     *
     * @return {Positions}
     */
    store(data) {
      return (this.data = (data || selektr.get()));
    },

    restore(data) {
      this.store(data);

      selektr.restore(data, true);
    },
  });

  forEach(this.events, (fnc, eventStr) => {
    on(this.el, eventStr, (fnc instanceof Function ? fnc : this[fnc]).bind(this));
  });
}

assign(Field.prototype, {
  /**
   * @lends SpytextField.prototype
   */
  events: assign({
    focus: 'activate',

    blur: 'deactivate',
  }, require('./events')),

  /**
   * @constructs
   * @augments Backbone.View
   */
  /**
   * Activates the current field.
   */
  activate() {
    // enable snapback, ie. tell the snapback instance's
    // mutationObserver to observer
    this.snapback.enable();

    // toggle the toolbar, passing the current field to it
    this.toolbar.toggle(this);

    selektr.setElement(this.el);

    // i think the timeout is because of the range not being initialized
    // so snapback.storePositions/selektr produces an error
    setTimeout(() => {
      this.snapback.store();

      // this is to capture events when mousedown on
      // fields element but mouseup outside
      on(document, 'mousedown', (e) => {
        clearTimeout(this.timeout);
        this.snapback.register();
      });

      on(document, 'mouseup', (e) => {
        setTimeout(() => {
          selektr.normalize();
          selektr.update();
          this.toolbar.setActiveStyles();
          this.snapback.store();
        });
      });
    });
  },

  /**
   * Deactivates the current field.
   */
  deactivate() {
    // register mutations (if any) as an undo before deactivating
    this.snapback.register();

    // disable snapback, ie. disconnect the mutationObserver
    this.snapback.disable();

    // deactivate toolbar
    this.toolbar.toggle();

    // stop listening to mouseup and mousedown on document
    off(document, 'mouseup');
    off(document, 'mousedown');
  },

  /**
   * Calls a command from module:spytext/commands
   *
   * @see module:spytext/commands
   */
  command(command) {
    // register mutations (if any) as undo before calling command
    // so that the command becomes it's own undo without merging
    // it with any previous mutations in the mutation array in snapback
    this.snapback.register();

    if (commands[command]) {
      // call the command
      commands[command].apply(null, [ this.el ].concat(tail(arguments)));

      // normalize any text nodes in the field's element
      this.el.normalize();

      trigger(this.el, 'change');
      // unfortunately, we need to wrap the registation of a new Undo
      // in a timeout
      setTimeout(() => {
        // register the called command as an undo
        this.snapback.register();
        this.toolbar.setActiveStyles();
      });
    }
  },
});

module.exports = Field;
