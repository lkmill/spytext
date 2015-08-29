var Snapback = require('./snapback');

var selectron = require('./selectron');
var commands = require('./commands');

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

module.exports = {
	events: _.extend({
		focus: 'activate',

		blur: 'deactivate',
	}, require('./events')),

	initialize: function() {
		this.$el.addClass('spytext-field').attr('contentEditable', 'true');

		commands.clearTextNodes(this.el);

		this.originalValue = this.el.innerHTML;

		if(!this.app.spytextToolbar) {
			this.app.spytextToolbar = new this.app.views.SpytextToolbar();
			$(document.body).append(this.app.spytextToolbar.el);
		}

		this.treeWalker = document.createTreeWalker(this.el, NodeFilter.SHOW_ELEMENT, null, false);

		this.toolbar = this.app.spytextToolbar;

		// needs to be loaded after DOM manipulation
		this.snapback = new Snapback(this.el);
	},

	activate: function() {
		var _field = this;

		_field.snapback.enable();
		_field.active = true;
		_field.toolbar.toggle(_field);

		// i think the timeout is because of the range not being initialized
		// so snapback.setPosition/selectron produces an error
		setTimeout(function() {
			_field.snapback.setPosition();

			// this is to capture events when mousedown on 
			// fields element but mouseup outside
			$(document).on('mouseup', function(e) {
				_field.snapback.register();
			});
		});
	},

	deactivate: function() {
		this.snapback.register();
		this.snapback.disable();
		this.active = false;
		this.toolbar.toggle();

		$(document).off('mouseup');
	},

	command: function(command) {
		var field = this;

		selectron.normalize(this.el);

		field.snapback.register();

		if(commands[command]) {
			commands[command].apply(null,  [ field.el ].concat(_.rest(arguments)));
			field.snapback.register();
			this.el.normalize();
		}
	},
};

