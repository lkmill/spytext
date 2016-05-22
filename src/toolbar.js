'use strict';

/**
 * A Backbone.View for Spytext fields.
 *
 * @module spytext/toolbar
 */

const commands = require('./commands'),
  assign = require('object-assign'),
  selektr = require('selektr'),
  dollr = require('dollr/dollr').$,
  $$ = require('dollr/dollr').$$,
  ancestors = require('dollr/ancestors'),
  is = require('dollr/is'),
  on = require('dollr/on'),
  uniq = require('lodash/uniq'),
  forEach = require('lodash/forEach'),
  children = require('dollr/children');

function Toolbar() {
  this.el = dollr('<div class="spytext-toolbar"><div class="container"><ul class="spytext-button-group undo"><li><button class="spytext-button undo" data-undo tabindex="-1"></button></li><li><button class="spytext-button redo" data-redo tabindex="-1"></button></li></ul><ul class="spytext-dropdown block" data-command="block"><li><button data-option="h1">Heading 1</button></li><li><button data-option="h2">Heading 2</button></li><li><button data-option="h3">Heading 3</button></li><li><button data-option="h4">Heading 4</button></li><li><button data-option="h5">Heading 5</button></li><li><button data-option="h6">Heading 6</button></li><li><button data-option="p">Paragraph</button></li></ul><ul class="spytext-button-group format"><li><button class="spytext-button bold" data-command="format" data-option="strong" tabindex="-1"></button></li><li><button class="spytext-button italic" data-command="format" data-option="em" tabindex="-1"></button></li><li><button class="spytext-button underline" data-command="format" data-option="u" tabindex="-1"></button></li><li><button class="spytext-button strike-through" data-command="format" data-option="strike" tabindex="-1"></button></li><li><button class="spytext-button remove-format" data-command="removeFormat" tabindex="-1"></button></li></ul><ul class="spytext-button-group align"><li><button class="spytext-button link" data-command="link" tabindex="-1"></button></li></ul><ul class="spytext-button-group align"><li><button class="spytext-button align-left" data-command="align" data-option="left" tabindex="-1"></button></li><li><button class="spytext-button align-center" data-command="align" data-option="center" tabindex="-1"></button></li><li><button class="spytext-button align-right" data-command="align" data-option="right" tabindex="-1"></button></li><li><button class="spytext-button align-justify" data-command="align" data-option="justify" tabindex="-1"></button></li></ul><ul class="spytext-button-group list"><li><button class="spytext-button unordered-list" data-command="list" data-option="ul" tabindex="-1"></button></li><li><button class="spytext-button ordered-list" data-command="list" data-option="ol" tabindex="-1"></button></li></ul><ul class="spytext-button-group indent"><li><button class="spytext-button indent" data-command="indent" tabindex="-1"></button></li><li><button class="spytext-button outdent" data-command="indent" data-option="outdent" tabindex="-1"></button></li></ul></div></div>');

  forEach(this.events, (fnc, eventStr) => {
    const arr = eventStr.split(' ');

    on($$(arr[1], this.el), arr[0], (fnc instanceof Function ? fnc : this[fnc]).bind(this));
  });
}

assign(Toolbar.prototype, {
  /**
   * @lends SpytextToolbar.prototype
   * @augments Backbone.View
   */
  events: {
    'click ul[data-command] button': 'listCommand',
    'click button[data-command]': 'command',
    'click button[data-undo]': 'undo',
    'click button[data-redo]': 'redo',
    'mousedown .container': function (e) {
      console.log('preventing mousedown');
      // this is needed to prevent toolbar from stealing focus
      e.preventDefault();
    }
  },

  /**
   * Activates or deactivates the toolbar depending on whether a spytext field
   * is passed
   */
  toggle(field) {
    this.field = field;
    this.el.classList.toggle('active', !!field);
  },

  undo() {
    this.field.snapback.undo();
    this.setActiveStyles();
  },

  redo() {
    this.field.snapback.redo();
    this.setActiveStyles();
  },

  setActiveStyles() {
    if (!this.field) return this.toggle();

    const formats = [ 'strong', 'u', 'em', 'strike' ];

    const sections = selektr.contained({ sections: true }, true);
    const listItems = uniq(sections.filter((node) => node.nodeName === 'LI'));
    const lists = selektr.contained(children(this.field.el, 'UL,OL'), true);
    const blocks = sections.filter((node) => node.nodeName !== 'LI');

    const commonAncestor = selektr.range().commonAncestorContainer;

    const textNodes = commonAncestor.nodeType === 3 ? [ commonAncestor ] : selektr.contained({ element: commonAncestor, nodeType: 3 }, true);

    const styles = {
      sections: sections,
      listItems: listItems,
      lists: lists,
      blocks: uniq(blocks.map((node) => node.nodeName))
    };

    styles.alignment = blocks.reduce((result, block) => {
      if (result === undefined) return result;

      let newResult = getComputedStyle(block).textAlign;

      if (newResult === 'start') newResult = 'left';

      if (result === null) result = newResult;

      return result === newResult ? newResult : undefined;
    }, null);


    styles.formats = [];

    formats.forEach((tag) => {
      const rng = selektr.range();

      if ((textNodes.length > 0 && textNodes.every((node) => ancestors(node, null, this.field.element).some((element) => element.matches(tag)))) ||
        rng.collapsed && (is(rng.startContainer, tag) ||
        ancestors(rng.startContainer, null, this.field.element).some((element) => element.matches(tag)))) {
        styles.formats.push(tag);
      }
    });

    $('button[data-command]').each(function () {
      const command = commands[$(this).attr('data-command')];

      if (!command) return;

      const option = $(this).attr('data-option');

      if (command.active)
        $(this).toggleClass('active', command.active(option, styles));

      if (command.disabled)
        $(this).prop('disabled', command.disabled(option, styles));
    });

    $('ul[data-command="block"]').each(function () {
      const ul = this;

      $(ul).removeClass('pseudo pseudo-list pseudo-multiple').find('> li').removeClass('active');

      if (lists.length > 0) {
        $(ul).addClass('pseudo pseudo-list');
      } else if (styles.blocks.length === 1) {
        $(ul).find('button[data-option="' + styles.blocks[0].toLowerCase() + '"]').each(function () {
          $(this.parentNode).addClass('active');
        });
      } else if (styles.blocks.length > 1) {
        $(ul).addClass('pseudo pseudo-multiple');
      }
    });

    // use undoIndex in snapback instance to decide whether we can undo/redo
    $('button[data-undo]', this.el).prop('disabled', this.field.snapback.undoIndex === -1);
    $('button[data-redo]', this.el).prop('disabled', this.field.snapback.undoIndex >= (this.field.snapback.undos.length - 1));
  },

  listCommand(e) {
    const command = $(e.currentTarget).closest('ul,ol').attr('data-command'),
      option = $(e.currentTarget).attr('data-option');

    this.field.command(command, option);
  },
  /**
   * Calls a command on the field currently attached to the toolbar
   */
  command(e) {
    const command = $(e.currentTarget).attr('data-command'),
      option = $(e.currentTarget).attr('data-option');

    this.field.command(command, option);
  }
});

module.exports = Toolbar;
