var commands = require('./commands');

module.exports = {
	events: {
		'click button': 'command',
		mousedown: function(e) {
			// this is needed to prevent toolbar from stealing focus
			e.preventDefault();
		}
	},

	template: 'spytext-toolbar',

	toggle: function(field) {
		this.$el.toggleClass('active', !!field);
	},

	command: function() {
		var command = $(e.currentTarget).attr('data-command'),
			option = $(e.currentTarget).attr('data-option'),
			field = this.field;

		field.selectron.normalize();
		field.snapback.register();

		if(commands[command]) {
			commands[command](field.el, option);

			setTimeout(function() {
				field.snapback.register();
			}, 100);
		}
	}
};
