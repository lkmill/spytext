var Snapback = require('./snapback');

var selectron = require('./selectron');

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

var commands = require('./commands');

module.exports = {
	events: {
		focus: 'activate',

		blur: 'deactivate',

		mouseup: function(e) {
			e.stopPropagation();
			//this.spytext.toolbar.setActiveStyles();
		},

		//keyup: function(e) {
		//	switch(e.keyCode) {
		//		case 33:
		//		case 34:
		//		case 35:
		//		case 36:
		//		case 37:
		//		case 38:
		//		case 39:
		//		case 40:
		//			this.spytext.toolbar.setActiveStyles();
		//			break;
		//		default:
		//	}
		//},

		keydown: function(e) {
			function inbetween(a, b) {
				var num = e.keyCode;
				var min = Math.min(a,b);
				var max = Math.max(a,b);
				return num >= min && num <= max;
			}

			var rng;
			if (e.ctrlKey) {
				clearTimeout(this.timeout);
				this.timeout = null;
				this.snapback.register();
				switch(e.keyCode) {
					case 66://b
					case 85://u
						e.preventDefault();
						var arr = [];
						arr[66] = 'b';
						arr[85] = 'u';
						this.command('format', arr[e.keyCode]);
						break;
					case 89://y
						e.preventDefault();
						this.snapback.redo();
						break;
					case 90://z
						e.preventDefault();
						this.snapback.undo();
						break;
					case 65://a
						e.preventDefault();
						selectron.select(this.el);
						break;
					case 84://t
						e.preventDefault();
						break;
					case 86://v
						// DO nothing, let paste event be handles
						break;
				}
			} else {
				rng = selectron.range();
				if(inbetween(33,40)) {
					// 33-40 are navigation keys.
					clearTimeout(this.timeout);
					this.timeout = null;
					this.snapback.register();
				} else if(rng && !rng.collapsed && (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 13 || inbetween(65, 90) || inbetween(48, 57) || inbetween(186, 222) || inbetween(96, 111))) {
					this.snapback.register();
					this.command('deleteRangeContents',rng);

					if(e.keyCode === 8 || e.keyCode === 46) {
						e.preventDefault();
					}
				} else {
					clearTimeout(this.timeout);
					this.timeout = setTimeout(function() {
						this.timeout = null;
						this.snapback.register();
					}.bind(this), 300);
				}

				switch(e.keyCode) {
					case 8:
					case 46:
						// 8: backspace
						// 46: delete
						var element = this.el;
						if(rng.collapsed) {
							//var check = blockTags.join(',');
							var block = $(rng.startContainer).closest(blockTags.join(','))[0];

							var position = selectron.get(block);
							
							this.treeWalker.currentNode = block;

							// join lines if backspace and start of block, or delete and end of block
							if(e.keyCode === 8 && position.start.offset === 0) {
								e.preventDefault();
								var prev = this.treeWalker.previousNode();
								while(prev && blockTags.indexOf(prev.tagName) === -1) { 
									prev = this.treeWalker.previousNode();
								}
								if(prev) {
									this.command('join', prev, block);
								}
							} else if(e.keyCode === 46 && position.start.offset === position.start.ref.textContent.length) {
								e.preventDefault();
								var next = this.treeWalker.nextNode();
								while(next && blockTags.indexOf(next.tagName) === -1) { 
									next = this.treeWalker.nextNode();
								}
								if(next) {
									this.command('join', block, next);
								}
							}
						}
						// 'called' instead of execute 
						break;
					case 13:
						//enter
						e.preventDefault();
						this.command('newline');
						break;
				}
			}
		},

		paste: function (e) {
			e.preventDefault();

			if(e.originalEvent) 
				e = e.originalEvent;

			this.snapback.register();
			var rng = selectron.range();

			if(!rng.collapsed) {
				commands.deleteRangeContents(this.el, rng);
			}

			commands.paste(this.el, e.clipboardData ? e.clipboardData : clipboardData);

			setTimeout(function() {
				this.snapback.register();
			}.bind(this), 100);
		}
	},

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

