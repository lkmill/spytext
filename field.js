/**
 * A Backbone.View for Spytext fields. 
 *
 * @module spytext/field 
 */

var Snapback = require('./snapback');

var selectron = require('./selectron');
var commands = require('./commands');

/**
 * @readonly
 */
var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

module.exports = {
	/**
	 * @lends SpytextField.prototype
	 */
	events: _.extend({
		focus: 'activate',

		blur: 'deactivate',
	}, require('./events')),

	/**
	 * @constructs
	 * @augments Backbone.View
	 */
	initialize: function() {
		this.$el.addClass('spytext-field').attr('contentEditable', 'true');

		commands.deleteEmptyTextNodes(this.el);
		commands.deleteEmptyElements(this.el);
		commands.setBR(_.toArray(this.el.children));

		this.originalValue = this.el.innerHTML;

		if(!this.app.spytextToolbar) {
			this.app.spytextToolbar = new this.app.views.SpytextToolbar();
			$(document.body).append(this.app.spytextToolbar.el);
		}

		this.toolbar = this.app.spytextToolbar;

		this.snapback = new Snapback(this.el);
	},

	/**
	 * Activates the current field.
	 */
	activate: function() {
		var _field = this;

		// enable snapback, ie. tell the snapback instance's
		// mutationObserver to observer
		_field.snapback.enable();

		// toggle the toolbar, passing the current field to it
		_field.toolbar.toggle(_field);

		// i think the timeout is because of the range not being initialized
		// so snapback.getPositions/selectron produces an error
		setTimeout(function() {
			_field.snapback.getPositions();

			// this is to capture events when mousedown on 
			// fields element but mouseup outside
			$(document).on('mousedown', function(e) {
				clearTimeout(this.timeout);
				_field.snapback.register();
			});
			$(document).on('mouseup', function(e) {
				_field.toolbar.setActiveStyles();
				selectron.normalize(_field.el);
				_field.snapback.getPositions();
			});
		});
	},

	/**
	 * Deactivates the current field.
	 */
	deactivate: function() {
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

	/**
	 * Calls a command from module:spytext/commands
	 *
	 * @see module:spytext/commands
	 */
	command: function(command) {
		var field = this;

		// normalize selectron
		selectron.normalize(this.el);

		// register mutations (if any) as undo before calling command
		// so that the command becomes it's own undo without merging
		// it with any previous mutations in the mutation array in snapback
		field.snapback.register();

		if(commands[command]) {
			// call the command
			commands[command].apply(null,  [ field.el ].concat(_.rest(arguments)));

			// normalize any text nodes in the field's element
			field.el.normalize();

			// unfortunately, we need to wrap the registation of a new Undo
			// in a timeout
			setTimeout(function(){
				// register the called command as an undo
				field.snapback.register();
				field.toolbar.setActiveStyles();
			});
		}
	},
};

