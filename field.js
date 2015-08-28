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

		//this.timeout = null;
		//this.active = false;

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
		_field.observe();
		_field.active = true;
		_field.toolbar.toggle(_field);

		// this is to capture events when mousedown on 
		// fields element but mouseup outside
		setTimeout(function() {
			_field.snapback.setPosition();

			$(document).on('mouseup', function(e) {
				_field.snapback.register();
				// cannot remember why there is a timeout
				//setTimeout(function() {
				//	_field.toolbar.setActiveStyles();
				//}, 100);
			});
		});
	},

	deactivate: function() {
		this.snapback.register();
		this.snapback.disable();
		this.unobserve();
		this.active = false;
		this.toolbar.toggle();

		$(document).off('mouseup');
	},

	command: function(command) {
		var field = this;

		selectron.normalize();

		field.snapback.register();

		if(commands[command]) {
			commands[command].apply(null,  [ field.el ].concat(_.rest(arguments)));
			field.snapback.register();
			this.el.normalize();
		}
	},

	// observe() emits 'change' events on changes to the element
	observe: function() {
		// TODO enable option to turn on/off observation of changes
		var that = this;
		var timeout;
		function dispatch(mutation) {
			that.el.dispatchEvent(new CustomEvent('change', { bubbles: true , details: { mutation: mutation }}));
		}

		function change(mutations) {
			if(mutations[0].type === 'characterData') {
				if(timeout) 
					clearTimeout(timeout);

				timeout = setTimeout(dispatch, 300);
			} else {
				dispatch(mutations);
			}
		}

		if(!this.mutationObserver) {
			var mo = typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined);

			this.mutationObserver = new mo(change);
		}

		this.mutationObserver.observe(this.el, { subtree: true, characterData: true, childList: true, attributes: true });
	},

	// unobserve() disables emitting of change events
	unobserve: function() {
		if(this.mutationObserver) {
			this.mutationObserver.disconnect();
		}
	}
};

