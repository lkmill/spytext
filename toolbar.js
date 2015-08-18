var commands = require('./commands');
var selectron = require('./selectron');

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
		this.field = field;
		this.$el.toggleClass('active', !!field);
	},

	command: function(e) {
		var command = $(e.currentTarget).attr('data-command'),
			option = $(e.currentTarget).attr('data-option'),
			field = this.field;

		selectron.normalize();

		field.snapback.register();

		if(commands[command]) {
			commands[command](field.el, option);

			setTimeout(function() {
				field.snapback.register();
			}, 100);
		}
	}
};
