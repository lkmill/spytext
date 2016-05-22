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
  forEach = require('lodash/forEach'),
  toArray = require('lodash/toArray'),
  tail = require('lodash/tail');
/**
 * @readonly
 */
//const blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];

function Field(options) {
  this.el = dollr(options.el);

  $(this.el).addClass('spytext-field').attr('contentEditable', 'true');

  commands.deleteEmptyTextNodes(this.el);
  commands.deleteEmptyElements(this.el);
  if ($(this.el).is(':empty')) {
    $(this.el).append('<p>');
  }
  commands.setBR(toArray(this.el.children));

  this.originalValue = this.el.innerHTML;

  this.toolbar = new SpytextToolbar();

  $(document.body).append(this.toolbar.el);

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
    //const arr = eventStr.split(' ');

    //on($$(arr[1], this.el), arr[0], (fnc instanceof Function ? fnc : this[fnc]).bind(this));
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
      $(document).on('mousedown', (e) => {
        clearTimeout(this.timeout);
        this.snapback.register();
      });

      $(document).on('mouseup', (e) => {
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
    $(document).off('mouseup');
    $(document).off('mousedown');
  },

  render() {
    if (!this.el.firstChild) {
      $(this.el).append('<p><br></p>');
    }
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

      $(this.el).trigger('change');
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
