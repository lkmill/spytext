/**
 * A Backbone.View for Spytext fields. 
 *
 * @module spytext/toolbar 
 */

module.exports = {
	/**
	 * @lends SpytextToolbar.prototype
	 * @augments Backbone.View
	 */
	events: {
		'click button': 'command',
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

	/**
	 * Calls a command on the field currently attached to the toolbar
	 */
	command: function(e) {
		var command = $(e.currentTarget).attr('data-command'),
			option = $(e.currentTarget).attr('data-option');
			
		this.field.command(command, option);
	}

};
