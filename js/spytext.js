var Spytext = function() {
	var that = this;
	this.fields = [];
	this.currentField = null;
	this.buttons = [];
	_.each(this.events.doc, function(func, name) {
		document.bind(name, func, that);
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
				if(this.mousedown && this.currentField) {
					this.currentField.snapback.register();
					this.currentField.snapback.setSelection();
				}
				this.mousedown = false;
			}
		}
	},
	actions: {
		align: function(options) {
			var coordinates = S.get.coordinates(this.currentField.element);
			S.select(coordinates);

			var containedBlocks = S.get.childElements(this.currentField.element, true);
			containedBlocks.each(function() {
				if(!this.matches('ul, ol')) this.css('text-align', options.alignment);
			});
		},
		block: function(options) {
			var wrapper = O('<' + options.tag + '></' + options.tag + '>');
			var coordinates = S.get.coordinates(this.currentField.element);
			S.select(coordinates);
			var sel = window.getSelection();

			// TODO split list
			var containedBlocks = S.get.childElements(this.currentField.element, true);
			containedBlocks.each(function() {
				var that = this;
				var tmp;
				if(this.nodeName === 'UL' || this.nodeName === 'OL') {
					var listItems = this.M('li');
					listItems.each(function() {
						S.select(coordinates);
						if(sel.containsNode(this, true)) {
							tmp = wrapper.clone();
							if(this.previousSibling) that.after(tmp);
							else that.before(tmp);
							while(this.firstChild) {
								tmp.append(this.firstChild);
							}
							this.remove();
						}
					});
					if(!this.firstChild) this.remove();
				} else {
					tmp = wrapper.clone();
					this.before(tmp);
					while(this.firstChild) {
						tmp.append(this.firstChild);
					}
					this.remove();
				}
			});
			S.select(coordinates);
		},
		list: function(options){
			var tags = {
				ordered: 'OL',
				unordered: 'UL'
			};
			var list = O('<' + tags[options.type] + '></' + tags[options.type] + '>');
			var selection = S.save(this.currentField.element);
			selection.load();
			var containedBlocks = S.get.childElements(this.currentField.element, true);
			containedBlocks[0].before(list);
			containedBlocks.each(function(){
				var listItem = O('<li></li>');
				list.append(listItem);
				while(this.firstChild) {
					listItem.append(this.firstChild);
				}
				list.append(listItem);
				this.remove();
			});
			selection.load();
		},
		indent: function(){
		},
		format: function(options){
			var tags = {
				underline: 'U',
				bold: 'B'
			};
			var wrapper = options.container ? O(options.container) : O('<' + tags[options.command] + '></' + tags[options.command] + '>');
			var coordinates = S.get.coordinates(this.currentField.element);
			S.select(coordinates);
			var containedBlocks = S.get.childElements(this.currentField.element, true);
			if(S.isCollapsed()){
				var closest = rng.startContainer.closest(wrapper.tagName);
				while(closest) {
					closest.unwrap();
					closest = closest.closest(wrapper.tagName);
				}
			} else {
				var textNodes = S.get.textNodes(this.currentField.element).toArray();
				var rng = S.get.rng();
				if(rng.endOffset < rng.endContainer.textContent.length) {
					rng.endContainer.splitText(rng.endOffset);
				}
				if(rng.startOffset > 0) {
					textNodes = textNodes.slice(1);
					textNodes.unshift(rng.startContainer.splitText(rng.startOffset));
				}
				textNodes = M(textNodes);
				textNodes.wrap(wrapper);

			}
			containedBlocks.tidy(wrapper.tagName);
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
		var field = new SpytextButton(element, config, this);
		this.buttons.push(field);
		return field;
	},
	addField: function(element, config, snapback) {
		var button = new SpytextField(this, element, config, snapback);
		this.fields.push(button);
		return button;
	},
	execute: function(action, options) {
		var snapback = this.currentField.snapback;
		snapback.register();
		snapback.disableCaptureTyping();
		snapback.setSelection();
		this.actions[action].call(this, options);
		setTimeout(function() {
			snapback.register();
			snapback.enableCaptureTyping();
		}, 100);
	}
};
var SpytextButton = function(element, config, spytext) {
	this.spytext = spytext;
	this.config = typeof config === 'string' ? this.presets[config] : config;
	this.element = element;
	this.element.bind('click', this.events.click, this);
};
SpytextButton.prototype = {
	events: {
		click: function() {
			this.spytext.execute(this.config.action, this.config.options);
		}
	},
	presets: {
		alignLeft: { title: 'Align Left', action: 'align', options: { alignment: 'left' }},
		alignRight: { title: 'Align Right', action: 'align', options: { alignment: 'right' }},
		alignCenter: { title: 'Align Center', action: 'align', options: { alignment: 'center' }},
		alignJustify: { title: 'Align Justify', action: 'align', options: { alignment: 'justify' }},
		bold: { title: 'Bold', action: 'format', options: { command: 'bold' }},
		strikeThrough: { title: 'Strike Through', action: 'format', options: { command: 'strikeThrough' }},
		underline: { title: 'Underline', action: 'format', options: { command: 'italic' }},
		italic: { title: 'Italic', action: 'format', options: { command: 'bold' }},
		removeFormat: { action: 'format', options: { command: 'removeFormat' }},
		typeHeading1: { title: 'Heading 1', action: 'block', options: { tag: 'H1' }},
		typeHeading2: { title: 'Heading 1', action: 'block', options: { tag: 'H2' }},
		typeHeading3: { title: 'Heading 1', action: 'block', options: { tag: 'H3' }},
		typeHeading4: { title: 'Heading 1', action: 'block', options: { tag: 'H4' }},
		typeHeading5: { title: 'Heading 1', action: 'block', options: { tag: 'H5' }},
		typeHeading6: { title: 'Heading 1', action: 'block', options: { tag: 'H6' }},
		typeParagraph: { title: 'Heading 1', action: 'block', options: { tag: 'P' }},
		orderedList: { title: 'Ordered List', action: 'list', options: { type: 'ordered' }},
		unorderedList: { title: 'Unordered List', action: 'list', options: { type: 'unordered' }},
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
				{ name: 'block', buttons: ['typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6', 'typeParagraph']},
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']},
				{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				{ name: 'list', buttons: ['unorderedList', 'orderedList']}
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
					case 33:
					case 34:
					case 35:
					case 36:
					case 37:
					case 38:
					case 39:
					case 40:
						this.snapback.setSelection();
						break;
				}
			}
		},
		keydown: function(e) {
			if (e.ctrlKey) {
				switch(e.keyCode) {
					case 66://b
					case 85://u
						e.preventDefault();
						var that = this;
						var arr = [];
						arr[66] = 'bold';
						arr[85] = 'underline';
						this.spytext.execute('format', { command: arr[e.keyCode] }, this.element);
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
						break;
					case 84://t
						e.preventDefault();
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
