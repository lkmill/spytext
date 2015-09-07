/**
 * A Backbone.View for Spytext fields. 
 *
 * @module spytext/toolbar 
 */

function mapToNodeName(node) {
	return node.nodeName;
}

var commands = require('./commands');
var selectron = require('./selectron');

module.exports = {
	/**
	 * @lends SpytextToolbar.prototype
	 * @augments Backbone.View
	 */
	events: {
		'click ul[data-command] button': 'listCommand',
		'click button[data-command]': 'command',
		'click button[data-undo]': 'undo',
		'click button[data-redo]': 'redo',
		mousedown: function(e) {
			// this is needed to prevent toolbar from stealing focus
			e.preventDefault();
		}
	},

	template: 'spytext-toolbar',

	/**
	 * Activates or deactivates the toolbar depending on whether a spytext field
	 * is passed
	 */
	toggle: function(field) {
		this.field = field;
		this.$el.toggleClass('active', !!field);
	},

	undo: function() {
		this.field.snapback.undo();
		this.setActiveStyles();
	},

	redo: function() {
		this.field.snapback.redo();
		this.setActiveStyles();
	},

	setActiveStyles: function() {
		var _toolbar = this;

		$('button[data-command]').each(function() {
			var command = commands[$(this).attr('data-command')];

			if(!command) return;

			var option = $(this).attr('data-option');

			if(command.active)
				$(this).toggleClass('active', command.active(option));
			
			if(command.disabled)
				$(this).prop('disabled', command.disabled(option));
		});

		$('ul[data-command="block"]').each(function() {
			var ul = this;

			$(ul).removeClass('pseudo pseudo-list pseudo-multiple').find('> li').removeClass('active');
			
			if(selectron.contained.lists.length > 0) {
				$(ul).addClass('pseudo pseudo-list');
			} else if(selectron.styles.blocks.length === 1) {
				$(ul).find('button[data-option="' + selectron.styles.blocks[0].toLowerCase() + '"]').each(function() {
					$(this.parentNode).addClass('active');
				});
			} else if(selectron.styles.blocks.length > 1) {
				$(ul).addClass('pseudo pseudo-multiple');
			}
		});

		this.$('button[data-undo]').prop('disabled', this.field.snapback.undoIndex === -1);
		this.$('button[data-redo]').prop('disabled', this.field.snapback.undoIndex >= (this.field.snapback.undos.length - 1));
	},

	listCommand: function(e) {
		var command = $(e.currentTarget).closest('ul,ol').attr('data-command'),
			option = $(e.currentTarget).attr('data-option');
			
		this.field.command(command, option);
	},
	/**
	 * Calls a command on the field currently attached to the toolbar
	 */
	command: function(e) {
		var command = $(e.currentTarget).attr('data-command'),
			option = $(e.currentTarget).attr('data-option');
			
		this.field.command(command, option);
	}

};
