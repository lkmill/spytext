var Spytext = function() {
	this.fields = [];
	this.currentField = null;
	this.buttons = [];
	_.each(this.events.doc, function(func, name) {
		document.on(name, func);
	});
	this.mousedown = false;
};
Spytext.prototype = {
	setCurrentField: function(field) {
		if(this.fields.indexOf(field) > -1) {
			this.currentField = field;
			// TODO activate buttons
		} else {
			this.unsetCurrentField();
		}
	},
	unsetCurrentField: function() {
		this.currentField = null;
		// TODO deactivate buttons
	},
	events: {
		doc: {
			mouseup: function(e) {
				if(this.mousedown) {
					if(undoItem.length > 0) setUndo();
				}
				this.mousedown = false;
			}
		}
	},
	actions: {
		align: function(options) {
		},
		list: function(options){
		},
		indent: function(){
		},
		format: function(options){
			var tags = {
				underline: 'U',
				bold: 'B'
			};
			options.container = O(options.container) || O('<' + tags[options.command] + '></' + tags[options.command] + '>');
			var wrap = [];
			var coordinates = S.get.coordinates('[spytext-field] > *');
			if(S.isCollapsed()){
				var closest = coordinates.start.node.closest('b, [spytext-field] > *'); 
				if(closest.parentNode !== this.currentField.element){
					closest.unwrap();
				} else {
					wrap = closest.descendants(3);
				}
			} else {
				var modify = [];
				var contained = S.extract().childs();
				contained.each(function() {
					options.container.append(this);
				});
				var rng = window.getSelection().getRangeAt(0);
				options.container.tidy();
				rng.insertNode(options.container);

				//var start = coordinates.start;
				//var end = coordinates.end;
				//if(end.offset < end.node.textContent.length - 1) {
				//	end.node.splitText(end.offset);
				//}
				//if(start.offset > 0) {
				//	wrap = contained.slice(1);
				//	wrap.push(start.node.splitText(start.offset));
				//} else {
				//	wrap = contained;
				//}
			}
			//wrap = M(wrap).wrap(options.container);
			//this.currentField.element.tidy(options.container.tagName);
			//console.log(coordinates);
			S.select(coordinates);
		},
		link: function (attribute) {
			var sel = window.getSelection();
			var node = sel.focusNode.parentNode;
			if (node.tagName.toLowerCase() !== 'a') {
				node = sel.anchorNode.parentNode;
				if (node.tagName.toLowerCase() !== 'a') {
					node = null;
				}
			}

			var href = 'http://';
			if (node) {
				var range = document.createRange();
				range.selectNodeContents(node);
				href = node.attributeibutes.href.value;
				sel.removeAllRanges();
				sel.addRange(range);
			}
			var result = prompt('Link address:', href);

			if (result !== '') {
				document.execCommand('createLink', null, result);
			} else {
				document.execCommand('unlink');
			}

		},
		paste: function(options) {
		},
		type: {}
	},
	addButton: function(element, config) {
		var field = new SpytextButton(this, config);
		this.buttons.push(field);
		return field;
	},
	addField: function(element, config, snapback) {
		var button = new SpytextField(this, element, config, snapback);
		this.fields.push(button);
		return button;
	},
	execute: function(action, options) {
		this.actions[action].call(this, options);
	}
};
var SpytextButton = function(spytext, config) {
	this.spytext = spytext;
	this.config = typeof config === 'string' ? this.presets[config] : config;
};
SpytextButton.prototype = {
	execute: function() {
		this.spytext.execute(this.config.action, this.config.options);
	},
	events: {
		click: function() {
			this.execute();
		}
	},
	presets: {
		bold: { title: 'Bold', action: 'format', options: { command: 'bold' }},
		strikeThrough: { title: 'Strike Through', action: 'format', options: { command: 'strikeThrough' }},
		underline: { title: 'Underline', action: 'format', options: { command: 'italic' }},
		italic: { title: 'Italic', action: 'format', options: { command: 'bold' }},
		removeFormat: { action: 'format', options: { command: 'removeFormat' }},
	}
};
var SpytextToolbar = function(element, config) {
	var that = this;
	this.config = typeof config === 'string' ? this.presets[config] : config;
	this.element = element;
	_.each(this.events, function(func, name) {
		that.element.bind(name, func, that);
	});
};
SpytextToolbar.prototype = {
	presets: {
		standard: {
			buttonGroups: [
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']}
			]
		}
	},
	events: {
		mousedown: function(e) {
			// this is needed to prevent toolbar from stealing focus
			e.preventDefault();
		}
	}
};
var SpytextField = function(spytext, element, config, snapback) {
	var that = this;
	this.spytext = spytext;
	this.element = element;
	this.element.attr('contentEditable', 'true');
	this.config = typeof config === 'string' ? this.presets[config] : config;
	this.snapback = snapback;
	_.each(this.events, function(func, name) {
		element.bind(name, func, that);
	});
};
SpytextField.prototype = {
	activate: function() {
		this.spytext.setCurrentField(this);
	},
	deactivate: function() {
		this.spytext.unsetCurrentField();
	},
	presets: {
		full: {
			buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ]
		}
	},
	events: {
		focus: function () {
			//$scope.activateButtons(buttons);
			this.snapback.toggle();
			this.activate();
			//if(!mousedown) {
			//	updateSelection();
			//}
		},
		blur: function () {
			this.snapback.toggle();
			this.deactivate();
		},
		mousedown: function(e) {
			this.spytext.mousedown = true;
			//mousedown = true;
		},
		keyup: function(e) {
			if(!e.ctrlKey) {
				switch(e.keyCode) {
					case 37:
					case 38:
					case 39:
					case 40:
						break;
				}
			}
		},
		keydown: function(e) {
			if (e.ctrlKey) {
				switch(e.keyCode) {
					case 66://b
					case 85://u
						var that = this;
						e.preventDefault();
						var arr = [];
						arr[66] = 'bold';
						arr[85] = 'underline';
						this.snapback.register();
						this.spytext.execute('format', { command: arr[e.keyCode] }, this.element);
						setTimeout(function() {
							that.snapback.register();
						}, 10);
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
						S.select(this);
						break;
					case 84://t
						e.preventDefault();
						//console.log(window.getSelection().getRangeAt(0).extractContents());
						break;
					case 86://v
						// DO nothing, let paste event be handles
						break;
				}
			}
		},
		paste: function (e) {
			e.preventDefault();
			var str;
			if(e.clipboardData) {
				e.clipboardData.items[0].getAsString(function(str) {
					done(str);
				});
			} else {
				done(clipboardData.getData('Text'));
			}
			function done() {
				str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+/g, '</p><p>');
				this.spytext.execute('paste', { text: str });
			}
		}
	}
};
